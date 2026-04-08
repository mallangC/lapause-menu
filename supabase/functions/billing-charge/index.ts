import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PORTONE_API_SECRET = Deno.env.get("PORTONE_API_SECRET")!;
const PORTONE_STORE_ID = Deno.env.get("PORTONE_STORE_ID")!;

const PLAN_AMOUNT: Record<string, number> = {
  starter: 4900,
  pro: 9900,
};

Deno.serve(async (req) => {
  // cron 요청 또는 Authorization 헤더 검증
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  // 결제 대상 조회:
  // - billing_key 있음
  // - subscription_plan 있음
  // - 체험 종료됨 (trial_ends_at < now 또는 null)
  // - plan_expires_at 없거나 만료됨
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, billing_key, subscription_plan, cancel_at_period_end, plan_expires_at, trial_ends_at")
    .not("billing_key", "is", null)
    .not("subscription_plan", "is", null)
    .eq("cancel_at_period_end", false)
    .or(`trial_ends_at.is.null,trial_ends_at.lt.${now.toISOString()}`)
    .or(`plan_expires_at.is.null,plan_expires_at.lt.${now.toISOString()}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // 해지 예약된 기간 만료 처리
  const { data: cancelPending } = await supabase
    .from("companies")
    .select("id")
    .eq("cancel_at_period_end", true)
    .or(`trial_ends_at.lt.${now.toISOString()},plan_expires_at.lt.${now.toISOString()}`);

  for (const company of cancelPending ?? []) {
    await supabase
      .from("companies")
      .update({ plan: "none", subscription_plan: null, billing_key: null, cancel_at_period_end: false, trial_ends_at: null, plan_expires_at: null, consult_enabled: false })
      .eq("id", company.id);
  }

  const results = [];

  for (const company of companies ?? []) {
    const plan = company.subscription_plan as "starter" | "pro";
    const amount = PLAN_AMOUNT[plan];
    const paymentId = `sub-${company.id}-${Date.now()}`;

    try {
      // PortOne 빌링키 결제
      const payRes = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `PortOne ${PORTONE_API_SECRET}`,
          },
          body: JSON.stringify({
            storeId: PORTONE_STORE_ID,
            billingKey: company.billing_key,
            orderName: `Flo.Aide ${plan === "pro" ? "Pro" : "Starter"} 월 구독`,
            amount: { total: amount },
            currency: "KRW",
            customer: { id: company.id },
          }),
        }
      );

      const payData = await payRes.json();

      if (payRes.ok && payData.status === "PAID") {
        // 결제 성공: plan_expires_at 30일 연장
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase
          .from("companies")
          .update({
            plan,
            plan_expires_at: expiresAt.toISOString(),
            trial_ends_at: null,
          })
          .eq("id", company.id);

        results.push({ id: company.id, status: "charged", plan, amount });
      } else {
        // 결제 실패: 스타터로 다운그레이드 + 맞춤 주문 비활성화
        await supabase
          .from("companies")
          .update({
            plan: "starter",
            billing_key: null,
            subscription_plan: null,
            consult_enabled: false,
            plan_expires_at: null,
          })
          .eq("id", company.id);

        results.push({
          id: company.id,
          status: "failed",
          error: payData.message ?? "결제 실패",
        });
      }
    } catch (err) {
      results.push({
        id: company.id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, results }),
    { headers: { "Content-Type": "application/json" } }
  );
});
