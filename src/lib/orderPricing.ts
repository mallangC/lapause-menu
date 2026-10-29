import type { SupabaseClient } from "@supabase/supabase-js";

// 손님 주문 금액 서버 검증 — 클라이언트가 보낸 가격을 믿지 않고 DB 상품가·매장 옵션가로 다시 계산한다.
// 화면 계산식(장바구니: CheckoutClient, 맞춤 주문: ConsultClient)과 같은 규칙을 따른다.

export interface OptionPrices {
  shoppingBag: number;
  preservative: number;
  messageCard: number;
  shoppingBagEnabled: boolean;
  preservativeEnabled: boolean;
  messageCardEnabled: boolean;
  /** 배송 구간별 요금 (예: {"0-1": 3000, "1-3": 5000}) */
  deliveryFees: number[];
}

export async function loadOptionPrices(db: SupabaseClient, companyId: string): Promise<OptionPrices> {
  const { data: s } = await db
    .from("company_settings")
    .select("shopping_bag_price, preservative_price, message_card_price, shopping_bag_enabled, preservative_enabled, message_card_enabled, delivery_enabled, delivery_fees")
    .eq("company_id", companyId)
    .single();
  // 결제 화면(cart/checkout/page.tsx)의 기본값과 동일하게
  const fees = (s?.delivery_enabled ? Object.values((s?.delivery_fees as Record<string, number> | null) ?? {}) : [])
    .filter((v): v is number => typeof v === "number");
  return {
    shoppingBag: (s?.shopping_bag_price as number | null) ?? 2000,
    preservative: (s?.preservative_price as number | null) ?? 500,
    messageCard: (s?.message_card_price as number | null) ?? 2000,
    shoppingBagEnabled: !!s?.shopping_bag_enabled,
    preservativeEnabled: !!s?.preservative_enabled,
    messageCardEnabled: !!s?.message_card_enabled,
    deliveryFees: fees,
  };
}

export interface DbProduct {
  id: string;
  price: number;
  name: string;
  product_type: string;
  bag_included: boolean | null;
}

/** 이 매장의 상품만 가져온다 (다른 매장 상품 id로 바꿔치기 방지) */
export async function loadCompanyProducts(db: SupabaseClient, companyId: string, ids: string[]) {
  const { data } = await db
    .from("products")
    .select("id, price, name, product_type, bag_included")
    .eq("company_id", companyId)
    .in("id", ids);
  return new Map((data as DbProduct[] | null ?? []).map((p) => [p.id, p]));
}

const count = (n: unknown) => (Number.isInteger(n) && (n as number) > 0 ? (n as number) : 0);

/** 배송 주문이면 총액에서 상품 금액을 뺀 나머지가 매장 배송 요금표의 금액 중 하나여야 한다 */
export function isValidDeliveryPart(deliveryType: string, deliveryPart: number, prices: OptionPrices) {
  if (deliveryPart === 0) return true; // 픽업, 또는 배송비가 계산되지 않은 배송
  return deliveryType === "배송" && prices.deliveryFees.includes(deliveryPart);
}

export interface CartLine {
  productId: string;
  quantity: number;
  shoppingBagCount: number;
  preservativeCount: number;
  messageCardCount: number;
}

/** 장바구니 상품 금액 합계 (배송비 제외). 상품을 찾을 수 없거나 수량이 잘못되면 null */
export function cartItemsTotal(lines: CartLine[], products: Map<string, DbProduct>, prices: OptionPrices) {
  let total = 0;
  for (const line of lines) {
    const p = products.get(line.productId);
    if (!p || !Number.isInteger(line.quantity) || line.quantity < 1) return null;
    total += p.price * line.quantity;
    if (!p.bag_included) total += prices.shoppingBag * count(line.shoppingBagCount);
    total += prices.preservative * count(line.preservativeCount);
    total += prices.messageCard * count(line.messageCardCount);
  }
  return total;
}

/** 맞춤 주문 최소 금액 — 옵션 개수는 서버로 오지 않으므로 '추가'한 옵션은 최소 1개로 본다 */
export function consultMinimumTotal(
  product: DbProduct,
  form: { messageCard?: string; shoppingBag?: string; preservative?: string },
  prices: OptionPrices
) {
  let min = product.price;
  if (prices.messageCardEnabled && form.messageCard === "추가") min += prices.messageCard;
  if (prices.shoppingBagEnabled && !product.bag_included && form.shoppingBag === "추가") min += prices.shoppingBag;
  if (prices.preservativeEnabled && form.preservative === "추가") min += prices.preservative;
  return min;
}

/** 결제 승인 후 저장 실패 등으로 주문을 만들지 못했을 때 결제를 되돌린다 */
export async function cancelTossPayment(secretKey: string, paymentKey: string, reason: string) {
  try {
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancelReason: reason }),
    });
    if (!res.ok) console.error("[cancelTossPayment] 결제 취소 실패:", await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("[cancelTossPayment] 결제 취소 요청 오류:", err);
    return false;
  }
}
