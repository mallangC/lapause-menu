"use client";

import { useEffect, useState } from "react";
import PreviewCoach, { SHARED_COACH, type CoachStep } from "../../PreviewCoach";
import { CONSULT_ACTION_EVENT, CONSULT_OPEN_SECTION_EVENT, CONSULT_STEP_EVENT, getConsultStep } from "../_components/PreviewConsultClient";

// 해당 단계의 항목 펼치기 (-1이면 모두 접기)
const openSection = (step: number, index: number) => () =>
  window.dispatchEvent(new CustomEvent(CONSULT_OPEN_SECTION_EVENT, { detail: { step, index } }));

// 4단계 화면 바꾸기 (배송 선택, 요청 사항 펼치기)
const action = (name: "delivery" | "requests") => () =>
  window.dispatchEvent(new CustomEvent(CONSULT_ACTION_EVENT, { detail: name }));

// 1단계(선물 정보) 설명
const STEP1: CoachStep[] = [
  {
    selectors: ['[data-coach="consult1-0"]'],
    // 모바일: 선택지 '위로'까지만 강조 (아래 선택지는 잘라 설명 창과 겹치지 않게)
    mobileTo: ['[data-coach="consult1-0"] [data-gift-opt="위로"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 0),
    title: "선물 목적",
    body: "기념·축하·감사처럼 선물 목적을 선택하면\n사장님은 손님이 고른 상품을 바탕으로\n선물 목적에 맞게 제작할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult1-1"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 1),
    title: "성별",
    body: "손님이 받는 분의 성별을 골라요.\n사장님은 이를 참고해 색감과 구성을\n정할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult1-2"]'],
    // 모바일: 선택지 '10대'까지만 강조 (아래 선택지는 잘라 설명 창과 겹치지 않게)
    mobileTo: ['[data-coach="consult1-2"] [data-gift-opt="10대"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 2),
    title: "받는 분 연령대",
    body: "손님이 받는 분의 연령대를 골라요.\n연령대마다 좋아하는 스타일이 달라서\n사장님이 제작할 때 참고할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult1-skip"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    dot: ['[data-coach="consult1-skip"] span'],
    title: "건너뛰기",
    body: "선물 정보는 선택 사항이라\n손님이 원하지 않으면 바로 넘어갈 수 있어요.\n부담 없이 주문을 이어가게 해줘요.",
  },
];

// 2단계(취향 & 예산) 설명
const STEP2: CoachStep[] = [
  {
    selectors: ['[data-coach="consult2-0"]'],
    radius: 0,
    pad: 0,
    onEnter: openSection(2, 0),
    title: "상품 형태",
    body: "손님이 꽃다발·꽃바구니 같은 형태를 골라요.\n사장님이 등록한 상품 중 같은 형태의 상품이 추천돼요.",
  },
  {
    selectors: ['[data-coach="consult2-1"]'],
    radius: 0,
    pad: 0,
    onEnter: openSection(2, 1),
    title: "선호하는 분위기",
    body: "손님이 원하는 색감·분위기를 골라요.\n상품을 등록할 때 정한 분위기와 맞는 상품이\n먼저 추천되고, 사장님은 제작할 때 참고해요.",
  },
  {
    selectors: ['[data-coach="consult2-2"]'],
    radius: 0,
    pad: 0,
    onEnter: openSection(2, 2),
    title: "희망 금액",
    body: "손님이 원하는 금액을 골라요.\n금액에 딱 맞는 상품과 조금 더 풍성한 상품을\n함께 보여줘서 손님의 선택 폭이 넓어져요.",
  },
  {
    selectors: ['[data-coach="consult2-next"]'],
    // 희망 예산을 펼친 채로 둔다 — 접었다 펼치며 화면이 크게 오르내리지 않게
    onEnter: openSection(2, 2),
    title: "추천 상품 보기",
    body: "세 가지를 모두 고르면 눌러져요.\n고른 내용에 맞춰 사장님 상품 중\n어울리는 상품을 골라서 보여줘요.",
  },
];

// 3단계(상품 선택) 설명
const STEP3: CoachStep[] = [
  {
    // 맨 위 줄 상품 2개만 딱 맞는 네모로 감싼다 (2열 격자라 첫 줄 = 위 2개)
    selectors: ['[data-coach="consult3-item"]'],
    also: ['[data-coach="consult3-item"]'],
    radius: 0,
    pad: 0,
    title: "추천 상품",
    body: "2단계에서 고른 상품 형태·분위기·희망 금액을 토대로\n사장님 상품 중 어울리는 상품을 자동으로 추천해요.\n손님은 이 중 마음에 드는 상품을 하나 골라요.",
  },
];

// 4단계(예약 확인) 설명
const STEP4: CoachStep[] = [
  {
    selectors: ['[data-coach="consult4-notice"]'],
    radius: 0,
    pad: 0,
    title: "안내 사항",
    body: "사장님이 설정에 적어둔 안내 문구가 보여요.\n손님이 '확인했습니다'에 체크해야 결제할 수 있어서\n꼭 알려야 할 내용을 확실히 전할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult4-delivery"]'],
    // PC: '배송' 줄(+배송 정보)에 '픽업' 줄까지 함께 감싼다
    also: ['[data-coach="consult4-pickup"]'],
    // 모바일: '픽업'·'배송' 선택 줄만 (아래 배송 정보 칸은 제외)
    mobileSelectors: ['[data-coach="consult4-pickup"]'],
    mobileTo: ['[data-delivery-opt="배송"]'],
    radius: 0,
    pad: 0,
    onEnter: action("delivery"),
    title: "수령 방법",
    body: "손님이 픽업과 배송 중에 선택해요.\n배송을 고르면 매장에서 배송지까지 거리를 재서\n사장님이 정한 거리별 배송비를 참고해\n자동으로 배송비를 추가해요.",
  },
  {
    selectors: ['[data-coach="consult4-date"]'],
    // 모바일: '수령 날짜' 제목 줄은 빼고 달력부터
    mobileSelectors: ['[data-coach="consult4-date"] .large-datepicker'],
    // 모바일: 날짜 섹션을 단계 표시 바 바로 아래로 딱 붙여 올려 아래 설명 창 자리를 확보
    mobileScrollFlush: true,
    // 모바일: 달력은 28일이 있는 줄까지만 (아래 줄은 잘라 설명 창과 겹치지 않게)
    mobileTo: ['[data-coach="consult4-date"] .react-datepicker__day--028:not(.react-datepicker__day--outside-month)'],
    mobilePadBottom: 2,
    radius: 0,
    pad: 0,
    title: "수령 희망 날짜",
    body: "사장님이 정한 휴무일과 상품별 준비 시간을 반영해\n손님은 예약 가능한 날짜만 고를 수 있어요.\n임시 휴무일도 사장님이 직접 지정할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult4-time"]'],
    radius: 0,
    pad: 0,
    title: "수령 희망 시간",
    body: "사장님이 정한 영업시간 안에서만\n손님이 수령 시간을 고를 수 있어요.\n날짜별로 시간을 다르게 정할 수도 있어요.",
  },
  {
    selectors: ['[data-coach="consult4-options"]'],
    radius: 0,
    pad: 0,
    title: "추가 옵션",
    body: "메시지 카드·쇼핑백·수명연장제 중\n사장님이 활성화한 옵션을 손님이 추가해요.\n옵션 가격도 사장님이 정할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult4-agree"]'],
    // 반짝이는 점이 동의 문구 끝 글자를 가려서 오른쪽 위로 비켜 놓는다
    dotShift: [8, -10],
    // 동의 문구는 글자 한 줄이라 딱 붙으면 답답해서 여백을 두고 둥글게
    radius: 12,
    pad: 14,
    // 모바일: 네모, 좌우는 카드 여백(16px)만큼 넓혀 화면 끝까지
    mobileRadius: 0,
    mobilePad: 10,
    mobilePadX: 16,
    title: "맞춤 제작 상품 동의",
    body: "제작 착수 후에는 취소·환불이 어렵다는 점을\n결제 단계에서 고객에게 미리 동의받아요.",
  },
];

// 결제 완료 화면 설명
const DONE: CoachStep[] = [
  {
    selectors: ['[data-coach="done-header"]'],
    pad: 0,
    title: "결제 완료",
    body: "결제가 끝나면 예약이 사장님께 들어가고,\n사장님이 내용을 확인한 뒤 확정 또는 취소할 수 있어요.\n예약이 확정·취소되면 손님에게 자동으로\n카카오 알림톡이 발송돼요.",
  },
  {
    selectors: ['[data-coach="done-info"]'],
    pad: 0,
    // 모바일: '주문 정보' 카드만 (화면을 다 차지해 설명 창과 겹치지 않게)
    mobileSelectors: ['[data-coach="done-order-info"]'],
    title: "주문 내용 확인",
    body: "주문 정보와 결제 금액을 한 번에 보여줘요.\n손님이 주문한 내용을 마지막으로 다시 확인해요.",
  },
];

// 상품 상세에서 1개로 바로 예약했을 때의 1단계(선물 정보) — 추천이 아니라 고른 상품을 받는 분에 맞게 제작하는 데 쓰인다
const RESERVE_STEP1: CoachStep[] = [
  {
    selectors: ['[data-coach="consult1-0"]'],
    // 모바일: 선택지 '위로'까지만 강조 (아래 선택지는 잘라 설명 창과 겹치지 않게)
    mobileTo: ['[data-coach="consult1-0"] [data-gift-opt="위로"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 0),
    title: "선물 목적",
    body: "기념·축하·감사처럼 선물 목적을 선택하면\n사장님은 손님이 고른 상품을 바탕으로\n선물 목적에 맞게 제작할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult1-1"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 1),
    title: "성별",
    body: "손님이 받는 분의 성별을 골라요.\n여성분이면 더 화사하게, 남성분이면 차분하게\n색감을 조절하는 데 참고할 수 있어요.",
  },
  {
    selectors: ['[data-coach="consult1-2"]'],
    // 모바일: 선택지 '10대'까지만 강조 (아래 선택지는 잘라 설명 창과 겹치지 않게)
    mobileTo: ['[data-coach="consult1-2"] [data-gift-opt="10대"]'],
    // 모바일: 설명 창은 화면 아래 고정, 강조 영역은 헤더 바로 아래로 (넘치면 설명 창 위에서 자름)
    mobileSheet: true,
    radius: 0,
    pad: 0,
    onEnter: openSection(1, 2),
    title: "받는 분 연령대",
    body: "손님이 받는 분의 연령대를 골라요.\n연령대마다 좋아하는 스타일이 달라서\n사장님이 제작할 때 참고할 수 있어요.",
  },
  STEP1[3],
];

type CoachConfig = { intro: { title: string; body: string }; steps: CoachStep[]; outro: { title: string; body: string } };

// 상품 상세에서 1개로 바로 예약한 흐름 — 선물 정보 → 예약 확인 2단계
const RESERVE_COACHES: Record<number, CoachConfig> = {
  1: {
    intro: {
      title: "바로 예약 화면이에요",
      body: "손님이 상품 상세에서 고른 상품을 바로 예약해요.\n먼저 받는 분 정보를 받고, 이어서\n날짜·시간을 정해 결제까지 이어져요.",
    },
    steps: RESERVE_STEP1,
    outro: {
      title: "직접 골라보세요",
      body: "손님이 된 것처럼 골라보고 다음을 눌러보세요.\n미리보기라 실제로 주문되지는 않아요.",
    },
  },
};

// 단계별 코치마크 설정
const COACHES: Record<number, CoachConfig> = {
  1: {
    intro: {
      title: "맞춤주문 화면이에요",
      body: "손님이 몇 가지만 고르면 어울리는 꽃을 추천받고\n그대로 예약·결제까지 해요.\n손님이 고른 내용은 모두 사장님 예약 정보로 전달돼요.\n먼저 1단계 '선물 정보'를 알려드릴게요.",
    },
    steps: STEP1,
    outro: {
      title: "직접 골라보세요",
      body: "손님이 된 것처럼 하나씩 골라\n다음 단계로 넘어가 보세요.\n미리보기라 실제로 주문되지는 않아요.",
    },
  },
  2: {
    intro: {
      title: "2단계 · 취향 & 금액",
      body: "손님이 원하는 상품 형태, 분위기, 희망 금액을 골라요.\n이 세 가지로 사장님 상품 중 어울리는 꽃을 추천해 줘요.",
    },
    steps: STEP2,
    outro: {
      title: "직접 골라보세요",
      body: "손님이 된 것처럼 세 가지를 고르고\n추천 상품 보기를 눌러보세요.",
    },
  },
  3: {
    intro: {
      title: "3단계 · 상품 선택",
      body: "손님이 고른 취향과 희망 금액에 맞는\n추천 상품이 보이는 화면이에요.",
    },
    steps: STEP3,
    outro: {
      title: "직접 골라보세요",
      body: "손님이 된 것처럼 상품을 하나 고르고\n다음을 눌러보세요.",
    },
  },
  4: {
    intro: {
      title: "4단계 · 예약 확인",
      body: "손님이 수령 방법과 날짜·시간을 정하고\n결제하는 마지막 단계예요.\n주요 항목을 차례로 알려드릴게요.",
    },
    steps: STEP4,
    outro: {
      title: "직접 입력해보세요",
      body: "손님이 된 것처럼 날짜와 시간을 골라보세요.\n미리보기라 실제로 결제되지는 않아요.",
    },
  },
  // 5 = 결제 완료 화면
  5: {
    intro: {
      title: "결제 완료 화면이에요",
      body: "손님이 결제를 마치면 보는 화면이에요.\n미리보기라 실제 예약은 들어가지 않았어요.",
    },
    steps: DONE,
    outro: {
      title: "맞춤주문 둘러보기 끝",
      body: "손님이 맞춤주문으로 예약하는 흐름을 모두 확인했어요.\n아래 버튼으로 손님 홈이나 처음 화면으로\n돌아갈 수 있어요.",
    },
  },
};

// 손님 화면 맞춤주문 코치마크 — 단계가 바뀌면 그 단계의 설명으로 다시 시작한다
export default function ConsultCoach({ preselected = false }: { preselected?: boolean }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    setStep(getConsultStep());
    const onStep = (e: Event) => setStep((e as CustomEvent<number>).detail);
    window.addEventListener(CONSULT_STEP_EVENT, onStep);
    return () => window.removeEventListener(CONSULT_STEP_EVENT, onStep);
  }, []);

  // 바로 예약 흐름은 1단계 설명을 따로 쓰고, 예약 확인은 2단계로 안내한다 (설명을 봤는지도 따로 기억)
  const base = COACHES[step];
  const coach: CoachConfig | undefined = !preselected
    ? base
    : RESERVE_COACHES[step] ??
      // 맞춤주문 버튼(4단계)이 아닌 흐름(바로 예약·첫 화면 대화)은 단계 말 없이 '무슨 화면인지'만
      (step === 4 && base
        ? { ...base, intro: { title: "주문 정보 화면이에요", body: "손님이 수령 방법과 날짜·시간을 정하고\n결제하는 화면이에요.\n주요 항목을 차례로 알려드릴게요." } }
        : base);
  if (!coach) return null;
  const sharedKey = step === 1 ? SHARED_COACH.gift : step === 4 ? SHARED_COACH.consultConfirm : undefined;
  return <PreviewCoach key={step} storageKey={`preview_coach_customer_${preselected ? "reserve" : "consult"}${step}`} sharedKey={sharedKey} {...coach} />;
}

// 미리보기에서 뺀 주문서 설명(주문 상품·주문자·요청 사항·결제 금액 등) — 나중에 다시 쓸 수 있게 남겨 둠
export const CONSULT_CONFIRM_EXTRA_STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="consult4-orderer"]'],
    radius: 0,
    pad: 0,
    title: "예약자 정보",
    body: "손님이 이름과 휴대전화 번호를 입력해요.\n예약이 확정·취소되면 이 번호로\n카카오 알림톡이 자동으로 발송돼요.",
  },
  {
    selectors: ['[data-coach="consult4-requests"]'],
    radius: 0,
    pad: 0,
    onEnter: action("requests"),
    title: "요청 사항",
    body: "손님이 전하고 싶은 요청을 자유롭게 적어요.\n사장님은 예약 정보에서 바로 확인할 수 있어요.",
  },
  {
    // 결제 금액 요약은 PC 오른쪽 패널에만 있다 — 모바일에서는 건너뛴다
    selectors: ['[data-coach="consult4-summary"]'],
    noDot: true,
    radius: 0,
    pad: 0,
    optional: true,
    title: "결제 금액",
    body: "상품 가격에 손님이 추가한 옵션과\n거리별 배송비까지 합쳐 총 결제금액을 보여줘요.\n손님이 결제 전에 한눈에 확인할 수 있어요.",
  },
];
