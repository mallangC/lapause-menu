import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PORTONE_API_SECRET = Deno.env.get("PORTONE_API_SECRET")!;
const PORTONE_STORE_ID = Deno.env.get("PORTONE_STORE_ID")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const PLAN_AMOUNT: Record<string, number> = {
  starter: 3900,
  pro: 9900,
};

const MAX_RETRY = 3;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Flo.Aide <noreply@flo-aide.com>",
      to,
      subject,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  // 해지 예약된 기간 만료 처리
  const { data: cancelPending } = await supabase
    .from("company_subscriptions")
    .select("company_id")
    .eq("cancel_at_period_end", true)
    .or(`trial_ends_at.lt.${now.toISOString()},plan_expires_at.lt.${now.toISOString()}`);

  for (const sub of cancelPending ?? []) {
    await Promise.all([
      supabase
        .from("company_subscriptions")
        .update({
          plan: "none",
          subscription_plan: null,
          billing_key: null,
          cancel_at_period_end: false,
          trial_ends_at: null,
          plan_expires_at: null,
          payment_retry_count: 0,
          next_retry_at: null,
        })
        .eq("company_id", sub.company_id),
      supabase
        .from("company_settings")
        .update({ consult_enabled: false })
        .eq("company_id", sub.company_id),
    ]);
  }

  // 결제 대상 조회:
  // 1. 첫 결제: billing_key 있고, trial/plan 만료됐고, retry_count=0, next_retry_at=null
  // 2. 재시도: next_retry_at <= now
  const { data: subscriptions, error } = await supabase
    .from("company_subscriptions")
    .select("company_id, billing_key, subscription_plan, plan_expires_at, trial_ends_at, payment_retry_count, next_retry_at")
    .not("billing_key", "is", null)
    .not("subscription_plan", "is", null)
    .eq("cancel_at_period_end", false)
    .or(
      `and(next_retry_at.is.null,or(trial_ends_at.lt.${now.toISOString()},plan_expires_at.lt.${now.toISOString()})),next_retry_at.lte.${now.toISOString()}`
    );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = [];

  for (const sub of subscriptions ?? []) {
    // companies 테이블에서 name, owner_id 조회
    const { data: companyInfo } = await supabase
      .from("companies")
      .select("name, owner_id")
      .eq("id", sub.company_id)
      .single();

    const plan = sub.subscription_plan as "starter" | "pro";
    const amount = PLAN_AMOUNT[plan];
    const paymentId = `sub-${sub.company_id}-${Date.now()}`;

    try {
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
            billingKey: sub.billing_key,
            orderName: `Flo.Aide ${plan === "pro" ? "Pro" : "Starter"} 월 구독`,
            amount: { total: amount },
            currency: "KRW",
            customer: { id: sub.company_id },
          }),
        }
      );

      const payData = await payRes.json();

      if (payRes.ok && payData.status === "PAID") {
        // 결제 성공: plan_expires_at 30일 연장, retry 초기화
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase
          .from("company_subscriptions")
          .update({
            plan,
            plan_expires_at: expiresAt.toISOString(),
            trial_ends_at: null,
            payment_retry_count: 0,
            next_retry_at: null,
          })
          .eq("company_id", sub.company_id);

        // owner_id로 이메일 조회 및 발송
        if (companyInfo?.owner_id) {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(companyInfo.owner_id);
          if (ownerUser?.user?.email) {
            await sendEmail(
              ownerUser.user.email,
              `[Flo.Aide] ${plan === "pro" ? "Pro" : "Starter"} 구독 결제가 완료되었습니다`,
              `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                  <h2 style="font-size:18px;color:#2c2416;">구독 결제 완료</h2>
                  <p style="color:#555;font-size:14px;">안녕하세요, <strong>${companyInfo.name}</strong> 관리자님.</p>
                  <p style="color:#555;font-size:14px;">
                    <strong>Flo.Aide ${plan === "pro" ? "Pro" : "Starter"}</strong> 플랜 결제가 정상적으로 완료되었습니다.
                  </p>
                  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
                    <tr style="border-bottom:1px solid #eee;">
                      <td style="padding:8px 0;color:#888;">플랜</td>
                      <td style="padding:8px 0;color:#2c2416;font-weight:600;">${plan === "pro" ? "Pro" : "Starter"}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;">
                      <td style="padding:8px 0;color:#888;">결제 금액</td>
                      <td style="padding:8px 0;color:#2c2416;font-weight:600;">₩${amount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#888;">다음 결제일</td>
                      <td style="padding:8px 0;color:#2c2416;font-weight:600;">${expiresAt.toLocaleDateString("ko-KR")}</td>
                    </tr>
                  </table>
                  <p style="color:#aaa;font-size:12px;">본 메일은 자동 발송된 메일입니다.</p>
                </div>
              `,
            );
          }
        }

        results.push({ id: sub.company_id, status: "charged", plan, amount });
      } else {
        // 결제 실패 처리
        const retryCount = (sub.payment_retry_count ?? 0) + 1;

        if (retryCount >= MAX_RETRY) {
          // 최대 재시도 초과 → none으로 변경
          await Promise.all([
            supabase
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
            supabase
              .from("company_settings")
              .update({ consult_enabled: false })
              .eq("company_id", sub.company_id),
          ]);

          results.push({ id: sub.company_id, status: "failed_final", error: payData.message ?? "결제 실패" });
        } else {
          // 24시간 후 재시도 예약
          const nextRetry = new Date(now);
          nextRetry.setHours(nextRetry.getHours() + 24);

          await supabase
            .from("company_subscriptions")
            .update({
              payment_retry_count: retryCount,
              next_retry_at: nextRetry.toISOString(),
            })
            .eq("company_id", sub.company_id);

          results.push({ id: sub.company_id, status: `retry_${retryCount}`, error: payData.message ?? "결제 실패" });
        }
      }
    } catch (err) {
      results.push({
        id: sub.company_id,
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
