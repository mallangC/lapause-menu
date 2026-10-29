import { PLAN_PRICES } from "./constants";

// 구독 결제 금액 계산 — 첫 결제(재구독), 정기결제(Workflow), 사장님 화면 안내가 모두 이 함수를 쓴다.
// 클라이언트·서버·Workers 어디서든 import할 수 있도록 DB 접근 없이 순수 계산만 한다.

export type BillingCycle = "monthly" | "annual";

/** 1회 결제 금액 (정가) */
export const PLAN_CHARGE_AMOUNT: Record<BillingCycle, number> = {
  monthly: PLAN_PRICES.monthly,
  annual: PLAN_PRICES.annualTotal,
};

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "amount";
  discount_value: number;
  applies_to: "all" | BillingCycle;
  /** null = 평생 할인, N = N번 결제까지 */
  duration_cycles: number | null;
}

/** promo_codes를 조회할 때 쓰는 컬럼 (PromoCode 타입과 맞춤) */
export const PROMO_CODE_COLUMNS = "id, code, discount_type, discount_value, applies_to, duration_cycles";

export interface ChargeQuote {
  /** 정가 */
  baseAmount: number;
  /** 할인액 (할인 없으면 0) */
  discountAmount: number;
  /** 실제 결제 금액 */
  amount: number;
  /** 이번 결제에 할인이 적용됐으면 그 코드 id */
  promoCodeId: string | null;
}

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === "monthly" || v === "annual";
}

export function promoAppliesTo(promo: PromoCode, cycle: BillingCycle) {
  return promo.applies_to === "all" || promo.applies_to === cycle;
}

/**
 * 이번 결제 금액 계산.
 * @param cyclesRemaining 구독의 discount_cycles_remaining (null = 평생 할인)
 */
export function quoteCharge(cycle: BillingCycle, promo: PromoCode | null, cyclesRemaining: number | null): ChargeQuote {
  const baseAmount = PLAN_CHARGE_AMOUNT[cycle];
  const usable = !!promo && promoAppliesTo(promo, cycle) && (cyclesRemaining === null || cyclesRemaining > 0);
  if (!usable) return { baseAmount, discountAmount: 0, amount: baseAmount, promoCodeId: null };

  const raw = promo.discount_type === "percent"
    ? Math.round((baseAmount * promo.discount_value) / 100)
    : promo.discount_value;
  // 할인액이 정가보다 커도 결제 금액이 음수가 되지 않게 한다 (0원이면 결제 없이 기간만 갱신)
  const discountAmount = Math.min(raw, baseAmount);
  return { baseAmount, discountAmount, amount: baseAmount - discountAmount, promoCodeId: promo.id };
}

/** 결제 성공 후 저장할 남은 할인 횟수 — 이번 결제에 할인이 쓰였을 때만 1 줄인다 */
export function nextCyclesRemaining(quote: ChargeQuote, cyclesRemaining: number | null) {
  if (!quote.promoCodeId || cyclesRemaining === null) return cyclesRemaining;
  return Math.max(0, cyclesRemaining - 1);
}

const CYCLE_LABEL: Record<BillingCycle, string> = { monthly: "월간", annual: "연간" };

/** "30% 할인" / "5,000원 할인" */
export function describeDiscount(promo: Pick<PromoCode, "discount_type" | "discount_value">) {
  return promo.discount_type === "percent"
    ? `${promo.discount_value}% 할인`
    : `${promo.discount_value.toLocaleString()}원 할인`;
}

/** "평생" / "3회 결제" + 적용 플랜 */
export function describePromoTerms(promo: Pick<PromoCode, "applies_to" | "duration_cycles">) {
  const period = promo.duration_cycles === null ? "평생 적용" : `${promo.duration_cycles}회 결제까지`;
  const target = promo.applies_to === "all" ? "월간·연간" : `${CYCLE_LABEL[promo.applies_to]} 플랜`;
  return `${target} · ${period}`;
}

/** PostgREST 임베드(promo:promo_codes(...))는 타입상 배열/객체 둘 다 가능해서 하나로 정리 */
export function pickPromo(raw: unknown): PromoCode | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && typeof v === "object" && "id" in v ? (v as PromoCode) : null;
}
