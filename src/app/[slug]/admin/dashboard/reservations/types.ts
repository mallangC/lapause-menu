export interface ReservationItem {
  type: string;
  name: string;
  price: number;
  message_card: string;
  message_card_content: string | null;
  shopping_bag: string;
  preservative?: string;
  memo: string | null;
  status?: string;
  product_id?: string | null;
  /** 같은 상품을 여러 개 주문했을 때 개수 (장바구니·수량 2개 이상 바로 예약) — 없으면 1 */
  quantity?: number;
}

export interface Reservation {
  id: string;
  created_at: string;
  status: "미확인" | "준비중" | "제작완료" | "픽업/배송완료" | "취소";
  orderer_name: string;
  orderer_phone: string;
  items: ReservationItem[];
  quantity: number;
  paid: boolean;
  final_price: number;
  purpose: string;
  recipient_gender: string;
  recipient_age: string;
  relationship: string;
  mood: string;
  budget: string;
  channel: string | null;
  delivery_type: string;
  delivery_fee: number | null;
  admin_memo: string | null;
  cancel_reason: string | null;
  desired_date: string;
  desired_time: string;
  requests: string | null;
  /** 오늘 있는 색으로 준비하는 주문 — 손님이 고른 꽃 색상 ('사장님께 맡길게요' 포함) */
  prepared_color?: string | null;
  /** 결제 방법 — 'transfer'(계좌이체)만 저장, 비어 있으면 카드 결제 */
  payment_method?: string | null;
  /** 계좌이체 현금영수증 — '소득공제' | '지출증빙' | '신청 안 함' */
  cash_receipt_type?: string | null;
  /** 현금영수증 번호 (휴대폰 / 사업자등록번호, 숫자만) */
  cash_receipt_number?: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  address_detail: string | null;
  customer_profile_id: string | null;
  reference_images: string[] | null;
  /** 주문 경로: cart / product_detail / consult / manual / pay_link */
  order_path?: string | null;
  /** 유입 출처: instagram / naver / kakao / qr / direct ... (예전 주문은 null) */
  traffic_source?: string | null;
  payment_token: string | null;
  payment_link_expires_at: string | null;
  payment_id: string | null;
  settlement_id: string | null;
}

export type SortKey = "desired_date";
