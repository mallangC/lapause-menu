"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="mn-all"]'],
    title: "상품 유형 · 시즌 메뉴",
    body: "손님 메뉴판에 보이는 상품 유형과 시즌 메뉴를\n우리 매장에 맞게 직접 만들 수 있어요.\n+로 자유롭게 추가하고 ×로 삭제하며,\n기본으로 들어 있는 항목도 지울 수 있어요.",
  },
];

// 사장님 화면 메뉴 설정 코치마크 — 한 번에 설명
export default function MenuSettingsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_menu"
      intro={{
        title: "메뉴 설정 화면이에요",
        body: "손님 메뉴판의 분류를 정하는 곳이에요.\n꽃다발·꽃바구니 같은 상품 유형과\n어버이날·크리스마스 같은 시즌 메뉴를 관리해요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 바꿔보세요",
        body: "+를 눌러 새 분류를 만들거나 ×로 지워보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
