"use client";

import PreviewCoach, { type CoachStep } from "../../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="cart-options"]'],
    title: "옵션 선택",
    body: "쇼핑백·수명연장제·메시지 카드 중 사장님이\n켜둔 옵션을 손님이 상품마다 골라요.\n카드 문구도 함께 받아 그대로 사용하면 돼요.",
  },
  {
    selectors: ['[data-coach="cart-qty"]'],
    title: "수량 변경",
    body: "손님이 장바구니에서도 수량을 바꿀 수 있어요.\n옵션 금액까지 자동으로 다시 계산돼요.",
  },
  {
    selectors: ['[data-coach="cart-order"]'],
    title: "주문하기",
    body: "손님이 체크한 상품을 한 번에 예약해요.\n결제까지 마치면 사장님께 예약 한 건으로\n상품·옵션·카드 문구가 모두 전달돼요.",
  },
];

// 손님 화면 장바구니 코치마크
export default function CartCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_cart"
      intro={{
        title: "장바구니 화면이에요",
        body: "손님이 상품을 담았을 때 보는 화면이에요.\n상품 2개를 미리 담아뒀어요.\n주요 기능 3가지를 알려드릴게요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 눌러보세요",
        body: "손님이 된 것처럼 수량과 옵션을 바꿔보세요.\n미리보기라 실제로 저장되거나 주문되지는 않아요.",
      }}
    />
  );
}
