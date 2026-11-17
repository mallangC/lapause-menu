"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

// 손님 화면 첫 페이지(대화형 상담) 코치마크 — 처음 나오는 주문 방법 4가지만 설명하고 직접 해보게 한다
// (설명은 가입을 고민하는 사장님이 보는 것이라, 사장님에게 좋은 점 위주로)
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="welcome-opt-style"]'],
    radius: 16,
    title: "사장님 스타일로 예쁘게",
    body: "손님이 선택한 예산과 선물 용도에 맞춰\n사장님이 예쁘게 만들어드릴 수 있는 주문이에요",
  },
  {
    selectors: ['[data-coach="welcome-opt-recommend"]'],
    radius: 16,
    title: "추천받기",
    body: "손님에게 예산과 선물 용도를 물어보고 사장님이 등록한\n상품 중에 금액대에 맞는 상품으로 추천해드려요\n마음에 드는 상품이 없다면 새로 추천도 가능해요",
  },
  {
    selectors: ['[data-coach="welcome-opt-photo"]'],
    radius: 16,
    title: "찾아본 사진으로 주문",
    body: "손님이 찾아보신 이미지와 희망 예산을 바탕으로\n맞춤 제작이 가능해요\n첨부한 사진은 예약 상세에서 확인할 수 있어요",
  },
  {
    selectors: ['[data-coach="welcome-opt-menu"]'],
    radius: 16,
    title: "메뉴판에서 고르기",
    body: "사장님이 등록한 상품 사진과 금액을 보고\n손님이 직접 골라 예약할 수 있어요",
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
        title: "상담 과정을 체험해 보세요",
        body: "손님 입장에서 상담이 어떻게 진행되는지 직접 경험해 보세요.\n상단 로고를 누르면 처음부터 다시 시작해요.\n미리보기라 실제로 주문되지는 않아요.",
      }}
    />
  );
}
