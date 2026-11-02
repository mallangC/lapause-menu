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

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="own-link"]'],
    title: "링크 공유",
    body: "손님에게 보낼 우리 매장 메뉴판 주소예요.\nURL 복사 버튼을 눌러 카카오톡·인스타그램 등\n올릴 곳을 고르면 어느 채널에서 손님이 왔는지\n통계에서 볼 수 있어요.",
  },
  {
    selectors: ['[data-coach="own-today"]'],
    title: "오늘 처리할 예약",
    body: "오늘 수령 예정인 예약을 시간순으로 보여줘요.\n아직 확인하지 않은 예약과 준비 중인 예약을\n상태별 색으로 바로 구분할 수 있어요.",
  },
  {
    selectors: ['[data-coach="own-counts"]'],
    title: "예약 현황",
    body: "이번 달 예약을 미확인·준비중·완료·취소로\n나눠 보여줘요. 숫자를 누르면 그 상태의\n예약만 모아서 바로 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="own-features"]'],
    title: "기능 현황",
    body: "맞춤 주문·배송·메시지 카드·쇼핑백·수명연장제\n설정이 켜져 있는지 한눈에 확인해요.\n설정을 누르면 바로 켜고 끌 수 있어요.",
  },
  {
    selectors: tab("reservations"),
    onEnter: () => revealTab("reservations"),
    title: "예약 관리",
    body: "들어온 예약을 달력과 목록으로 보고\n확인한 뒤 확정하거나 취소해요.\n확정·취소하면 손님에게 알림톡이 자동으로 가고,\n전화로 받은 예약도 직접 추가할 수 있어요.",
  },
  {
    selectors: tab("products"),
    onEnter: () => revealTab("products"),
    title: "상품 관리",
    body: "메뉴판에 올릴 상품을 사진·가격과 함께 등록하고\n수정해요. 노출·숨김 상태를 바꾸면\n손님 메뉴판에 바로 반영돼요.",
  },
  {
    selectors: tab("stats"),
    onEnter: () => revealTab("stats"),
    title: "통계",
    body: "월별 매출 추이, 잘 팔리는 상품, 선물 목적·예산대, \n유입 채널별 방문·주문까지 한눈에 봐요.\n전략적으로 숫자를 보고 다음 달에 어떤 상품을 늘리고\n어디에 홍보할지 정해 보세요.",
  },
  {
    selectors: tab("business"),
    onEnter: openSettings("business"),
    title: "설정 · 영업 설정",
    body: "요일별 영업시간과 휴무일, 특정 날짜의 영업시간,\n상품 유형별 최소 준비 시간을 정해요.\n손님은 이 안에서만 예약 날짜·시간을 고를 수 있어요.",
  },
  {
    selectors: tab("ordersettings"),
    onEnter: openSettings("ordersettings"),
    title: "설정 · 판매 신청",
    body: "결제를 받으려면 매장 연락처·주소, 계좌·통장사본,\n사업자 정보를 입력해 판매를 신청해요.\n승인되면 판매 설정에서 기능을 켤 수 있어요.",
  },
  {
    selectors: tab("reservation"),
    onEnter: openSettings("reservation"),
    title: "설정 · 판매 설정",
    body: "맞춤 주문 판매를 켜고 끄고, 배송과 거리별 배송비,\n메시지 카드·쇼핑백·수명연장제 옵션과 가격,\n결제 전 손님에게 보여줄 안내 문구를 정해요.",
  },
  {
    selectors: tab("menusettings"),
    onEnter: openSettings("menusettings"),
    title: "설정 · 메뉴 설정",
    body: "메뉴판의 상품 종류·계절 분류를\n우리 매장에 맞게 직접 추가하거나 삭제해요.",
  },
  {
    selectors: tab("settings"),
    onEnter: openSettings("settings"),
    title: "설정 · 디자인",
    body: "메뉴판의 배경색과 포인트색을 골라\n우리 매장 분위기에 맞게 꾸며요.\n고른 색은 손님 메뉴판 전체에 바로 반영돼요.",
  },
  {
    selectors: tab("myinfo"),
    onEnter: openSettings("myinfo"),
    title: "설정 · 내 정보",
    body: "전화번호와 비밀번호를 바꾸고, 소셜 계정 연결과\n로그인 2단계 인증으로 계정을 안전하게 지켜요.",
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
