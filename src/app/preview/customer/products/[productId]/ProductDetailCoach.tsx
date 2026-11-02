"use client";

import PreviewCoach, { type CoachStep } from "../../../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    // 상품명·가격부터 꽃 색상·포장지·시즌, 수량까지 한 번에 감싼다
    selectors: ['[data-coach="detail-info"]'],
    also: ['[data-coach="detail-qty"]'],
    title: "가격 · 설명 · 수량",
    body: "사장님이 등록한 가격과 꽃 색상·포장지·시즌이\n그대로 보여요. 손님이 수량을 고르면\n합계 금액이 바로 계산돼요.",
  },
  {
    selectors: ['[data-coach="detail-cart"]'],
    title: "장바구니 담기",
    body: "손님이 수량을 고르고 장바구니에 담아요.\n여러 상품을 한 번에 주문할 수 있어\n주문 금액이 커질 수 있어요.",
  },
  {
    selectors: ['[data-coach="detail-reserve"]'],
    title: "바로 예약하기",
    body: "손님이 고른 수량만큼 바로 예약해요.\n받는 날짜·방법을 정하고 결제까지 마치면\n사장님께 예약이 들어와요.",
  },
  {
    // 제목 + 첫 줄 상품만 감싼다 (모바일에서 영역이 너무 길어지지 않게)
    selectors: ['[data-coach="detail-suggest"] h2'],
    also: ['[data-coach="detail-suggest-item"]'],
    title: "이런 상품은 어떠세요?",
    body: "가격대와 꽃 색상이 비슷한 상품을 자동으로 추천해요.\n손님이 사장님의 다른 상품도\n자연스럽게 둘러보게 돼요.",
  },
];

// 손님 화면 상품 상세 코치마크
export default function ProductDetailCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_detail"
      intro={{
        title: "상품 상세 화면이에요",
        body: "손님이 메뉴판에서 상품을 누르면 보는 화면이에요.\n주요 기능 4가지를 알려드릴게요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 눌러보세요",
        body: "손님이 된 것처럼 수량을 바꾸고 버튼도 눌러보세요.\n미리보기라 실제로 담기거나 주문되지는 않아요.",
      }}
    />
  );
}
