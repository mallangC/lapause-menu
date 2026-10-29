import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { purgeMenuCacheByCompanyId } from "@/lib/menuCache";
import { PLAN_PRICES } from "@/lib/constants";
import { isBillingCycle, PLAN_CHARGE_AMOUNT } from "@/lib/billingPrice";

export const dynamic = "force-dynamic";

async function sendRefundEmail(to: string, companyName: string, plan: string | null, amount: number | null, reason: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const planLabel = plan === "annual" ? "연간" : plan === "monthly" ? "월간" : "—";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "Flo.Aide <noreply@flo-aide.com>",
      to,
      subject: "[Flo.Aide] 구독 환불이 처리되었습니다",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0ea;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:32px 16px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;font-family:'Apple SD Gothic Neo',sans-serif;">
      <tr><td style="background:#2c2416;padding:28px 32px;text-align:center;">
        <img src="https://www.flo-aide.com/logo-light.png" alt="Flo.Aide" height="28" style="display:block;margin:0 auto;filter:brightness(0) invert(1);" />
      </td></tr>
      <tr><td style="background:#c9a96e;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:32px 32px 24px;">
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#2c2416;">구독 환불 완료</p>
        <p style="margin:0 0 24px;font-size:14px;color:#6b5c4a;">안녕하세요, <strong>${companyName}</strong> 관리자님.<br>아래 내역으로 환불이 처리되었습니다.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8e0;border-radius:12px;overflow:hidden;font-size:14px;">
          <tr style="background:#faf7f2;">
            <td style="padding:12px 16px;color:#9a7a3a;font-weight:600;width:40%;">플랜</td>
            <td style="padding:12px 16px;color:#2c2416;font-weight:700;">${planLabel}</td>
          </tr>
          ${amount != null ? `<tr style="border-top:1px solid #ede8e0;">
            <td style="padding:12px 16px;color:#9a7a3a;font-weight:600;">환불 금액</td>
            <td style="padding:12px 16px;color:#2c2416;font-weight:700;">₩${amount.toLocaleString()}</td>
          </tr>` : ""}
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#9a8a7a;">문의사항이 있으시면 floaide.team@gmail.com으로 연락해주세요.</p>
      </td></tr>
      <tr><td style="background:#faf7f2;border-top:1px solid #ede8e0;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#b0a090;">본 메일은 자동 발송된 메일입니다. · <a href="https://www.flo-aide.com" style="color:#9a7a3a;text-decoration:none;">flo-aide.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    }),
  });
}

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, reason, refundType } = await req.json();
  if (!companyId || !reason?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 구독 환불은 운영자만 처리 — 사장님은 카카오 채널·이메일로 문의하면 운영팀이 환불 규정에 따라 처리한다
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "operator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // refundType: "full" | "partial" (partial은 연간 부분환불)
  const isPartial = refundType === "partial";

  const supabaseAdmin = getSupabaseAdmin();

  // 현재 구독 플랜 + 회사 정보 + 오너 이메일 조회
  const [{ data: sub }, { data: companyInfo }] = await Promise.all([
    supabaseAdmin.from("company_subscriptions").select("subscription_plan, plan_expires_at").eq("company_id", companyId).single(),
    supabaseAdmin.from("companies").select("name, owner_id").eq("id", companyId).single(),
  ]);
  const plan = sub?.subscription_plan as string | null;

  let ownerEmail: string | null = null;
  if (companyInfo?.owner_id) {
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(companyInfo.owner_id);
    ownerEmail = ownerUser?.user?.email ?? null;
  }

  // 가장 최근 빌링 결제 내역 조회 (이미 환불된 건은 제외)
  const [{ data: chargeLogs }, { data: refundLogs }] = await Promise.all([
    supabaseAdmin
      .from("billing_logs")
      .select("payment_id, amount, created_at")
      .eq("company_id", companyId)
      .eq("success", true)
      .eq("type", "charge")
      .order("created_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("billing_logs")
      .select("payment_id")
      .eq("company_id", companyId)
      .eq("success", true)
      .eq("type", "refund")
      .not("payment_id", "is", null),
  ]);

  const refundedPaymentIds = new Set((refundLogs ?? []).map((r) => r.payment_id));
  // 환불 대상은 가장 최근 결제 1건뿐 — 이미 환불됐거나 0원(전액 할인·무료체험 시작)이면 환불할 결제가 없는 것으로 본다.
  // (예전에는 '환불 안 된 결제 중 가장 최근'을 찾아서 반복 호출하면 과거 결제까지 차례로 환불될 수 있었음)
  const latestCharge = chargeLogs?.[0] ?? null;
  const targetCharge = latestCharge?.payment_id && !refundedPaymentIds.has(latestCharge.payment_id) ? latestCharge : null;
  const paymentKey = targetCharge?.payment_id ?? null;
  // 환불은 실제로 결제된 금액 기준 (할인 코드로 정가보다 적게 냈을 수 있음). 예전 로그에 금액이 없으면 정가로.
  const paidAmount = (targetCharge?.amount as number | null | undefined)
    ?? (isBillingCycle(plan) ? PLAN_CHARGE_AMOUNT[plan] : null);

  // 연간 부분환불 처리
  if (isPartial && plan === "annual") {
    // 결제일 = 환불할 결제 건이 기록된 날 (만료일 − 365일로 계산하면 운영자가 기간을 연장한 매장에서 어긋남)
    if (!targetCharge?.created_at || !paymentKey) {
      return NextResponse.json({ error: "결제 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const paymentDate = new Date(targetCharge.created_at);

    const now = new Date();
    const usedDays = Math.floor((now.getTime() - paymentDate.getTime()) / 86400000);
    const usedMonths = Math.ceil(usedDays / 30);
    // 공제는 환불 정책대로 할인 없는 월간 정가 기준
    const deduction = usedMonths * PLAN_PRICES.monthly;
    const refundAmount = Math.max(0, (paidAmount ?? PLAN_CHARGE_AMOUNT.annual) - deduction);

    let refunded = false;
    if (refundAmount > 0) {
      try {
        const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");
        const cancelRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cancelReason: reason, cancelAmount: refundAmount }),
        });

        if (!cancelRes.ok) {
          const cancelData = await cancelRes.json().catch(() => ({}));
          await logBilling(supabaseAdmin, {
            companyId, operatorId: user.id, plan, amount: refundAmount,
            paymentId: paymentKey, success: false, reason,
            errorMessage: (cancelData as { message?: string }).message ?? "부분환불 실패",
          });
          return NextResponse.json(
            { error: `토스 부분환불 실패: ${(cancelData as { message?: string }).message ?? "알 수 없는 오류"}`, detail: cancelData },
            { status: 500 }
          );
        }
        refunded = true;
      } catch (err) {
        console.error("[billing/refund] 부분환불 요청 오류:", err);
        return NextResponse.json({ error: "환불 요청 중 오류가 발생했습니다." }, { status: 500 });
      }
    }

    // DB: plan_expires_at을 결제일 + 공제월수 × 30일로 설정 (이용 기간 보장)
    const newExpiresAt = new Date(paymentDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + usedMonths * 30);

    await Promise.all([
      supabaseAdmin
        .from("company_subscriptions")
        .update({
          plan: "none",
          billing_key: null,
          subscription_plan: null,
          cancel_at_period_end: false,
          plan_expires_at: newExpiresAt.toISOString(),
          payment_retry_count: 0,
          next_retry_at: null,
        })
        .eq("company_id", companyId),
      supabaseAdmin
        .from("company_settings")
        .update({ consult_enabled: false })
        .eq("company_id", companyId),
      logBilling(supabaseAdmin, {
        companyId, operatorId: user.id, plan, amount: refundAmount,
        paymentId: paymentKey, success: true, reason,
      }),
      ownerEmail && companyInfo?.name
        ? sendRefundEmail(ownerEmail, companyInfo.name, plan, refundAmount, reason)
        : Promise.resolve(),
    ]);

    // 구독 상태가 바뀌면 공개 메뉴판(영업 중/서비스 중지) 캐시도 비운다
    await purgeMenuCacheByCompanyId(companyId);
    return NextResponse.json({
      ok: true,
      refunded,
      refundAmount,
      message: refunded ? undefined : "환불 금액 0원. 구독 정보 초기화 완료.",
    });
  }

  // 전액 환불 (full 또는 월간)
  const amount = paymentKey ? paidAmount : null;

  // 토스 결제 취소 시도 (paymentKey가 있을 때만)
  let refunded = false;
  if (paymentKey) {
    try {
      const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");
      const cancelRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancelReason: reason }),
      });

      if (!cancelRes.ok) {
        const cancelData = await cancelRes.json().catch(() => ({}));
        await logBilling(supabaseAdmin, {
          companyId, operatorId: user.id, plan, amount,
          paymentId: paymentKey, success: false, reason,
          errorMessage: (cancelData as { message?: string }).message ?? "환불 실패",
        });
        return NextResponse.json(
          { error: `토스 환불 실패: ${(cancelData as { message?: string }).message ?? "알 수 없는 오류"}`, detail: cancelData },
          { status: 500 }
        );
      }

      refunded = true;
    } catch (err) {
      console.error("[billing/refund] 환불 요청 오류:", err);
      return NextResponse.json({ error: "환불 요청 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 구독 초기화 + 로그 + 이메일
  await Promise.all([
    clearSubscription(supabaseAdmin, companyId),
    logBilling(supabaseAdmin, { companyId, operatorId: user.id, plan, amount, paymentId: paymentKey, success: true, reason }),
    ownerEmail && companyInfo?.name
      ? sendRefundEmail(ownerEmail, companyInfo.name, plan, amount, reason)
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ok: true,
    refunded,
    message: refunded ? undefined : "결제 내역 없음. 구독 정보 초기화 완료.",
  });
}

async function clearSubscription(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, companyId: string) {
  await Promise.all([
    supabaseAdmin
      .from("company_subscriptions")
      .update({
        plan: "none",
        billing_key: null,
        subscription_plan: null,
        cancel_at_period_end: false,
        plan_expires_at: null,
        payment_retry_count: 0,
        next_retry_at: null,
      })
      .eq("company_id", companyId),
    supabaseAdmin
      .from("company_settings")
      .update({ consult_enabled: false })
      .eq("company_id", companyId),
  ]);
  // 구독 상태가 바뀌면 공개 메뉴판(영업 중/서비스 중지) 캐시도 비운다
  await purgeMenuCacheByCompanyId(companyId);
}

async function logBilling(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, {
  companyId, operatorId, plan, amount, paymentId, success, reason, errorMessage,
}: {
  companyId: string;
  operatorId: string;
  plan: string | null;
  amount: number | null;
  paymentId: string | null;
  success: boolean;
  reason: string;
  errorMessage?: string;
}) {
  await supabaseAdmin.from("billing_logs").insert({
    company_id: companyId,
    operator_id: operatorId,
    type: "refund",
    plan,
    amount,
    payment_id: paymentId,
    success,
    reason,
    error_message: errorMessage ?? null,
  });
}
