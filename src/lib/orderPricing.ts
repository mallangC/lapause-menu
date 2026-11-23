import { reportOpsAlert } from "@/lib/opsAlert";
import { normalizeOptions, resolveOptions } from "@/lib/productOptions";
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
  message_card_unavailable: boolean | null;
  preservative_unavailable: boolean | null;
  /** 바로 구매 메뉴 상품 (무인 픽업 판단) */
  instant?: boolean | null;
  /** 상품 옵션 묶음 (원본 그대로 — normalizeOptions 로 읽는다) */
  options?: unknown;
  /** 판매 상태 — active 만 주문할 수 있다 */
  status?: string | null;
  /** 재고 관리 */
  stock_enabled?: boolean | null;
  stock?: number | null;
}

/** 이 매장의 상품만 가져온다 (다른 매장 상품 id로 바꿔치기 방지) */
export async function loadCompanyProducts(db: SupabaseClient, companyId: string, ids: string[]) {
  const { data } = await db
    .from("products")
    .select("id, price, name, product_type, bag_included, message_card_unavailable, preservative_unavailable, instant, options, status, stock_enabled, stock")
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
  /** 고른 상품 옵션 항목 id (없으면 기본 선택) */
  options?: string[] | null;
}

/** 상품 1개 값 = 상품가 + 고른 옵션 금액. 옵션이 잘못됐으면 null */
export function productUnitPrice(p: DbProduct, selected: string[] | null | undefined) {
  const resolved = resolveOptions(normalizeOptions(p.options), selected);
  return resolved ? { unit: p.price + resolved.price, options: resolved } : null;
}

/** 장바구니 상품 금액 합계 (배송비 제외). 상품을 찾을 수 없거나 수량이 잘못되면 null */
export function cartItemsTotal(lines: CartLine[], products: Map<string, DbProduct>, prices: OptionPrices) {
  let total = 0;
  for (const line of lines) {
    const p = products.get(line.productId);
    if (!p || !Number.isInteger(line.quantity) || line.quantity < 1) return null;
    // 사장님이 메시지카드 추가 불가로 둔 상품에 카드가 붙어 오면 잘못된 주문으로 본다
    if (p.message_card_unavailable && count(line.messageCardCount) > 0) return null;
    if (p.preservative_unavailable && count(line.preservativeCount) > 0) return null;
    const unit = productUnitPrice(p, line.options);
    if (!unit) return null; // 없는 옵션·하나만 고르는 묶음에서 0개/2개 이상
    total += unit.unit * line.quantity;
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

/**
 * 결제 승인 후 저장 실패 등으로 주문을 만들지 못했을 때 결제를 되돌린다
 * @param alert 넘기면 취소에 실패했을 때 운영자 알림을 남긴다 (손님 돈만 빠진 상태 — 직접 환불해야 한다)
 */
export async function cancelTossPayment(
  secretKey: string,
  paymentKey: string,
  reason: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alert?: { db: SupabaseClient<any, any, any>; companyId: string | null; amount?: number | null },
) {
  const ok = await cancelTossPaymentRaw(secretKey, paymentKey, reason);
  if (!ok && alert) {
    await reportOpsAlert(alert.db, {
      kind: "payment_cancel_failed",
      companyId: alert.companyId,
      title: "결제 자동 취소 실패 — 직접 환불 필요",
      detail: `사유: ${reason}${alert.amount ? ` · ${alert.amount.toLocaleString()}원` : ""} · 토스 결제키 ${paymentKey}`,
    });
  }
  return ok;
}

async function cancelTossPaymentRaw(secretKey: string, paymentKey: string, reason: string) {
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

/** 수령 희망 일시(KST)가 이미 지났는지 — 결제 화면을 오래 열어둔 채 결제하는 경우 등을 서버에서 막는다 */
export function isPastPickup(desiredDate: string | undefined, desiredTime: string | undefined) {
  if (!desiredDate || !/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) return false;
  // 24:00(자정 수령 — 영업시간 외 수령의 마지막 시간)은 그날 끝으로 본다
  const time = desiredTime === "24:00" ? "23:59" : desiredTime && /^\d{2}:\d{2}$/.test(desiredTime) ? desiredTime : "23:59";
  return new Date(`${desiredDate}T${time}:00+09:00`).getTime() < Date.now();
}

/**
 * 품절·재고 확인 (결제 승인 전에) — 판매 중(active)이 아닌 상품이나 남은 재고보다 많이 주문하면 안내 문구를 돌려준다
 * lines: 상품 id 와 개수 (같은 상품이 여러 줄이면 합쳐서 본다)
 */
export function stockProblem(lines: { productId: string; quantity: number }[], products: Map<string, DbProduct>): string | null {
  const want = new Map<string, number>();
  for (const l of lines) want.set(l.productId, (want.get(l.productId) ?? 0) + (Number.isInteger(l.quantity) && l.quantity > 0 ? l.quantity : 1));
  for (const [id, qty] of want) {
    const p = products.get(id);
    if (!p) continue;
    if (p.status && p.status !== "active") return `'${p.name}'은(는) 품절됐어요. 장바구니를 다시 확인해 주세요.`;
    if (p.stock_enabled && (p.stock ?? 0) < qty) {
      return (p.stock ?? 0) > 0 ? `'${p.name}'은(는) ${p.stock}개만 남았어요. 수량을 줄여 주세요.` : `'${p.name}'은(는) 품절됐어요. 장바구니를 다시 확인해 주세요.`;
    }
  }
  return null;
}

/** 주문이 저장된 뒤 재고 줄이기 — 재고 관리 상품만, 0개가 되면 품절로 (DB 함수가 한 번에 처리). 실패해도 주문은 그대로 */
export async function takeStock(db: SupabaseClient, lines: { productId: string; quantity: number }[], products: Map<string, DbProduct>) {
  const want = new Map<string, number>();
  for (const l of lines) want.set(l.productId, (want.get(l.productId) ?? 0) + (l.quantity > 0 ? l.quantity : 1));
  for (const [id, qty] of want) {
    if (!products.get(id)?.stock_enabled) continue;
    try {
      const { error } = await db.rpc("take_product_stock", { p_product_id: id, p_qty: qty });
      if (error) console.error("[stock] 재고 줄이기 실패:", id, error.message);
    } catch (e) {
      console.error("[stock] 재고 줄이기 오류:", id, e);
    }
  }
}

/**
 * 예약을 취소하면 재고 되돌리기 — 손님 주문(Flo.Aide)으로 재고가 줄었던 상품만 (재고 관리 상품, 개수만큼)
 * 품절이었으면 다시 활성화된다 (DB 함수가 한 번에 처리). 실패해도 취소는 그대로
 */
export async function restoreStock(db: SupabaseClient, items: { product_id?: string | null; quantity?: number | null }[] | null) {
  const want = new Map<string, number>();
  for (const it of items ?? []) {
    if (!it?.product_id) continue;
    want.set(it.product_id, (want.get(it.product_id) ?? 0) + (Number.isInteger(it.quantity) && (it.quantity as number) > 0 ? (it.quantity as number) : 1));
  }
  for (const [id, qty] of want) {
    try {
      const { error } = await db.rpc("restore_product_stock", { p_product_id: id, p_qty: qty });
      if (error) console.error("[stock] 재고 되돌리기 실패:", id, error.message);
    } catch (e) {
      console.error("[stock] 재고 되돌리기 오류:", id, e);
    }
  }
}
