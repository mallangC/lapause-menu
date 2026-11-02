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

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="rv-unconfirmed"]'],
    onEnter: resetView,
    title: "새로 들어온 예약",
    body: "손님이 결제를 마친 예약은 '미확인'으로 들어와\n빨간 줄로 표시되고 목록 맨 위로 올라와요.\n카카오 알림톡으로도 바로 알려드려요.",
  },
  {
    selectors: ['[data-coach="rv-confirm"]'],
    onEnter: openAndReveal("18:00", "rv-confirm"),
    title: "예약 확정 · 취소",
    body: "예약을 확인하고 확정하면 손님에게\n확정 알림톡이 자동으로 가요.\n취소할 때는 사유를 적으면 자동으로 환불되고,\n그 사유가 손님에게 알림톡으로 전달돼요.",
  },
  {
    // 주문자 정보부터 배송 정보까지 (PC는 왼쪽 상품 사진 칸도 함께)
    selectors: ['[data-coach="rv-detail"]'],
    also: ['[data-coach="rv-detail-image"]'],
    onEnter: openAndReveal("15:30", "rv-detail"),
    title: "예약 상세",
    body: "연락처, 상품, 메시지 카드 문구, 선물 용도,\n배송지와 요청 사항까지 제작에 필요한 정보가\n한곳에 모여요. 복사 버튼으로 바로 옮겨 적어요.",
  },
  {
    selectors: ['[data-coach="rv-paylink"]'],
    onEnter: openAndReveal("15:30", "rv-paylink"),
    title: "링크 결제",
    body: "전화·카카오톡·매장에서 받은 주문처럼\n손님이 아직 결제하지 않은 예약에 사용해요.\n예약 추가할 때 결제 상태를 '미결제'로 두면\n링크 결제 만들기 버튼이 생겨요.",
  },
  {
    selectors: ['[data-coach="rv-paylink-modal"]'],
    onEnter: () => {
      openAndReveal("15:30", "rv-paylink")();
      setTimeout(() => send(RV_PAYLINK_EVENT, { time: "15:30", open: true }), 50);
    },
    title: "결제 링크 만들기",
    body: "링크 만료 시간을 고르고 '링크 생성'을 누르면\n결제 금액이 담긴 결제 링크가 만들어져요.\n카카오톡·문자로 보내면 손님이 바로 결제하고,\n결제되면 자동으로 결제완료로 바뀌며 알림톡이 와요.",
  },
  {
    selectors: ['[data-coach="rv-status"]'],
    onEnter: openAndReveal("15:30", "rv-status"),
    title: "상태 변경",
    body: "확정한 예약은 준비중 → 제작완료 →\n픽업/배송완료로 진행 상황을 바꿔요.\n예약 상태 변경을 까먹고 수령일이 지나면\n자동으로 완료 처리돼요.\n(완료 처리가 돼야 해당 판매금 정산이 가능해요)",
  },
  {
    selectors: ['[data-coach="rv-legend"]'],
    onEnter: resetView,
    title: "상태 색 안내",
    body: "예약 줄의 색만 봐도 예약 상태를 알 수 있어요.\n빨간색은 미확인, 노란색은 제작완료,\n파란색은 픽업/배송완료예요.",
  },
  {
    selectors: ['[data-coach="rv-month"]'],
    onEnter: resetView,
    title: "월 이동 · 지난 예약",
    body: "달을 넘기며 예약을 확인해요.\n이번 달은 오늘 이후 예약만 먼저 보여주고,\n'지난 예약 보기'로 지난 예약도 볼 수 있어요.",
  },
  {
    selectors: ['[data-coach="rv-search"]'],
    onEnter: resetView,
    title: "예약자 검색",
    body: "이름이나 전화번호로 지난 주문까지 찾아요.\n단골 손님이 예전에 어떤 꽃을 주문했는지\n바로 확인할 수 있어요.",
  },
  {
    // 상세가 펼쳐져 있는 오후 3시 30분 류현우 예약의 이름 버튼 — PC 표에만 있어서 모바일에서는 건너뛴다
    selectors: ['[data-coach="rv-profile-name"][data-rv-time="15:30"]'],
    optional: true,
    onEnter: () => {
      resetView();
      send(RV_OPEN_EVENT, "15:30");
    },
    title: "단골 손님 정보",
    body: "예약자 이름을 누르면 그 손님이 지금까지\n몇 번 주문했는지와 최근 주문 내역이 보여요.\n'빨간색 불호'처럼 취향을 메모해 두면\n다음 주문 때 바로 참고할 수 있어요.",
  },
  {
    selectors: ['[data-coach="rv-add"]'],
    onEnter: resetView,
    title: "예약 추가",
    body: "전화·카카오톡·매장에서 받은 예약도\n여기서 직접 등록해서 한곳에서 관리해요.",
  },
  {
    selectors: ['[data-coach="add-paste"]'],
    onEnter: openAdd("add-paste"),
    title: "네이버 예약 자동 입력",
    body: "네이버 예약 내용을 복사해 붙여 넣으면\n예약자·날짜·상품 같은 항목이 자동으로 채워져요.\n하나하나 옮겨 적지 않아도 돼요.",
  },
  {
    selectors: ['[data-coach="add-orderer"]'],
    onEnter: openAdd("add-orderer"),
    title: "예약 정보 입력",
    body: "예약자와 주문 채널을 적고, 아래로 내려가며\n상품·옵션, 수령 날짜와 방법, 요청 사항을 입력해요.\n손님이 보낸 참고 사진도 함께 올릴 수 있어요.\n(직접 예약 추가는 손님에게 알림톡이 가지 않아요)",
  },
  {
    selectors: ['[data-coach="add-paid"]'],
    onEnter: openAdd("add-paid"),
    title: "결제 상태",
    body: "이미 계좌이체·현장 결제를 받았다면 '결제 완료',\n아직이라면 '미결제'로 두세요.\n미결제 예약은 결제 링크로 결제를 받을 수 있어요.",
  },
];

// 사장님 화면 예약 관리 코치마크 — 처리 흐름(미확인 → 확정 → 상세 → 상태)부터, 그다음 위쪽 보조 기능
export default function ReservationsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_reservations"
      intro={{
        title: "예약 관리 화면이에요",
        body: "손님 예약이 들어오면 여기서 확인하고\n확정부터 완료까지 처리해요.\n오늘(11월 10일) 예약으로 순서대로 알려드릴게요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 눌러보세요",
        body: "예약을 눌러 펼치고 상태를 바꿔보세요.\n미리보기라 손님에게 알림이 가거나\n실제로 저장되지는 않아요.",
      }}
    />
  );
}
