"use client";

import PreviewCoach, { type CoachStep } from "../../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="cart-options"]'],
    title: "옵션 선택",
    body: "쇼핑백·수명연장제·메시지 카드 중\n사장님이 활성화한 옵션을 손님이 선택해요.\n카드 문구도 함께 받아 그대로 사용하면 돼요.",
  },
  {
    selectors: ['[data-coach="cart-qty"]'],
    title: "수량 변경",
    body: "손님이 장바구니에서도 수량을 바꿀 수 있어요.\n옵션 금액까지 자동으로 계산돼요.",
  },
];

// 손님 화면 장바구니 코치마크
export default function CartCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_cart"
      intro={{
        title: "장바구니 화면이에요",
        body: "손님이 상품을 담았을 때 보는 화면이에요.\n상품 2개를 미리 담아뒀어요.\n주요 기능 2가지를 알려드릴게요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 눌러보세요",
        body: "손님이 된 것처럼 수량과 옵션을 바꿔보세요.\n미리보기라 실제로 저장되거나 주문되지는 않아요.",
      }}
    />
  );
}
