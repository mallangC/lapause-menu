"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

/** 미리보기 상품 추가 창을 열고 닫는다 (detail: true / false) */
export const PD_FORM_EVENT = "preview-pd-form";

const send = (open: boolean) => window.dispatchEvent(new CustomEvent(PD_FORM_EVENT, { detail: open }));

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="pd-add"]'],
    onEnter: () => send(false),
    title: "상품 추가",
    body: "메뉴판에 올릴 상품을 여기서 등록해요.\n등록하자마자 손님 메뉴판에 바로 보여요.",
  },
  {
    // 상품 유형 ~ 시즌 묶음만 강조 (추가 창 전체를 덮지 않게)
    selectors: ['[data-coach="pd-classify"]'],
    radius: 0,
    pad: 0,
    onEnter: () => {
      send(true);
      setTimeout(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('[data-coach="pd-classify"]')).find((e) => e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: "center" });
      }, 200);
    },
    title: "상품 정보 입력",
    body: "상품 정보를 작성하며 어울리는 키워드를 골라요.\n선택한 키워드는 손님 메뉴판의 필터와\n맞춤주문 추천에도 사용돼요.",
  },
  {
    selectors: ['[data-coach="pd-toggle"]'],
    // 반짝이는 점이 노출 스위치와 겹쳐서 오른쪽 위로 비켜 놓는다
    dotShift: [6, -8],
    onEnter: () => send(false),
    title: "노출 켜기 · 끄기",
    body: "버튼으로 노출을 비활설화 하면\n바로 손님 메뉴판에서 바로 숨겨져요.\n재료가 떨어지거나 시즌이 지난 상품을\n지우지 않고 잠깐 내릴 때 사용해요.",
  },
];

// 미리보기에서 뺀 설명 — 가입 후 온보딩에서 다시 쓸 수 있게 남겨 둠
export const PRODUCT_EXTRA_STEPS: CoachStep[] = [
  {
    // 뱃지 줄만 강조 — 추가 옵션('추가 불가')은 미리보기에서 설명하지 않는다
    selectors: ['[data-coach="pd-badge"]'],
    radius: 0,
    pad: 12,
    onEnter: () => {
      send(true);
      setTimeout(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('[data-coach="pd-badge"]')).find((e) => e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: "center" });
      }, 200);
    },
    title: "인기 · 추천 배지",
    body: "인기·추천 배지를 달아 팔고 싶은 상품을 메뉴판에서 강조할 수 있어요.",
  },
  {
    selectors: ['[data-coach="pd-options"]'],
    radius: 0,
    pad: 0,
    onEnter: () => {
      send(true);
      // 추가 창 안에서 아래쪽 '뱃지 & 옵션' 칸이 보이도록 창 안을 스크롤
      setTimeout(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('[data-coach="pd-options"]')).find((e) => e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: "center" });
      }, 200);
    },
    title: "뱃지 · 추가 옵션 설정",
    body: "인기·추천 배지를 달아 메뉴판에서 강조할 수 있어요.\n이미 포함됐거나 필요 없는 옵션은\n'추가 불가'로 손님이 고르지 못하게 해요.",
  },
];

// 사장님 화면 상품 관리 코치마크
export default function ProductsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_products"
      intro={{
        title: "상품 관리 화면이에요",
        body: "손님 메뉴판에 보이는 상품을 여기서 관리해요.\n추가·수정한 내용은 메뉴판에 바로 반영돼요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 눌러보세요",
        body: "상품을 추가하거나 노출을 껐다 켜보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
