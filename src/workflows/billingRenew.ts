import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { menuCacheKey } from "../lib/menuCacheKey";
import { isBillingCycle, nextCyclesRemaining, pickPromo, PROMO_CODE_COLUMNS, quoteCharge } from "../lib/billingPrice";

// 정기결제 자동 갱신 — 구독 1건당 Workflow 인스턴스 1개.
// 각 step의 결과는 Cloudflare가 기억하므로, 중간에 실패해서 재실행돼도 이미 끝난 결제 step은 다시 실행되지 않는다.

const MAX_RETRIES = 3;
const RETRY_INTERVAL_HOURS = 24;

export interface BillingEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TOSS_BILLING_SECRET_KEY: string;
  BILLING_RENEW: WorkflowBinding<BillingRenewParams>;
  /** 공개 메뉴판 캐시 (구독 해지 시 "서비스 중지"가 바로 보이도록 비운다) */
  MENU_CACHE?: { delete(key: string): Promise<void> };
}

interface WorkflowBinding<T> {
  create(options: { id: string; params: T }): Promise<{ id: string }>;
}

interface BillingRenewParams {
  companyId: string;
  orderId: string;
}

export interface SubscriptionRow {
  company_id: string;
  plan: string;
  subscription_plan: string | null;
  billing_key: string | null;
  trial_ends_at: string | null;
  plan_expires_at: string | null;
  cancel_at_period_end: boolean;
  payment_retry_count: number | null;
  next_retry_at: string | null;
  discount_cycles_remaining: number | null;
  /** 적용된 할인 코드 (promo_codes 임베드) */
  promo: unknown;
}

interface ChargeResult {
  ok: boolean;
  paymentKey: string | null;
  message: string | null;
  chargedAt: string;
}

export const SUBSCRIPTION_COLUMNS =
  `company_id, plan, subscription_plan, billing_key, trial_ends_at, plan_expires_at, cancel_at_period_end, payment_retry_count, next_retry_at, discount_cycles_remaining, promo:promo_codes(${PROMO_CODE_COLUMNS})`;

function adminClient(env: BillingEnv) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

function tossAuthHeader(env: BillingEnv) {
  return `Basic ${btoa(`${env.TOSS_BILLING_SECRET_KEY}:`)}`;
}

// 결제 대상 여부 — 유효 기간이 지났고, 재시도 대기 중이 아닌 구독
export function isDue(sub: SubscriptionRow, now: Date) {
  const periodEnd = sub.plan_expires_at ?? sub.trial_ends_at;
  if (!periodEnd || new Date(periodEnd) > now) return false;
  if (sub.next_retry_at && new Date(sub.next_retry_at) > now) return false;
  return true;
}

// 같은 결제 기간·같은 재시도 차수에는 항상 같은 값 → Workflow 인스턴스 ID, 토스 orderId, 멱등키로 함께 사용.
// cron이 중복 실행되거나 step이 재시도돼도 동일 결제가 두 번 일어나지 않는다. (영문/숫자/-만, 64자 이내)
export function renewalKey(sub: SubscriptionRow) {
  const periodEnd = (sub.plan_expires_at ?? sub.trial_ends_at ?? "").slice(0, 10).replace(/-/g, "");
  return `renew-${sub.company_id.replace(/-/g, "")}-${periodEnd}-r${sub.payment_retry_count ?? 0}`;
}

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  // 에러를 던져야 Workflows가 해당 step을 재시도한다
  if (error) throw new Error(error.message);
  return data;
}

async function downgrade(db: SupabaseClient, companyId: string, env: BillingEnv) {
  await must(db.from("company_subscriptions").update({
    plan: "none",
    billing_key: null,
    subscription_plan: null,
    cancel_at_period_end: false,
    plan_expires_at: null,
    payment_retry_count: 0,
    next_retry_at: null,
  }).eq("company_id", companyId));
  await must(db.from("company_settings").update({ consult_enabled: false }).eq("company_id", companyId));

  // 메뉴판 캐시 비우기 — 실패해도 캐시 TTL(1시간) 후 자동 반영되므로 결제 처리는 계속 진행
  if (env.MENU_CACHE) {
    const { data } = await db.from("companies").select("slug").eq("id", companyId).maybeSingle();
    if (data?.slug) await env.MENU_CACHE.delete(menuCacheKey(data.slug)).catch(() => {});
  }
}

/** cron에서 호출: 오늘 결제할 구독마다 Workflow 인스턴스를 만든다. 이미 만들어진 인스턴스(같은 키)는 건너뛴다. */
export async function dispatchBillingRenewals(env: BillingEnv) {
  const db = adminClient(env);
  const now = new Date();
  const subs = await must(
    db.from("company_subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .not("billing_key", "is", null)
      .neq("plan", "none")
  ) as SubscriptionRow[] | null;

  const result = { created: 0, duplicate: 0, notDue: 0 };
  for (const sub of subs ?? []) {
    if (!isDue(sub, now)) { result.notDue++; continue; }
    const key = renewalKey(sub);
    try {
      await env.BILLING_RENEW.create({ id: key, params: { companyId: sub.company_id, orderId: key } });
      result.created++;
    } catch (err) {
      // 같은 ID의 인스턴스가 이미 있음 = 이 결제 차수는 이미 처리 중이거나 끝났음
      result.duplicate++;
      console.warn("[billing-renew] 인스턴스 생성 건너뜀:", key, err instanceof Error ? err.message : err);
    }
  }
  console.log("[billing-renew] dispatch 완료:", JSON.stringify(result));
  return result;
}

export class BillingRenewWorkflow extends WorkflowEntrypoint<BillingEnv, BillingRenewParams> {
  async run(event: Readonly<WorkflowEvent<BillingRenewParams>>, step: WorkflowStep) {
    const { companyId, orderId } = event.payload;
    const env = this.env;

    // 1. 실행 시점의 구독 상태를 다시 확인 (dispatch 이후 해지·수동 결제 등으로 바뀌었을 수 있음)
    const sub = await step.do("load subscription", async () => {
      return await must(
        adminClient(env).from("company_subscriptions").select(SUBSCRIPTION_COLUMNS).eq("company_id", companyId).maybeSingle()
      ) as SubscriptionRow | null;
    });

    if (!sub || sub.plan === "none" || !sub.billing_key) return { result: "skipped", reason: "no active subscription" };
    if (!isDue(sub, new Date()) || renewalKey(sub) !== orderId) {
      return { result: "skipped", reason: "already renewed or state changed" };
    }

    // 2. 해지 예약된 구독은 결제 없이 만료 처리
    if (sub.cancel_at_period_end) {
      await step.do("expire cancelled subscription", async () => {
        await downgrade(adminClient(env), companyId, env);
        return true;
      });
      return { result: "cancelled" };
    }

    const rawPlan = sub.subscription_plan ?? sub.plan;
    const chargePlan = isBillingCycle(rawPlan) ? rawPlan : "monthly";
    // 할인 코드 반영 금액 — sub는 위 step 결과로 고정돼 있어서 재실행돼도 같은 금액
    const quote = quoteCharge(chargePlan, pickPromo(sub.promo), sub.discount_cycles_remaining);
    const amount = quote.amount;
    const planLabel = chargePlan === "annual" ? "연간" : "월간";

    // 3. 토스 결제 — 네트워크 오류·5xx·429만 재시도 (같은 orderId + 멱등키라 재시도해도 이중 결제 없음).
    //    카드 거절 같은 4xx는 재시도하지 않고 실패 결과로 반환한다.
    let charge: ChargeResult;
    if (amount <= 0) {
      // 100% 할인 — 토스 결제 없이 기간만 갱신
      charge = await step.do("skip charge (free by promo)", async () => ({
        ok: true, paymentKey: null, message: null, chargedAt: new Date().toISOString(),
      }));
    } else {
      try {
        charge = await step.do(
          "charge",
          { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" }, timeout: "2 minutes" },
          async () => {
            const res = await fetch(`https://api.tosspayments.com/v1/billing/${encodeURIComponent(sub.billing_key!)}`, {
              method: "POST",
              headers: {
                Authorization: tossAuthHeader(env),
                "Content-Type": "application/json",
                "Idempotency-Key": orderId,
              },
              body: JSON.stringify({
                customerKey: companyId,
                amount,
                orderId,
                orderName: `Flo.Aide ${planLabel} 구독 갱신`,
              }),
            });
            if (res.status >= 500 || res.status === 429) throw new Error(`토스 일시 오류 (${res.status})`);
            const data = await res.json().catch(() => ({})) as { status?: string; paymentKey?: string; message?: string };
            return {
              ok: res.ok && data.status === "DONE",
              paymentKey: data.paymentKey ?? null,
              message: data.message ?? null,
              chargedAt: new Date().toISOString(),
            };
          }
        );
      } catch {
        // 재시도를 다 써도 응답을 못 받음 → 실제로는 결제됐을 수 있으므로 orderId로 토스에 조회해서 판단
        charge = await step.do("lookup payment by orderId", { retries: { limit: 3, delay: "1 minute", backoff: "exponential" } }, async () => {
          const res = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, {
            headers: { Authorization: tossAuthHeader(env) },
          });
          if (res.status === 404) {
            return { ok: false, paymentKey: null, message: "토스 응답 없음 (결제 내역 없음)", chargedAt: new Date().toISOString() };
          }
          if (!res.ok) throw new Error(`토스 결제 조회 실패 (${res.status})`);
          const data = await res.json() as { status?: string; paymentKey?: string; approvedAt?: string };
          return {
            ok: data.status === "DONE",
            paymentKey: data.paymentKey ?? null,
            message: data.status === "DONE" ? null : `결제 상태: ${data.status}`,
            chargedAt: data.approvedAt ?? new Date().toISOString(),
          };
        });
      }
    }

    // 4. 결과 반영 — DB step이 실패해 재실행돼도 위 결제 step은 기억된 결과를 쓴다
    if (charge.ok) {
      await step.do("apply renewal", async () => {
        const expiresAt = new Date(charge.chargedAt);
        expiresAt.setDate(expiresAt.getDate() + (chargePlan === "annual" ? 365 : 30));
        await must(adminClient(env).from("company_subscriptions").update({
          plan: chargePlan,
          plan_expires_at: expiresAt.toISOString(),
          payment_retry_count: 0,
          next_retry_at: null,
          discount_cycles_remaining: nextCyclesRemaining(quote, sub.discount_cycles_remaining),
        }).eq("company_id", companyId));
        return true;
      });
      await step.do("log success", async () => {
        await must(adminClient(env).from("billing_logs").insert({
          company_id: companyId,
          operator_id: null,
          type: "charge",
          plan: chargePlan,
          amount,
          base_amount: quote.baseAmount,
          discount_amount: quote.discountAmount,
          promo_code_id: quote.promoCodeId,
          // 0원(전액 할인)은 실제 결제가 없으므로 환불 대상이 되지 않게 비워둔다
          payment_id: amount > 0 ? (charge.paymentKey ?? orderId) : null,
          success: true,
          reason: quote.promoCodeId ? "정기결제 자동 갱신 (할인 코드 적용)" : "정기결제 자동 갱신",
        }));
        return true;
      });
      return { result: "charged", amount };
    }

    await step.do("log failure", async () => {
      await must(adminClient(env).from("billing_logs").insert({
        company_id: companyId,
        operator_id: null,
        type: "charge",
        plan: chargePlan,
        amount,
        base_amount: quote.baseAmount,
        discount_amount: quote.discountAmount,
        promo_code_id: quote.promoCodeId,
        payment_id: null,
        success: false,
        error_message: charge.message ?? "정기결제 자동 갱신 실패",
      }));
      return true;
    });

    // 실패: 재시도 횟수 증가(다음 차수는 새 orderId), 최대 횟수 도달 시 강등
    const nextRetryCount = (sub.payment_retry_count ?? 0) + 1;
    if (nextRetryCount >= MAX_RETRIES) {
      await step.do("downgrade after max retries", async () => {
        await downgrade(adminClient(env), companyId, env);
        return true;
      });
      return { result: "downgraded" };
    }

    await step.do("schedule retry", async () => {
      // 다음 날 같은 시각 cron에서 확실히 대상이 되도록 1시간 여유를 둔다 (정확히 24시간이면 몇 초 차이로 하루를 건너뛸 수 있음)
      const nextRetryAt = new Date(charge.chargedAt);
      nextRetryAt.setHours(nextRetryAt.getHours() + RETRY_INTERVAL_HOURS - 1);
      await must(adminClient(env).from("company_subscriptions").update({
        payment_retry_count: nextRetryCount,
        next_retry_at: nextRetryAt.toISOString(),
      }).eq("company_id", companyId));
      return true;
    });
    return { result: "retry scheduled", nextRetryCount };
  }
}
