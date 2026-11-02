"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="bz-lead"]'],
    title: "당일 예약 시간 설정",
    body: "상품 종류별로 만드는 데 필요한 시간을 정해요.\n손님은 지금부터 이 시간이 지난 뒤로만\n수령 시간을 고를 수 있어서,\n갑자기 들어온 급한 주문에 쫓기지 않아요.",
  },
  {
    selectors: ['[data-coach="bz-hours"]'],
    title: "요일별 영업 시간",
    body: "요일마다 영업 여부와 시간을 정해요.\n손님은 영업시간 안에서만 수령 시간을 고를 수 있고,\n정기 휴무 요일은 예약 달력에서 막혀요.",
  },
  {
    selectors: ['[data-coach="bz-closed"]'],
    title: "휴무일 설정",
    body: "공휴일이나 개인 사정으로 쉬는 날을\n날짜로 지정해요. 그날은 손님이 예약할 수 없어요.",
  },
  {
    selectors: ['[data-coach="bz-override"]'],
    title: "영업시간 변경",
    body: "크리스마스 이브처럼 특정 날만 영업시간을\n늘리거나 줄일 수 있어요.\n요일별 기본 영업시간은 그대로 유지돼요.",
  },
];

// 사장님 화면 영업 설정 코치마크 (저장 버튼 설명은 온보딩에서)
export default function BusinessCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_business"
      intro={{
        title: "영업 설정 화면이에요",
        body: "영업시간과 휴무일, 상품별 준비 시간을 정해요.\n손님이 예약할 수 있는 날짜와 시간이\n이 설정에 맞춰 자동으로 정해져요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 바꿔보세요",
        body: "영업시간을 바꾸거나 휴무일을 추가해보세요.\n미리보기라 실제로 저장되지는 않아요.",
      }}
    />
  );
}
