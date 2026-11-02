// 사장님 화면 미리보기용 목업 데이터 — 실제 매장(데모 포함) 데이터를 읽지 않는다

export const MOCK_COMPANY_NAME = "Brand Name";

// 매장 설정 (대시보드 요약에서 쓰는 값) — 준비를 다 마친 매장처럼 채워 둔다
export const MOCK_SETTINGS = {
  consult_enabled: true,
  consult_apply_status: "approved" as "pending" | "approved" | "rejected" | null,
  business_verified_at: "2026-09-01T00:00:00Z",
  bank_account_image_url: "mock",
  bank_name: "국민은행",
  bank_account: "123456-01-234567",
  bank_holder: "홍길동",
  address: "서울 강남구 가로수길 9",
  delivery_enabled: true,
  message_card_enabled: true,
  shopping_bag_enabled: true,
  preservative_enabled: false,
  mail_order_number: "2026-서울강남-01234",
  sold_count: 128,
  company_phone: "02-123-4567",
};
