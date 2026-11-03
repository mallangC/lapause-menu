"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="ds-bg"]'],
    pad: 12,
    // 모바일: 네모, 좌우는 카드 여백(16px)만큼 넓혀 화면 끝까지
    mobileRadius: 0,
    mobilePadX: 16,
    title: "배경색",
    body: "손님 메뉴판 전체의 바탕 색이에요.\n색 하나만 고르면 나머지 색도\n자동으로 어울리게 맞춰져요.",
  },
  {
    selectors: ['[data-coach="ds-accent"]'],
    pad: 12,
    // 모바일: 네모, 좌우는 카드 여백(16px)만큼 넓혀 화면 끝까지
    mobileRadius: 0,
    mobilePadX: 16,
    title: "포인트색",
    body: "버튼과 강조 글씨에 쓰이는 색이에요.\n매장 간판이나 로고 색을 넣으면\n메뉴판이 한눈에 우리 매장처럼 보여요.",
  },
  {
    selectors: ['[data-coach="ds-preview"]'],
    pad: 0,
    title: "미리보기",
    body: "고른 색이 메뉴판에서 어떻게 보이는지\n간단히 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="ds-reset"]'],
    title: "기본값으로",
    body: "마음에 들지 않으면 언제든\nFlo.Aide 기본 색으로 되돌릴 수 있어요.",
  },
];

// 사장님 화면 디자인 코치마크 (저장 버튼 설명은 온보딩에서)
export default function DesignCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_design"
      intro={{
        title: "디자인 화면이에요",
        body: "색 두 가지만 바꿔도 손님 메뉴판에\n우리 매장만의 분위기를 담을 수 있어요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 바꿔보세요",
        body: "색을 눌러 바꾸고 미리보기를 확인해보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
