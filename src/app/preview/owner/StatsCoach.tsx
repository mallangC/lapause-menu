"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

// 통계는 눌러볼 버튼이 없어서 설명이 끝난 뒤 반짝이는 점을 남기지 않는다(noDot)
// 모바일은 통계 카드가 화면 양 끝까지 꽉 차서 네모(mobileRadius: 0), PC는 둥근 모서리
// 항목별 설명 — 미리보기에서는 소개 카드만 보여주고 단계 설명은 쓰지 않는다 (나중에 온보딩에서 다시 쓸 수 있게 남겨 둠)
export const STATS_STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="st-summary"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "이번 달 요약",
    body: "이번 달 매출과 예약 건수를 지난달과 비교해\n얼마나 늘었는지 바로 보여줘요.\n매장 흐름을 한눈에 확인할 수 있어요.",
  },
  {
    selectors: ['[data-coach="st-yearly"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "전년 대비 월별 매출",
    body: "작년과 올해 매출을 달마다 나란히 보여줘요.\n다가올 달의 작년 매출을 미리 보고\n5월 같은 대목에 재료와 일손을 준비하세요.",
  },
  {
    selectors: ['[data-coach="st-time"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "주문 시간 분포",
    body: "손님 주문이 몰리는 시간대와 요일을 보여줘요.\n주문이 많은 시간 전에 SNS에 올리거나\n바쁜 요일에 맞춰 재료를 미리 준비할 수 있어요.",
  },
  {
    selectors: ['[data-coach="st-traffic"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "유입 분석",
    body: "손님이 어느 채널로 들어와 주문했는지 보여줘요.\n주문으로 잘 이어지는 채널에 홍보를 집중하세요.",
  },
  {
    selectors: ['[data-coach="st-types"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "상품 유형 순위",
    body: "어떤 종류의 상품이 많이 팔리는지 보여줘요.\n잘 나가는 종류의 상품을 늘릴 때 참고해요.",
  },
  {
    selectors: ['[data-coach="st-budget"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "예산대별 분포",
    body: "맞춤주문 손님이 고른 예산대를 보여줘요.\n손님이 가장 많이 찾는 가격대에 맞춰\n상품 가격과 구성을 정할 수 있어요.",
  },
  {
    selectors: ['[data-coach="st-best"]'],
    noDot: true,
    pad: 0,
    mobileRadius: 0,
    title: "베스트셀러 Top 5",
    body: "가장 많이 팔린 상품 5개를\n사진과 판매 건수로 보여줘요.\n대표 상품이나 시즌 추천 상품을 정할 때 써요.",
  },
];

// 사장님 화면 통계 코치마크
export default function StatsCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_stats"
      intro={{
        title: "통계 화면이에요",
        body: "사장님이 데이터를 보고 전략적으로\n매장을 운영할 수 있도록\n매출·주문·손님 데이터를 모아 보여드려요.",
      }}
      // 단계 설명 없이 소개 카드만 — 버튼은 '둘러보기'
      steps={[]}
      outro={{
        title: "직접 둘러보세요",
        body: "기간과 보기 방식을 바꿔가며 살펴보세요.\n지금 보이는 숫자는 잘 되는 매장을 가정한 예시예요.",
      }}
    />
  );
}
