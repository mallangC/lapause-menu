"use client";

import PreviewCoach, { SHARED_COACH, type CoachStep } from "../../../PreviewCoach";

// 선물 정보 항목 펼치기 — 실제 GiftInfoStep 화면을 그대로 쓰므로, 접혀 있으면 항목 제목을 눌러 연다
// (하나가 열리면 나머지는 저절로 접힌다)
const openGiftSection = (index: number) => () => {
  const header = document.querySelector<HTMLButtonElement>(`[data-gift-section="${index}"] > button`);
  const panel = header?.nextElementSibling as HTMLElement | null;
  if (header && panel?.style.gridTemplateRows !== "1fr") header.click();
};

// 장바구니·바로 예약 주문서 1단계(선물 정보) 설명 — 고른 상품을 받는 분에 맞게 제작하는 데 쓰인다
const STEPS: CoachStep[] = [
  {
    selectors: ['[data-gift-section="0"]'],
    onEnter: openGiftSection(0),
    title: "선물 목적",
    body: "손님이 기념·축하·감사처럼 어떤 날인지 골라요.\n사장님은 고른 상품을 바탕으로\n그날 분위기에 맞게 제작할 수 있어요.",
  },
  {
    selectors: ['[data-gift-section="1"]'],
    onEnter: openGiftSection(1),
    title: "성별",
    body: "손님이 받는 분의 성별을 골라요.\n여성분이면 더 화사하게, 남성분이면 차분하게\n색감을 조절하는 데 참고할 수 있어요.",
  },
  {
    selectors: ['[data-gift-section="2"]'],
    onEnter: openGiftSection(2),
    title: "받는 분 연령대",
    body: "손님이 받는 분의 연령대를 골라요.\n연령대마다 좋아하는 스타일이 달라서\n사장님이 제작할 때 참고할 수 있어요.",
  },
  {
    // 이미 하나라도 골랐으면 '다음' 버튼으로 바뀌어 건너뛰기가 없다 — 그때는 이 설명을 건너뛴다
    selectors: ["[data-gift-skip]"],
    dot: ["[data-gift-skip] span"],
    optional: true,
    title: "건너뛰기",
    body: "선물 정보는 선택 사항이라\n손님이 원하지 않으면 바로 넘어갈 수 있어요.\n부담 없이 주문을 이어가게 해줘요.",
  },
];

// 주문서 2단계(예약 확인) 설명 — 맞춤주문 4단계와 같은 항목에, 여러 상품을 한 번에 정리해 보여주는 '주문 상품'을 더했다
// (추가 옵션은 장바구니에서 이미 고르므로 여기에는 없다)
const STEP2: CoachStep[] = [
  {
    selectors: ['[data-coach="checkout-notice"]'],
    optional: true,
    title: "안내 사항",
    body: "사장님이 설정에 적어둔 안내 문구가 보여요.\n손님이 '확인했습니다'에 체크해야 결제할 수 있어서\n꼭 알려야 할 내용을 확실히 전할 수 있어요.",
  },
  {
    selectors: ['[data-coach="checkout-items"]'],
    title: "주문 상품",
    body: "손님이 여러 상품을 함께 주문해도\n상품별 수량과 고른 옵션, 금액이 한곳에 정리돼요.\n손님은 결제 전에, 사장님은 예약에서 한눈에 확인해요.",
  },
  {
    selectors: ['[data-coach="checkout-orderer"]'],
    title: "주문자 정보",
    body: "손님이 이름과 휴대전화 번호를 입력해요.\n예약이 확정·취소되면 이 번호로\n카카오 알림톡이 자동으로 발송돼요.",
  },
  {
    selectors: ['[data-coach="checkout-delivery"]'],
    title: "수령 방법",
    body: "손님이 픽업과 배송 중에 골라요.\n배송을 고르면 매장에서 배송지까지 거리를 재서\n사장님이 정한 거리별 배송비가 자동으로 붙어요.",
  },
  {
    selectors: ['[data-coach="checkout-date"]'],
    title: "수령 희망 날짜",
    body: "사장님이 정한 휴무일과 상품별 준비 시간을 반영해\n손님은 예약 가능한 날짜만 고를 수 있어요.\n여러 상품이면 준비 시간이 가장 긴 상품에 맞춰요.",
  },
  {
    selectors: ['[data-coach="checkout-time"]'],
    title: "수령 희망 시간",
    body: "사장님이 정한 영업시간 안에서만\n손님이 수령 시간을 고를 수 있어요.\n날짜별로 시간을 다르게 정할 수도 있어요.",
  },
  {
    selectors: ['[data-coach="checkout-requests"]'],
    title: "요청 사항",
    body: "손님이 전하고 싶은 요청을 자유롭게 적어요.\n사장님은 예약 정보에서 바로 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="checkout-summary"]'],
    title: "결제 금액",
    body: "상품과 옵션 금액에 거리별 배송비까지 합쳐\n총 결제금액을 보여줘요.\n손님이 결제 전에 한눈에 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="checkout-agree"]'],
    title: "맞춤 제작 상품 동의",
    body: "제작 착수 후에는 취소·환불이 어렵다는 점을\n결제 단계에서 고객에게 미리 동의받아\n주문 취소 분쟁을 예방해요",
  },
];

// 결제 완료 화면 설명 — 맞춤주문 완료와 같은 항목
const DONE: CoachStep[] = [
  {
    selectors: ['[data-coach="done-header"]'],
    title: "결제 완료",
    body: "결제가 끝나면 예약이 사장님께 들어가고,\n사장님이 내용을 확인한 뒤 확정 또는 취소해요.\n예약이 확정·취소되면 카카오 알림톡으로 알려드려요.",
  },
  {
    selectors: ['[data-coach="done-info"]'],
    title: "주문 내용 확인",
    body: "여러 상품과 옵션, 주문자·받는 분, 수령 날짜·시간,\n선물 정보와 결제 금액을 한 번에 보여줘요.\n손님이 주문한 내용을 마지막으로 다시 확인해요.",
  },
];

// 손님 화면 주문서 코치마크 — 장바구니 주문과 상품 상세 바로 예약(수량 2개 이상)을 따로 안내·기억한다
export default function CheckoutCoach({ direct, step }: { direct: boolean; step: 1 | 2 | "done" }) {
  const storageKey = `preview_coach_customer_checkout_${direct ? "direct" : "cart"}${step}`;
  if (step === "done") {
    return (
      <PreviewCoach
        storageKey={storageKey}
        intro={{
          title: "결제 완료 화면이에요",
          body: "손님이 결제를 마치면 보는 화면이에요.\n미리보기라 실제 예약은 들어가지 않았어요.",
        }}
        steps={DONE}
        outro={{
          title: direct ? "바로 예약 둘러보기 끝" : "장바구니 주문 둘러보기 끝",
          body: `손님이 ${direct ? "상품 상세에서 바로 예약" : "장바구니로 주문"}하는 흐름을 모두 봤어요.\n아래 버튼으로 손님 홈이나 처음 화면으로 돌아갈 수 있어요.`,
        }}
      />
    );
  }
  if (step === 2) {
    return (
      <PreviewCoach
        storageKey={storageKey}
        sharedKey={SHARED_COACH.checkoutConfirm}
        intro={{
          title: "2단계 · 예약 확인",
          body: "손님이 받는 방법과 날짜·시간을 정하고\n결제하는 마지막 단계예요.\n주요 항목을 차례로 알려드릴게요.",
        }}
        steps={STEP2}
        outro={{
          title: "직접 입력해보세요",
          body: "손님이 된 것처럼 날짜와 시간을 골라보세요.\n미리보기라 실제로 결제되지는 않아요.",
        }}
      />
    );
  }
  return (
    <PreviewCoach
      storageKey={storageKey}
      sharedKey={SHARED_COACH.gift}
      intro={
        direct
          ? {
              title: "바로 예약 화면이에요",
              body: "손님이 상품 상세에서 수량을 2개 이상 골라\n바로 예약할 때 보는 화면이에요.\n먼저 받는 분 정보를 받고, 다음 단계에서\n날짜·시간을 정해 결제까지 이어져요.",
            }
          : {
              title: "장바구니 주문 화면이에요",
              body: "손님이 장바구니에서 고른 상품을 한 번에 예약해요.\n먼저 받는 분 정보를 받고, 다음 단계에서\n날짜·시간을 정해 결제까지 이어져요.",
            }
      }
      steps={STEPS}
      outro={{
        title: "직접 골라보세요",
        body: "손님이 된 것처럼 골라보고 다음을 눌러보세요.\n미리보기라 실제로 주문되지는 않아요.",
      }}
    />
  );
}
