"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="rs-sales"]'],
    title: "판매 기능",
    body: "판매 신청이 승인돼야 활성화할 수 있어요.\n활성화하면 손님 메뉴판에 맞춤 주문·장바구니·\n바로 예약 버튼이 나타나 주문과 결제를 받아요.\n잠시 주문을 쉬고 싶을 땐 끄면 메뉴판만 보여요.",
  },
  {
    selectors: ['[data-coach="rs-options"]'],
    title: "추가 옵션",
    body: "메시지 카드·쇼핑백·생화 수명연장제를 켜면\n손님이 주문할 때 옵션으로 추가할 수 있어요.\n옵션마다 가격도 여기서 정해요.",
  },
  {
    selectors: ['[data-coach="rs-delivery"]'],
    title: "배송 기능",
    body: "활성화하면 손님이 주문 시 배송을 고를 수 있어요.\n활성화하려면 아래 배송비 설정에서\n1km 이내 배송비를 꼭 넣어야 해요.",
  },
  {
    selectors: ['[data-coach="rs-fees"]'],
    title: "배송비 설정",
    body: "매장에서 배송지까지 거리 구간별 배송비를 정해요.\n판매 신청에서 설정한 매장 주소에서 손님 주소까지\n거리를 재서 배송비가 자동으로 붙고,\n비워둔 구간이면 '매장에 문의해 주세요'라고 안내돼요.",
  },
  {
    selectors: ['[data-coach="rs-notice"]'],
    title: "예약 확인 안내 문구",
    body: "손님이 결제하기 직전 예약 확인 화면 맨 위에\n보여줄 안내예요. 손님이 '확인했습니다'에\n체크해야 결제할 수 있어서 꼭 알릴 내용을 적어요.",
  },
];

// 사장님 화면 판매 설정 코치마크 (저장 버튼 설명은 온보딩에서)
export default function SalesSettingsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_sales"
      intro={{
        title: "판매 설정 화면이에요",
        body: "판매 신청이 승인되면 여기서 판매를 켜고\n추가 옵션과 배송을 정해요.\n손님 주문 화면이 이 설정대로 바뀌어요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 바꿔보세요",
        body: "옵션을 켜고 끄거나 배송비를 바꿔보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
