import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PLAN_AMOUNT: Record<string, number> = {
  monthly: 14900,
  annual: 118800,
};

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "operator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { companyId, reason, refundType } = await req.json();
  if (!companyId || !reason?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

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

  // 가장 최근 빌링 결제 내역 조회 (토스 paymentKey 저장된 경우)
  const { data: recentLog } = await supabaseAdmin
    .from("billing_logs")
    .select("payment_id")
    .eq("company_id", companyId)
    .eq("success", true)
    .neq("type", "refund")
    .not("payment_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const paymentKey = recentLog?.payment_id ?? null;

  // 연간 부분환불 처리
  if (isPartial && plan === "annual") {
    // 결제일 = plan_expires_at - 365일
    const expiresAt = sub?.plan_expires_at ? new Date(sub.plan_expires_at) : null;
    if (!expiresAt || !paymentKey) {
      return NextResponse.json({ error: "결제 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const paymentDate = new Date(expiresAt);
    paymentDate.setDate(paymentDate.getDate() - 365);

    const now = new Date();
    const usedDays = Math.floor((now.getTime() - paymentDate.getTime()) / 86400000);
    const usedMonths = Math.ceil(usedDays / 30);
    const deduction = usedMonths * 14900;
    const refundAmount = Math.max(0, 118800 - deduction);

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
          return NextResponse.json({ error: "토스 부분환불 실패", detail: cancelData }, { status: 500 });
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

    return NextResponse.json({
      ok: true,
      refunded,
      refundAmount,
      message: refunded ? undefined : "환불 금액 0원. 구독 정보 초기화 완료.",
    });
  }

  // 전액 환불 (full 또는 월간)
  const amount = plan ? (PLAN_AMOUNT[plan] ?? null) : null;

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
        return NextResponse.json({ error: "토스 환불 실패", detail: cancelData }, { status: 500 });
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
