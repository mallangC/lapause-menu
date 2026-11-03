"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

// 코치마크가 설정 하위 메뉴를 설명할 때 미리보기 대시보드의 설정 메뉴를 펼치게 하는 이벤트
export const OWNER_SETTINGS_OPEN_EVENT = "preview-owner-settings-open";

// 탭 버튼 — 모바일(상단 탭)·PC(왼쪽 메뉴) 중 화면에 보이는 쪽을 강조한다
const tab = (key: string) => [`[data-coach="own-tab-${key}"]`];

// 모바일 탭 줄은 가로로 스크롤돼서, 화면 밖에 밀려 있는 탭을 가운데로 끌어온다
const revealTab = (key: string) => {
  document.querySelectorAll<HTMLElement>(`[data-coach="own-tab-${key}"]`).forEach((el) => {
    let row = el.parentElement;
    while (row && row.scrollWidth <= row.clientWidth) row = row.parentElement;
    if (!row || row === document.body || row === document.documentElement) return;
    const offset = el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    row.scrollLeft = offset - (row.clientWidth - el.offsetWidth) / 2;
  });
};

// 설정 메뉴를 펼치고 하위 탭을 화면 안으로 끌어온다
const openSettings = (key: string) => () => {
  window.dispatchEvent(new Event(OWNER_SETTINGS_OPEN_EVENT));
  revealTab(key);
};

// 탭 설명은 한 줄로 짧게 — 각 탭에 들어가면 그 화면 설명이 따로 나온다
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="own-link"]'],
    pad: 0,
    title: "링크 공유",
    body: "손님에게 보낼 우리 매장 메뉴판 주소예요.\n사장님이 사용하는 온라인 채널에\nURL 복사해서 사용하면 \n손님 유입 경로를 '통계'에서 확인할 수 있어요",
  },
  {
    selectors: ['[data-coach="own-today"]'],
    pad: 0,
    title: "오늘 예약 정보",
    body: "오늘 수령 예정인 예약을 시간순으로 보여줘요.\n아직 확인하지 않은 예약과 준비 중인 예약을\n예약 상태별로 구분해서 확인해요.",
  },
  {
    selectors: tab("reservations"),
    pad: 0,
    onEnter: () => revealTab("reservations"),
    title: "예약 관리",
    body: "들어온 예약을 한곳에서 관리해요.",
  },
  {
    selectors: tab("products"),
    pad: 0,
    onEnter: () => revealTab("products"),
    title: "상품 관리",
    body: "메뉴판에 올릴 상품을 등록하고 관리해요.",
  },
  {
    selectors: tab("stats"),
    pad: 0,
    onEnter: () => revealTab("stats"),
    title: "통계",
    body: "매출과 손님이 들어온 경로 등을 숫자로 확인해요.",
  },
];

// 미리보기에서 뺀 대시보드 설명(예약 현황·기능 현황) — 가입 후 온보딩에서 다시 쓸 수 있게 남겨 둠
export const DASHBOARD_EXTRA_STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="own-counts"]'],
    pad: 0,
    title: "예약 현황",
    body: "이번 달 예약을 상태별로 나눠 보여줘요.\n숫자를 누르면 그 상태의 예약만 모아서\n바로 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="own-features"]'],
    noDot: true,
    pad: 0,
    title: "기능 현황",
    body: "주요 기능이 켜져 있는지 한눈에 확인해요.\n설정을 누르면 바로 켜고 끌 수 있어요.",
  },
];

// 설정 메뉴 설명 — 미리보기에서는 설정 메뉴를 열지 않아 빼 두었다. 가입 후 온보딩에서 다시 쓸 예정
export const SETTINGS_STEPS: CoachStep[] = [
  {
    selectors: tab("business"),
    pad: 0,
    onEnter: openSettings("business"),
    title: "설정 · 영업 설정",
    body: "손님이 예약할 수 있는 날짜와 시간을 정해요.",
  },
  {
    selectors: tab("ordersettings"),
    pad: 0,
    onEnter: openSettings("ordersettings"),
    title: "설정 · 판매 신청",
    body: "온라인 주문·결제를 위해 플로에이드에 판매 신청해요.",
  },
  {
    selectors: tab("reservation"),
    pad: 0,
    onEnter: openSettings("reservation"),
    title: "설정 · 판매 설정",
    body: "손님 주문·판매에 필요한 기능을 설정해요.",
  },
  {
    selectors: tab("menusettings"),
    pad: 0,
    onEnter: openSettings("menusettings"),
    title: "설정 · 메뉴 설정",
    body: "메뉴판을 우리 매장에 맞게 구성해요.",
  },
  {
    selectors: tab("settings"),
    pad: 0,
    onEnter: openSettings("settings"),
    title: "설정 · 디자인",
    body: "메뉴판을 우리 매장 분위기에 맞게 꾸며요.",
  },
  {
    selectors: tab("myinfo"),
    pad: 0,
    onEnter: openSettings("myinfo"),
    title: "설정 · 내 정보",
    body: "계정 정보와 로그인 보안을 관리해요.",
  },
];

// 사장님 화면 대시보드 코치마크
export default function DashboardCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_dashboard"
      intro={{
        title: "사장님 관리자 화면이에요",
        body: "들어온 예약 확인부터 상품·매장 설정까지\n여기서 모두 관리해요.\n지금 보이는 매장과 예약은 모두 예시예요.",
      }}
      steps={STEPS}
      outro={{
        title: "이제 직접 둘러보세요",
        body: "숫자와 메뉴를 눌러 화면을 옮겨 다녀 보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
