import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET!;
const PORTONE_STORE_ID = process.env.PORTONE_STORE_ID ?? process.env.NEXT_PUBLIC_PORTONE_STORE_ID!;

const PLAN_AMOUNT: Record<string, number> = {
  starter: 3900,
  pro: 9900,
};

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // 현재 구독 플랜 조회 (로그용)
  const { data: sub } = await supabaseAdmin
    .from("company_subscriptions")
    .select("subscription_plan")
    .eq("company_id", companyId)
    .single();
  const plan = sub?.subscription_plan as string | null;
  const amount = plan ? (PLAN_AMOUNT[plan] ?? null) : null;

  // PortOne에서 해당 고객의 최근 완료 결제 조회
  const paymentsRes = await fetch(
    `https://api.portone.io/payments?storeId=${encodeURIComponent(PORTONE_STORE_ID)}&customerId=${encodeURIComponent(companyId)}&status=PAID`,
    {
      headers: { "Authorization": `PortOne ${PORTONE_API_SECRET}` },
    }
  );

  if (!paymentsRes.ok) {
    const errData = await paymentsRes.json().catch(() => ({}));
    return NextResponse.json({ error: "PortOne 결제 조회 실패", detail: errData }, { status: 500 });
  }

  const paymentsData = await paymentsRes.json();
  const payments: Array<{ id: string; paidAt: string }> = paymentsData.items ?? paymentsData.payments ?? [];

  // 결제 내역이 없으면 DB만 초기화
  if (payments.length === 0) {
    await Promise.all([
      clearSubscription(companyId),
      logBilling({ companyId, operatorId: user.id, plan, amount, portonePaymentId: null, success: true, reason }),
    ]);
    return NextResponse.json({ ok: true, refunded: false, message: "PortOne 결제 내역 없음. 구독 정보 초기화 완료." });
  }

  // 가장 최근 결제 취소
  const latest = payments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];

  const cancelRes = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(latest.id)}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `PortOne ${PORTONE_API_SECRET}`,
      },
      body: JSON.stringify({ storeId: PORTONE_STORE_ID, reason }),
    }
  );

  const cancelData = await cancelRes.json();

  if (!cancelRes.ok) {
    // 환불 실패 → 로그만 남기고 DB 건드리지 않음
    await logBilling({
      companyId, operatorId: user.id, plan, amount,
      portonePaymentId: latest.id, success: false, reason,
      errorMessage: cancelData?.message ?? "환불 실패",
    });
    return NextResponse.json({ error: "PortOne 환불 실패", detail: cancelData }, { status: 500 });
  }

  // 환불 성공 → DB 초기화 + 로그
  await Promise.all([
    clearSubscription(companyId),
    logBilling({ companyId, operatorId: user.id, plan, amount, portonePaymentId: latest.id, success: true, reason }),
  ]);

  return NextResponse.json({ ok: true, refunded: true });
}

async function clearSubscription(companyId: string) {
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

async function logBilling({
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
