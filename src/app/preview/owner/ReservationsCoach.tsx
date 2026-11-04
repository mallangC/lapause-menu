"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

// 코치마크가 미리보기 예약 관리 화면을 조작하는 이벤트
/** 오늘 예약 중 detail 시간(예: "18:00")의 예약을 펼친다 (모바일은 상세 창을 연다) */
export const RV_OPEN_EVENT = "preview-rv-open";
/** 모바일 상세 창을 닫는다 */
export const RV_CLOSE_EVENT = "preview-rv-close";
/** 결제 링크 창을 열고 닫는다 (detail: { time, open }) */
export const RV_PAYLINK_EVENT = "preview-rv-paylink";
/** 예약 추가 창을 열고 닫는다 (detail: true / false) */
export const RV_ADD_EVENT = "preview-rv-add";
/** 오늘 detail 시간 예약자의 손님 정보 창을 연다 (null이면 닫는다) */
export const RV_PROFILE_EVENT = "preview-rv-profile";
/** 상태 필터·검색·보는 달을 처음(이번 달 전체)으로 되돌린다 — 대시보드 예약 현황 숫자로 걸러진 채 들어와도 설명이 같은 화면에서 진행되게 */
export const RV_RESET_EVENT = "preview-rv-reset";

const send = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const isMobile = () => window.innerWidth < 768;

// 창(모달) 안에서 설명할 부분이 보이도록 그 창 안을 스크롤한다
const revealInside = (coach: string) =>
  setTimeout(() => {
    const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-coach="${coach}"]`)).find((e) => e.getBoundingClientRect().width > 0);
    el?.scrollIntoView({ block: "center" });
  }, 200);

// 열려 있을 수 있는 창(결제 링크·예약 추가)을 닫는다
const closeModals = () => {
  send(RV_PAYLINK_EVENT, { time: "15:30", open: false });
  send(RV_ADD_EVENT, false);
  send(RV_PROFILE_EVENT, null);
};

// 상세를 펼친 뒤, 모바일 상세 창 안에서 설명할 부분이 보이도록 창 안을 스크롤한다
// 오늘 예약: 18:00 배주원(미확인) · 15:30 류현우(준비중·미결제)
const openAndReveal = (time: string, coach: string) => () => {
  closeModals();
  send(RV_OPEN_EVENT, time);
  if (isMobile()) revealInside(coach);
};

// 화면 위쪽 기능을 설명할 때는 모바일 상세 창·열린 창을 닫는다
const resetView = () => {
  closeModals();
  send(RV_CLOSE_EVENT);
};

// 예약 추가 창을 열고 그 안의 설명할 부분을 보여준다
const openAdd = (coach: string) => () => {
  send(RV_CLOSE_EVENT);
  send(RV_ADD_EVENT, true);
  revealInside(coach);
};

// 반짝이는 점은 버튼·글자를 가리지 않게 모두 오른쪽 위로 조금씩 비켜 놓는다(dotShift)
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="rv-confirm"]'],
    dotShift: [6, -8],
    // 첫 단계 — 걸려 있던 상태 필터를 풀고 이번 달 전체 보기로 되돌린 뒤 시작
    onEnter: () => {
      send(RV_RESET_EVENT);
      openAndReveal("18:00", "rv-confirm")();
    },
    title: "예약 확정 · 취소",
    body: "신규 예약은 사장님에게 알림톡으로 알려드려요.\n예약을 확정하면 손님에게도 자동으로 알림톡이 가요.\n취소할 때 사유를 적으면 자동으로 환불되고,\n그 사유가 손님에게 알림톡으로 전달돼요.",
  },
  {
    selectors: ['[data-coach="rv-paylink"]'],
    pad: 0,
    // 버튼 모서리(rounded-lg, 8px)에 맞춘 둥글기
    radius: 8,
    dotShift: [6, -8],
    onEnter: openAndReveal("15:30", "rv-paylink"),
    title: "링크 결제",
    body: "방문 결제가 어려운 손님에게 링크를 보내면\n손님은 링크를 눌러 결제할 수 있어요\n예약 추가할 때 결제 상태를 '미결제'로 두면\n링크 결제 만들기 버튼이 생겨요.\n(링크 결제 완료 시 사장님께 알림톡으로 알려드려요)",
  },
  {
    // 오후 3시 30분 류현우 예약의 이름 버튼 — PC는 표의 이름, 모바일은 예약 상세 창 위쪽 이름
    selectors: ['[data-coach="rv-profile-name"][data-rv-time="15:30"]', '[data-coach="rv-profile-name-m"]'],
    dotShift: [6, -8],
    radius: 0,
    pad: 10,
    // 모바일: 이름 버튼 모양대로 둥근 모서리, 여백 없이
    mobileRadius: 8,
    mobilePad: 0,
    onEnter: () => {
      resetView();
      send(RV_OPEN_EVENT, "15:30");
    },
    title: "단골 손님 정보",
    body: "예약자 이름을 누르면 손님의 이전 주문 정보를\n확인할 수 있어요. (주문 횟수, 누적 금액 등)\n손님 취향을 메모해 두면 다음 주문 때 참고할 수 있어요",
  },
  {
    selectors: ['[data-coach="add-paste"]'],
    dotShift: [6, -8],
    radius: 0,
    pad: 0,
    onEnter: openAdd("add-paste"),
    title: "네이버 예약 자동 입력",
    body: "네이버 예약 내용을 복사해 붙여 넣으면\n이름·예약날짜·상품 같은 항목이 자동으로 채워져요.\n하나하나 옮겨 적지 않아도 돼요.",
  },
];

// 미리보기에서 뺀 설명 — 가입을 고민하는 사장님에게 꼭 필요한 4가지만 남기고 뺐다. 가입 후 온보딩에서 다시 쓸 수 있게 남겨 둠
export const RESERVATION_EXTRA_STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="rv-unconfirmed"]'],
    dotShift: [6, -8],
    radius: 0,
    pad: 0,
    onEnter: resetView,
    title: "새로 들어온 예약",
    body: "손님이 결제를 마친 예약은 '미확인'상태로 들어와\n빨간 줄로 표시되고 목록 맨 위로 올라와요.\n카카오 알림톡으로도 바로 알려드려요.",
  },
  {
    // 주문자 정보부터 배송 정보까지 (PC는 왼쪽 상품 사진 칸도 함께)
    selectors: ['[data-coach="rv-detail"]'],
    noDot: true,
    also: ['[data-coach="rv-detail-image"]'],
    // 글자 덩어리라 딱 붙으면 답답해서 여백을 넉넉히
    radius: 0,
    pad: 12,
    onEnter: openAndReveal("15:30", "rv-detail"),
    title: "예약 상세",
    body: "제작에 필요한 주문 정보가 한곳에 모여요.\n복사 버튼으로 바로 옮겨 적을 수 있어요.",
  },
  {
    selectors: ['[data-coach="rv-status"]'],
    dotShift: [6, -8],
    onEnter: openAndReveal("15:30", "rv-status"),
    title: "상태 변경",
    body: "확정한 예약은 준비중 → 제작완료 →\n픽업/배송완료로 진행 상황에 맞게 변경할 수 있어요.",
  },
  {
    selectors: ['[data-coach="rv-add"]'],
    dotShift: [6, -8],
    onEnter: resetView,
    title: "예약 추가",
    body: "전화·카카오톡·매장에서 받은 예약도\n여기서 직접 등록해서 한곳에서 관리할 수 있어요.",
  },
];

// 사장님 화면 예약 관리 코치마크 — 처리 흐름(미확인 → 확정 → 상세 → 상태)부터, 그다음 위쪽 보조 기능
export default function ReservationsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_reservations"
      intro={{
        title: "예약 관리 화면이에요",
        body: "온라인 주문은 물론 전화·카톡·매장 예약까지\n여기 한곳에서 확인하고 처리해요.\n오늘(11월 10일) 예약으로 하나씩 알려드릴게요.",
      }}
      steps={STEPS}
      // 설명이 끝나면(마지막 '네이버 예약 자동 입력' 단계에서 열어 둔) 예약 추가 창·상세 창을 닫는다
      onFinish={() => { closeModals(); send(RV_CLOSE_EVENT); }}
      outro={{
        title: "직접 눌러보세요",
        body: "예약을 눌러 펼치고 상태를 바꿔보세요.\n미리보기라 손님에게 알림이 가거나\n실제로 저장되지는 않아요.",
      }}
    />
  );
}
