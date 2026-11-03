"use client";

import PreviewCoach, { type CoachStep } from "../../PreviewCoach";

// 장바구니 설명(CartCoach)과 같은 요소를 가리키되, 바로 예약 화면에 맞춘 문구
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="cart-qty"]'],
    title: "수량 변경",
    body: "상품 상세에서 고른 수량이 그대로 담겨 와요.\n여기서도 수량을 바꿀 수 있고\n옵션 금액까지 자동으로 계산돼요.",
  },
  {
    selectors: ['[data-coach="cart-options"]'],
    title: "옵션 선택",
    body: "쇼핑백·수명연장제·메시지 카드 중\n사장님이 활성화한 옵션을 손님이 선택해요.\n카드 문구도 함께 받아 그대로 사용하면 돼요.",
  },
];

// 손님 화면 바로 예약 코치마크 — 상품 상세에서 수량 2개 이상으로 '바로 예약하기'를 누르면 오는 화면
export default function DirectOrderCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_direct"
      intro={{
        title: "바로 예약 화면이에요",
        body: "상품 상세에서 2개 이상 고르고 바로 예약하면\n장바구니를 거치지 않고 이 화면으로 와요.\n장바구니에 담아둔 상품과는 따로 주문돼요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 눌러보세요",
        body: "손님이 된 것처럼 수량과 옵션을 바꿔보세요.\n미리보기라 실제로 저장되거나 주문되지는 않아요.",
      }}
    />
  );
}
