import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PLAN_AMOUNT: Record<string, number> = {
  monthly: 14900,
  annual: 118800,
};

const MAX_RETRIES = 3;
const RETRY_INTERVAL_HOURS = 24;

interface SubscriptionRow {
  company_id: string;
  plan: string;
  subscription_plan: string | null;
  billing_key: string | null;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  cancel_at_period_end: boolean;
  payment_retry_count: number;
  next_retry_at: string | null;
}

// 매일 1회(크론) 호출: 체험 종료·구독 만료된 매장을 자동 결제하거나, 실패 시 재시도 후 최종 강등
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const nowIso = now.toISOString();

  const { data: subs, error } = await supabaseAdmin
    .from("company_subscriptions")
    .select("company_id, plan, subscription_plan, billing_key, trial_ends_at, plan_expires_at, cancel_at_period_end, payment_retry_count, next_retry_at")
    .not("billing_key", "is", null)
    .neq("plan", "none");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { charged: 0, cancelled: 0, retried: 0, downgraded: 0, skipped: 0 };

  for (const sub of (subs ?? []) as SubscriptionRow[]) {
    // 이미 유효 기간이 남아있으면 대상 아님
    const periodEnd = sub.plan_expires_at ?? sub.trial_ends_at;
    if (!periodEnd || new Date(periodEnd) > now) {
      results.skipped++;
      continue;
    }
    // 재시도 대기 중이면 스킵
    if (sub.next_retry_at && new Date(sub.next_retry_at) > now) {
      results.skipped++;
      continue;
    }

    const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");

    // 해지 예약된 구독: 결제 없이 만료 처리
    if (sub.cancel_at_period_end) {
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
          .eq("company_id", sub.company_id),
        supabaseAdmin
          .from("company_settings")
          .update({ consult_enabled: false })
          .eq("company_id", sub.company_id),
      ]);
      results.cancelled++;
      continue;
    }

    const chargePlan = sub.subscription_plan ?? sub.plan;
    const amount = PLAN_AMOUNT[chargePlan] ?? PLAN_AMOUNT.monthly;
    const orderId = `renew${sub.company_id.replace(/-/g, "").slice(0, 20)}${Date.now().toString().slice(-8)}`;
    const planLabel = chargePlan === "annual" ? "연간" : "월간";

    let payData: { status?: string; paymentKey?: string; message?: string } = {};
    let payOk = false;
    try {
      const payRes = await fetch(
        `https://api.tosspayments.com/v1/billing/${encodeURIComponent(sub.billing_key!)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${encodedKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerKey: sub.company_id,
            amount,
            orderId,
            orderName: `Flo.Aide ${planLabel} 구독 갱신`,
          }),
        }
      );
      payData = await payRes.json().catch(() => ({}));
      payOk = payRes.ok && payData.status === "DONE";
    } catch (err) {
      console.error("[cron/billing-renew] 결제 요청 오류:", sub.company_id, err);
    }

    if (payOk) {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + (chargePlan === "annual" ? 365 : 30));

      await Promise.all([
        supabaseAdmin
          .from("company_subscriptions")
          .update({
            plan: chargePlan,
            plan_expires_at: expiresAt.toISOString(),
            payment_retry_count: 0,
            next_retry_at: null,
          })
          .eq("company_id", sub.company_id),
        supabaseAdmin.from("billing_logs").insert({
          company_id: sub.company_id,
          operator_id: null,
          type: "charge",
          plan: chargePlan,
          amount,
          payment_id: payData.paymentKey ?? orderId,
          success: true,
          reason: "정기결제 자동 갱신",
        }),
      ]);
      results.charged++;
      continue;
    }

    // 결제 실패: 재시도 횟수 증가, 최대 횟수 초과 시 강등
    const nextRetryCount = (sub.payment_retry_count ?? 0) + 1;
    const errorMessage = payData.message ?? "정기결제 자동 갱신 실패";

    await supabaseAdmin.from("billing_logs").insert({
      company_id: sub.company_id,
      operator_id: null,
      type: "charge",
      plan: chargePlan,
      amount,
      payment_id: null,
      success: false,
      error_message: errorMessage,
    });

    if (nextRetryCount >= MAX_RETRIES) {
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
          .eq("company_id", sub.company_id),
        supabaseAdmin
          .from("company_settings")
          .update({ consult_enabled: false })
          .eq("company_id", sub.company_id),
      ]);
      results.downgraded++;
    } else {
      const nextRetryAt = new Date(now);
      nextRetryAt.setHours(nextRetryAt.getHours() + RETRY_INTERVAL_HOURS);
      await supabaseAdmin
        .from("company_subscriptions")
        .update({
          payment_retry_count: nextRetryCount,
          next_retry_at: nextRetryAt.toISOString(),
        })
        .eq("company_id", sub.company_id);
      results.retried++;
    }
  }

  return NextResponse.json({ ok: true, ranAt: nowIso, ...results });
}
