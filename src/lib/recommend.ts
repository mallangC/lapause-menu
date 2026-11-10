// 맞춤주문 추천 — 형태·분위기·예산으로 어울리는 상품 최대 4개
// 기존 맞춤주문 화면(ConsultClient)과 첫 화면 대화형 추천(StoreWelcomeClient)이 함께 쓴다.

export interface RecommendableProduct {
  id: string;
  price: number;
  product_type: string;
  mood: string | null;
  is_recommended: boolean;
  is_popular: boolean;
}

/**
 * 슬롯 1~2: 예산 ~ 예산+1만(10만원 이상이면 +2만)
 * 슬롯 3~4: 그보다 조금 위 ~ 예산+3만(10만원 이상이면 +5만)
 * 모자라면 전체에서 점수 순으로 채운다. 점수: 형태 4 · 분위기 3 · 추천 2 · 인기 1
 */
export function recommendProducts<T extends RecommendableProduct>(
  products: T[],
  { productType, mood, budget }: { productType: string; mood: string; budget: number }
): T[] {
  // 매장 유형은 매장마다 다르다 — '기타'(정하지 않음)만 형태 조건 없이
  const mappedType = productType && productType !== "기타" ? productType : undefined;
  const isHighBudget = budget >= 100000;
  const tightUpper = isHighBudget ? 20000 : 10000;
  const wideUpper = isHighBudget ? 50000 : 30000;

  const score = (p: T) => {
    let s = 0;
    if (mappedType && p.product_type === mappedType) s += 4;
    if (mood && p.mood === mood) s += 3;
    if (p.is_recommended) s += 2;
    if (p.is_popular) s += 1;
    return s;
  };
  const typeMatch = (p: T) => !mappedType || p.product_type === mappedType;

  const tight = budget > 0
    ? products.filter((p) => typeMatch(p) && p.price >= budget && p.price <= budget + tightUpper)
    : products.filter(typeMatch);
  const tightTop = [...tight].sort((a, b) => score(b) - score(a)).slice(0, 2);
  const usedIds = new Set(tightTop.map((p) => p.id));

  const wide = products.filter((p) => {
    if (!typeMatch(p) || usedIds.has(p.id)) return false;
    if (budget === 0) return true;
    return p.price > budget + tightUpper && p.price <= budget + wideUpper;
  });
  const wideTop = [...wide].sort((a, b) => score(b) - score(a)).slice(0, 2);

  const result = [...tightTop, ...wideTop];
  if (result.length < 4) {
    const allIds = new Set(result.map((p) => p.id));
    const fallback = products
      .filter((p) => !allIds.has(p.id))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 4 - result.length);
    result.push(...fallback);
  }
  return result;
}
