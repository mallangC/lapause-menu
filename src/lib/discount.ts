// 상품 할인 — 가격(price)은 손님이 실제로 내는 할인가, 정가(original_price)가 있으면 할인 중
// 할인율은 저장하지 않고 두 가격으로 계산한다

/** 할인가는 100원 단위로 맞춘다 */
export const DISCOUNT_UNIT = 100;

/** 할인 중인지 — 정가가 있고 판매가보다 클 때 */
export const isDiscounted = (price: number, original?: number | null): original is number =>
  original != null && original > price && price > 0;

/** 할인율(%) — 정수로 반올림 (예: 80,000 → 72,500 이면 9%) */
export const discountRate = (price: number, original?: number | null) =>
  isDiscounted(price, original) ? Math.round(((original - price) / original) * 100) : 0;

/** 할인율로 할인가 계산 — 100원 단위 */
export const priceFromRate = (original: number, rate: number) =>
  Math.round((original * (1 - rate / 100)) / DISCOUNT_UNIT) * DISCOUNT_UNIT;

/** 할인 금액 (정가 - 할인가) */
export const discountAmount = (price: number, original?: number | null) => (isDiscounted(price, original) ? original - price : 0);
