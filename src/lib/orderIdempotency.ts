import type { SupabaseClient } from "@supabase/supabase-js";

// 같은 주문이 두 번 저장되지 않게 — 주문 API(/api/order, /api/reservation)가 함께 쓴다
// · 카드: 같은 결제(paymentKey)로 이미 저장된 주문이 있으면 다시 승인·저장하지 않고 그 주문을 돌려준다
//         (새로고침·네트워크 재시도·동시에 두 번 들어온 요청 — DB에도 payment_id 중복 금지 인덱스가 있다)
// · 무통장 입금: 결제가 없어 같은 키가 없으므로, 같은 매장·전화번호·금액의 주문이 방금(2분 안) 들어왔으면 중복으로 본다

export interface ExistingOrder {
  id: string;
  order_token: string | null;
}

/** 이 결제로 이미 저장된 주문 */
export async function findOrderByPayment(admin: SupabaseClient, paymentKey: string): Promise<ExistingOrder | null> {
  const { data } = await admin
    .from("reservations")
    .select("id, order_token")
    .eq("payment_id", paymentKey)
    .limit(1)
    .maybeSingle();
  return (data as ExistingOrder | null) ?? null;
}

const TRANSFER_DUP_WINDOW_MS = 2 * 60 * 1000;

/** 방금 들어온 같은 무통장 입금 주문 (같은 매장·전화번호·금액, 2분 안) */
export async function findRecentTransferOrder(
  admin: SupabaseClient,
  companyId: string,
  phone: string,
  finalPrice: number,
): Promise<ExistingOrder | null> {
  const { data } = await admin
    .from("reservations")
    .select("id, order_token")
    .eq("company_id", companyId)
    .eq("orderer_phone", phone)
    .eq("payment_method", "transfer")
    .eq("final_price", finalPrice)
    .is("deleted_at", null)
    .gte("created_at", new Date(Date.now() - TRANSFER_DUP_WINDOW_MS).toISOString())
    .limit(1)
    .maybeSingle();
  return (data as ExistingOrder | null) ?? null;
}

/** 토스가 '이미 처리된 결제'라고 할 때의 오류 코드 */
export const TOSS_ALREADY_PROCESSED = "ALREADY_PROCESSED_PAYMENT";
