// 결제 방법 — 카드·간편결제(토스 결제창) / 계좌이체(주문 후 매장 계좌로 입금, 사장님이 입금 확인 후 확정)
// 계좌이체는 현금영수증 신청을 함께 받는다 (발행은 사장님이 홈택스 등에서 직접).
// 링크 결제(사장님이 만든 결제 링크)는 카드만 — 여기 선택은 손님이 직접 하는 일반 주문에만 쓴다.

export type PaymentMethod = "card" | "transfer";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "카드·간편결제",
  transfer: "계좌이체",
};

export const CASH_RECEIPT_TYPES = ["소득공제", "지출증빙", "신청 안 함"] as const;
export type CashReceiptType = (typeof CASH_RECEIPT_TYPES)[number];

export interface CashReceipt {
  type: CashReceiptType;
  /** 소득공제: 휴대폰 번호(10~11자리) / 지출증빙: 사업자등록번호(10자리) — 숫자만 */
  number: string;
}

export const CASH_RECEIPT_HINT: Record<CashReceiptType, string> = {
  소득공제: "개인 · 휴대폰 번호",
  지출증빙: "사업자 · 사업자등록번호",
  "신청 안 함": "",
};

/** 현금영수증 입력이 올바른지 — 틀리면 안내 문구 */
export function cashReceiptError(r: CashReceipt): string | null {
  const digits = r.number.replace(/\D/g, "");
  if (r.type === "소득공제" && (digits.length < 10 || digits.length > 11)) return "휴대폰 번호 10~11자리를 입력해주세요.";
  if (r.type === "지출증빙" && digits.length !== 10) return "사업자등록번호 10자리를 입력해주세요.";
  return null;
}

/** 서버 확인 — 주문에 저장할 결제 방법·현금영수증 (잘못된 값이면 null) */
export function parsePaymentChoice(body: { paymentMethod?: unknown; cashReceipt?: unknown }):
  | { method: PaymentMethod; receiptType: CashReceiptType | null; receiptNumber: string | null }
  | null {
  const method = body.paymentMethod === "transfer" ? "transfer" : body.paymentMethod == null || body.paymentMethod === "card" ? "card" : null;
  if (!method) return null;
  if (method === "card") return { method, receiptType: null, receiptNumber: null };
  const r = body.cashReceipt as Partial<CashReceipt> | undefined;
  const type = (CASH_RECEIPT_TYPES as readonly string[]).includes(r?.type ?? "") ? (r!.type as CashReceiptType) : "신청 안 함";
  const number = typeof r?.number === "string" ? r.number.replace(/\D/g, "") : "";
  if (type !== "신청 안 함" && cashReceiptError({ type, number })) return null;
  return { method, receiptType: type, receiptNumber: type === "신청 안 함" ? null : number };
}
