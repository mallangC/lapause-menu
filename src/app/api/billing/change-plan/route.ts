import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PLAN_AMOUNT: Record<string, number> = {
  starter: 3900,
  pro: 9900,
};

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

  const { companyId, newPlan } = await req.json();
  if (!companyId || !newPlan) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 회사 소유권 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const supabaseAdmin = getSupabaseAdmin();

  // 현재 구독 정보 조회
  const { data: sub } = await supabaseAdmin
    .from("company_subscriptions")
    .select("billing_key, subscription_plan, plan, plan_expires_at")
    .eq("company_id", companyId)
    .single();

  if (!sub?.billing_key) {
    return NextResponse.json({ error: "결제 수단이 등록되지 않았습니다." }, { status: 400 });
  }

  // ── 다운그레이드 취소: subscription_plan=starter + plan=pro 상태에서 pro로 되돌리기 ──
  if (newPlan === "pro" && sub.subscription_plan === "starter" && sub.plan === "pro") {
    const { error } = await supabaseAdmin
      .from("company_subscriptions")
      .update({ subscription_plan: "pro" })
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, undone: true });
  }

  if (newPlan === "pro") {
    // ── Starter → Pro 업그레이드 ──
    if (sub.subscription_plan !== "starter") {
      return NextResponse.json({ error: "이미 Pro 플랜입니다." }, { status: 400 });
    }

    const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");
    const now = new Date();
    const orderId = `u${companyId.replace(/-/g, "").slice(0, 20)}${Date.now().toString().slice(-8)}`;

    // 환불 이력 확인 (평생 1회만 허용)
    const { count: refundCount } = await supabaseAdmin
      .from("billing_logs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("type", "refund")
      .eq("plan", "starter");

    const refundAlreadyUsed = (refundCount ?? 0) > 0;

    // 결제일로부터 3일 이내인지 확인 (plan_expires_at - 30일 = 결제일)
    let shouldRefund = false;
    if (!refundAlreadyUsed && sub.plan_expires_at) {
      const expiresAt = new Date(sub.plan_expires_at);
      const paymentDate = new Date(expiresAt);
      paymentDate.setDate(paymentDate.getDate() - 30);
      const daysSincePayment = Math.floor((now.getTime() - paymentDate.getTime()) / 86400000);
      shouldRefund = daysSincePayment <= 3;
    }

    // 3일 이내면 Starter 결제 환불
    if (shouldRefund) {
      const { data: recentLog } = await supabaseAdmin
        .from("billing_logs")
        .select("portone_payment_id")
        .eq("company_id", companyId)
        .eq("success", true)
        .eq("plan", "starter")
        .neq("type", "refund")
        .not("portone_payment_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentLog?.portone_payment_id) {
        const cancelRes = await fetch(
          `https://api.tosspayments.com/v1/payments/${recentLog.portone_payment_id}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${encodedKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cancelReason: "Pro 업그레이드로 인한 Starter 환불" }),
          }
        );

        if (!cancelRes.ok) {
          const err = await cancelRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: "환불 처리 중 오류가 발생했습니다.", detail: err },
            { status: 500 }
          );
        }

        await supabaseAdmin.from("billing_logs").insert({
          company_id: companyId,
          operator_id: null,
          type: "refund",
          plan: "starter",
          amount: PLAN_AMOUNT.starter,
          portone_payment_id: recentLog.portone_payment_id,
          success: true,
          reason: "Pro 업그레이드 3일 이내 환불",
        });
      }
    }

    // Pro 9,900원 즉시 결제
    const payRes = await fetch(
      `https://api.tosspayments.com/v1/billing/${encodeURIComponent(sub.billing_key)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerKey: companyId,
          amount: PLAN_AMOUNT.pro,
          orderId,
          orderName: "Flo.Aide Pro 월 구독",
        }),
      }
    );

    if (!payRes.ok) {
      const err = await payRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message ?? "결제에 실패했습니다." },
        { status: 400 }
      );
    }

    const payData = await payRes.json();
    if (payData.status !== "DONE") {
      return NextResponse.json({ error: payData.message ?? "결제에 실패했습니다." }, { status: 400 });
    }

    // plan_expires_at 오늘 + 30일로 재설정
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await Promise.all([
      supabaseAdmin
        .from("company_subscriptions")
        .update({
          subscription_plan: "pro",
          plan: "pro",
          plan_expires_at: expiresAt.toISOString(),
          payment_retry_count: 0,
          next_retry_at: null,
        })
        .eq("company_id", companyId),
      supabaseAdmin.from("billing_logs").insert({
        company_id: companyId,
        operator_id: null,
        type: "charge",
        plan: "pro",
        amount: PLAN_AMOUNT.pro,
        portone_payment_id: payData.paymentKey ?? orderId,
        success: true,
        reason: "Starter → Pro 업그레이드",
      }),
    ]);

    return NextResponse.json({ ok: true, refunded: shouldRefund });

  } else if (newPlan === "starter") {
    // ── Pro → Starter 다운그레이드: 기간 만료 전까지 Pro 기능 유지 ──
    if (sub.subscription_plan !== "pro") {
      return NextResponse.json({ error: "이미 Starter 플랜입니다." }, { status: 400 });
    }

    // subscription_plan만 변경 → 다음 billing-charge 시 starter로 결제되면서 plan도 starter로 변경
    const { error } = await supabaseAdmin
      .from("company_subscriptions")
      .update({ subscription_plan: "starter" })
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });

  } else {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
}
