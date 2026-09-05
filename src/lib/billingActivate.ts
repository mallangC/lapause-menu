import { createClient as createAdminClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 빌링키 발급 완료 후 공통 처리: 최초 구독이면 무료체험 시작, 재구독이면 즉시 결제
// company_subscriptions / billing_logs 쓰기는 호출자의 RLS 권한과 무관하게 항상 성공해야 하므로 서비스 롤 클라이언트를 직접 생성해 사용한다.
export async function activateBillingKey(
  companyId: string,
  subscriptionPlan: "monthly" | "annual",
  billingKey: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabase = getSupabaseAdmin();
  const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");

  const { data: existingSub } = await supabase
    .from("company_subscriptions")
    .select("trial_ends_at")
    .eq("company_id", companyId)
    .single();

  const alreadyHadTrial = existingSub?.trial_ends_at != null;
  const now = new Date();

  if (!alreadyHadTrial) {
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { error } = await supabase
      .from("company_subscriptions")
      .upsert(
        {
          company_id: companyId,
          plan: subscriptionPlan,
          billing_key: billingKey,
          pg_provider: "toss",
          subscription_plan: subscriptionPlan,
          trial_ends_at: trialEndsAt.toISOString(),
        },
        { onConflict: "company_id" }
      );

    if (error) return { status: 500, body: { error: error.message } };

    const { error: logError } = await supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount: 0,
      payment_id: null,
      success: true,
      reason: "카드 등록 · 무료체험 시작 (30일)",
    });
    if (logError) console.error("[billingActivate] billing_logs 기록 실패(무료체험):", logError);

    return { status: 200, body: { ok: true, trial: true } };
  }

  // 재구독: 즉시 결제
  const planAmount: Record<string, number> = { monthly: 14900, annual: 118800 };
  const amount = planAmount[subscriptionPlan] ?? 14900;
  const planLabel = subscriptionPlan === "annual" ? "연간" : "월간";
  const orderId = `r${companyId.replace(/-/g, "").slice(0, 20)}${Date.now().toString().slice(-8)}`;

  const { error: upsertError } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: companyId,
        plan: subscriptionPlan,
        billing_key: billingKey,
        pg_provider: "toss",
        subscription_plan: subscriptionPlan,
      },
      { onConflict: "company_id" }
    );

  if (upsertError) return { status: 500, body: { error: upsertError.message } };

  const payRes = await fetch(
    `https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: companyId,
        amount,
        orderId,
        orderName: `Flo.Aide ${planLabel} 월 구독`,
      }),
    }
  );

  if (!payRes.ok) {
    const payError = await payRes.json().catch(() => ({}));
    console.error("[billingActivate] 즉시 결제 실패:", payError);

    const { error: logError } = await supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: null,
      success: false,
      error_message: (payError as { message?: string }).message ?? "결제 실패",
    });
    if (logError) console.error("[billingActivate] billing_logs 기록 실패(즉시결제 실패):", logError);

    return { status: 400, body: { error: (payError as { message?: string }).message ?? "결제에 실패했습니다." } };
  }

  const payData = await payRes.json();

  if (payData.status !== "DONE") {
    const { error: logError } = await supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: null,
      success: false,
      error_message: payData.message ?? "결제 실패",
    });
    if (logError) console.error("[billingActivate] billing_logs 기록 실패(결제 미완료):", logError);

    return { status: 400, body: { error: payData.message ?? "결제에 실패했습니다." } };
  }

  const expiresAt = new Date(now);
  if (subscriptionPlan === "annual") {
    expiresAt.setDate(expiresAt.getDate() + 365);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  const [{ error: updateError }, { error: logError }] = await Promise.all([
    supabase
      .from("company_subscriptions")
      .update({
        plan_expires_at: expiresAt.toISOString(),
        payment_retry_count: 0,
        next_retry_at: null,
      })
      .eq("company_id", companyId),
    supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: payData.paymentKey ?? orderId,
      success: true,
      reason: "재구독 즉시 결제",
    }),
  ]);
  if (updateError) console.error("[billingActivate] plan_expires_at 갱신 실패:", updateError);
  if (logError) console.error("[billingActivate] billing_logs 기록 실패(즉시결제 성공):", logError);

  return { status: 200, body: { ok: true, trial: false } };
}
