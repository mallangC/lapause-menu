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
    onEnter: () => {
      send(true);
      setTimeout(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('[data-coach="pd-classify"]')).find((e) => e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: "center" });
      }, 200);
    },
    title: "상품 정보 입력",
    body: "사진·이름·가격을 넣고 종류, 꽃 색상, 포장지,\n분위기, 시즌을 골라요. 고른 분류는 손님 메뉴판의\n필터와 맞춤주문 추천에 그대로 쓰여요.",
  },
  {
    selectors: ['[data-coach="pd-options"]'],
    onEnter: () => {
      send(true);
      // 추가 창 안에서 아래쪽 '뱃지 & 옵션' 칸이 보이도록 창 안을 스크롤
      setTimeout(() => {
        const el = Array.from(document.querySelectorAll<HTMLElement>('[data-coach="pd-options"]')).find((e) => e.getBoundingClientRect().width > 0);
        el?.scrollIntoView({ block: "center" });
      }, 200);
    },
    title: "뱃지 · 추가 옵션 설정",
    body: "원하는 상품에 인기·추천 배지를 달아\n메뉴판에서 눈에 띄게 할 수 있어요.\n추가 옵션 '추가 불가'를 체크해\n손님이 해당 옵션을 추가하지 못하게 막아요.\n(쇼핑백이 포함된 상품, 메시지카드를 활용 불가, 생화 수명 연장제가 불필요한 상황을 위한 설정)",
  },
  {
    selectors: ['[data-coach="pd-filter"]'],
    onEnter: () => send(false),
    title: "필터",
    body: "상품이 많아도 종류·인기·추천·노출 여부로\n골라 보고, 최신순·가격순으로 정렬해\n원하는 상품을 쉽게 찾을 수 있어요.",
  },
  {
    selectors: ['[data-coach="pd-toggle"]'],
    onEnter: () => send(false),
    title: "노출 켜기 · 끄기",
    body: "끄면 손님 메뉴판에서 바로 숨겨져요.\n재료가 떨어지거나 시즌이 지난 상품을\n지우지 않고 잠깐 내릴 때 써요.",
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
