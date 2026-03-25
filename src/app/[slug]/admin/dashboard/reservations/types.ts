export interface Reservation {
  id: string;
  created_at: string;
  status: "미확인" | "준비중" | "제작완료" | "픽업/배송완료" | "취소";
  orderer_name: string;
  orderer_phone: string;
  product_name: string;
  product_price: number;
  product_type: string;
  product_image_url: string | null;
  quantity: number;
  paid: boolean;
  final_price: number;
  purpose: string;
  recipient_gender: string;
  recipient_age: string;
  relationship: string;
  mood: string;
  budget: string;
  message_card: string;
  message_card_content: string | null;
  shopping_bag: string;
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
}

export type SortKey = "desired_date";
