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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "operator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { companyId, reason } = await req.json();
  if (!companyId || !reason?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 현재 구독 플랜 조회
  const { data: sub } = await supabaseAdmin
    .from("company_subscriptions")
    .select("subscription_plan")
    .eq("company_id", companyId)
    .single();
  const plan = sub?.subscription_plan as string | null;
  const amount = plan ? (PLAN_AMOUNT[plan] ?? null) : null;

  // 가장 최근 빌링 결제 내역 조회 (토스 paymentKey 저장된 경우)
  const { data: recentLog } = await supabaseAdmin
    .from("billing_logs")
    .select("portone_payment_id")
    .eq("company_id", companyId)
    .eq("success", true)
    .neq("type", "refund")
    .not("portone_payment_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const paymentKey = recentLog?.portone_payment_id ?? null;

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
          portonePaymentId: paymentKey, success: false, reason,
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

  // 구독 초기화 + 로그
  await Promise.all([
    clearSubscription(supabaseAdmin, companyId),
    logBilling(supabaseAdmin, { companyId, operatorId: user.id, plan, amount, portonePaymentId: paymentKey, success: true, reason }),
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
  companyId, operatorId, plan, amount, portonePaymentId, success, reason, errorMessage,
}: {
  companyId: string;
  operatorId: string;
  plan: string | null;
  amount: number | null;
  portonePaymentId: string | null;
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
    portone_payment_id: portonePaymentId,
    success,
    reason,
    error_message: errorMessage ?? null,
  });
}
