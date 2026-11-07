"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

// 손님 화면 첫 페이지(대화형 상담) 코치마크 — 처음 나오는 주문 방법 4가지만 설명하고 직접 해보게 한다
// (설명은 가입을 고민하는 사장님이 보는 것이라, 사장님에게 좋은 점 위주로)
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="welcome-opt-style"]'],
    radius: 16,
    title: "사장님 스타일로 알아서",
    body: "선물 정보·형태·분위기·예산만 받고\n사장님이 알아서 만드는 주문이에요.\n상품을 따로 등록하지 않아도 받을 수 있어요.",
  },
  {
    selectors: ['[data-coach="welcome-opt-recommend"]'],
    radius: 16,
    title: "추천받기",
    body: "몇 가지 질문에 답하면 사장님 상품 중\n어울리는 꽃을 대화창에서 바로 추천해요.\n손님이 고르면 바로 예약·결제로 이어져요.",
  },
  {
    selectors: ['[data-coach="welcome-opt-photo"]'],
    radius: 16,
    title: "찾아본 사진으로 주문",
    body: "손님이 찾아본 사진으로 주문을 받아요.\n보낸 사진은 예약 상세에서 볼 수 있어요.",
  },
  {
    selectors: ['[data-coach="welcome-opt-menu"]'],
    radius: 16,
    title: "메뉴판에서 고르기",
    body: "사장님이 올린 상품을 사진으로 보고\n손님이 직접 골라 예약해요.",
  },
];

export default function WelcomeCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_customer_welcome"
      intro={{
        title: "채팅으로 상담하는 첫 화면이에요",
        body: "손님이 링크로 들어오면 가장 먼저 보는 화면이에요.\n꽃집과 메시지를 주고받듯 주문 방법을 고르고,\n대화를 이어가며 주문까지 받아요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 상담해 보세요",
        body: "손님이 된 것처럼 하나를 골라 상담해 보세요.\n상단에 로고를 누르면 처음부터 다시 시작해요.\n미리보기라 실제로 주문되지는 않아요.",
      }}
    />
  );
}
