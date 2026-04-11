export interface ReservationItem {
  type: string;
  name: string;
  price: number;
  message_card: string;
  message_card_content: string | null;
  shopping_bag: string;
  memo: string | null;
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
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  address_detail: string | null;
  customer_profile_id: string | null;
  reference_images: string[] | null;
}

export type SortKey = "desired_date";
