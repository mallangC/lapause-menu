"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    // 두 번째 상품 — 첫 번째보다 화면 가운데에 가까워 눈에 잘 띈다
    selectors: ["[data-product-card]:nth-child(2)", "[data-product-card]"],
    // 상품 카드 모양 그대로 — 여백 없이 네모로 딱 맞게
    radius: 0,
    pad: 0,
    title: "상품 보기",
    body: "사장님이 등록한 상품이 사진과 함께 보여요.\n손님은 상품을 눌러 자세히 보고\n바로 예약까지 할 수 있어요.",
  },
  {
    selectors: ['button[aria-label="필터"]'],
    title: "필터",
    body: "상품을 등록할 때 넣은 꽃 색상·포장지·분위기로\n손님이 원하는 꽃만 골라볼 수 있어요.",
  },
  {
    selectors: ['a[aria-label="맞춤주문"]', 'header a[href$="/consult"]'],
    title: "맞춤주문",
    body: "손님이 선물 목적·분위기·예산을 고르면\n사장님 상품 중 어울리는 꽃을 추천해 줘요.\n상담 없이도 예약·결제까지 받을 수 있어요.",
  },
  {
    selectors: ['header a[href$="/cart"]'],
    title: "장바구니",
    body: "손님이 여러 상품을 담아 한 번에 주문해요.\n사장님은 예약 한 건으로 모아서 받아요.",
  },
  {
    selectors: ['button[aria-label="메뉴 열기"]'],
    title: "메뉴",
    body: "꽃다발·꽃바구니 같은 종류별, 시즌별로\n상품이 자동으로 나뉘어 보여요.\n사장님이 메뉴를 따로 만들 필요가 없어요.",
  },
  {
    selectors: ['[data-coach="home-footer"]'],
    // 설명이 끝난 뒤 점은 유튜브 버튼 오른쪽 위에 (푸터 전체 오른쪽 끝은 너무 멀다)
    dot: ['[data-coach="home-footer-dot"]'],
    title: "매장 링크 · 사업자 정보",
    body: "사장님의 매장과 관련된 링크가 버튼으로 보여요.\n손님은 버튼을 눌러서 길을 찾거나 문의할 수 있어요.\n사업자 정보와 환불 정책도 자동으로 들어가요.",
  },
];

// 손님 화면 홈(메뉴판) 코치마크
export default function CustomerHomeCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_home"
      intro={{
        title: "손님이 보는 메뉴판이에요",
        body: "사장님 매장의 손님이 보게 될 화면이에요.\n손님은 앱 설치 없이 링크 하나로 들어와요.\n주요 기능 6가지를 알려드릴게요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 눌러보세요",
        body: "손님이 된 것처럼 반짝이는 곳을 눌러보세요.\n아래 버튼으로 언제든 처음으로 돌아올 수 있어요.",
      }}
    />
  );
}
