// 주문 마지막 페이지(OrderCheckout)와 맞춤주문 앞 단계(ConsultClient)가 함께 쓰는 주문서 모양

/** 맞춤주문 주문서 — 예약 API(/api/reservation)가 받는 form 그대로 */
export interface ConsultForm {
  purpose: string;
  purposeCustom: string;
  recipientGender: string;
  recipientAge: string;
  relationship: string;
  relationshipCustom: string;
  productType: string;
  productTypeCustom: string;
  mood: string;
  budget: string;
  budgetCustom: string;
  messageCard: string;
  messageCardContent: string;
  shoppingBag: string;
  preservative: string;
  deliveryType: string;
  desiredDate: string;
  desiredTime: string;
  requests: string;
  /** 고른 꽃 색 (오늘 매장에 있는 색·모든 색 중 하나 또는 '사장님께 맡길게요') */
  preparedColor?: string;
}

export const EMPTY_FORM: ConsultForm = {
  purpose: "",
  purposeCustom: "",
  recipientGender: "",
  recipientAge: "",
  relationship: "",
  relationshipCustom: "",
  productType: "",
  productTypeCustom: "",
  mood: "",
  budget: "",
  budgetCustom: "",
  messageCard: "",
  messageCardContent: "",
  shoppingBag: "",
  preservative: "",
  deliveryType: "",
  desiredDate: "",
  desiredTime: "",
  requests: "",
};

/** 결제 화면에 필요한 상품 정보 (메뉴판 상품 · 사장님 스타일/사진 주문 가상 상품) */
export interface OrderProduct {
  id: string;
  name: string;
  price: number;
  /** 할인 전 정가 (있으면 할인 중) */
  original_price?: number | null;
  product_type: string;
  image_url: string | null;
  bag_included?: boolean;
  message_card_unavailable?: boolean;
  preservative_unavailable?: boolean;
}

/** 'YYYY-MM-DD' (내 컴퓨터 날짜 기준) */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
