"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="bz-lead"]'],
    pad: 0,
    // 모바일: 네모, 위는 '꽃다발' 위 선부터 아래는 '기타' 줄 끝까지(위아래 여백 0), 좌우는 카드 여백(16px)만큼 넓혀 화면 끝까지
    mobileRadius: 0,
    mobilePad: 0,
    mobilePadX: 16,
    title: "당일 예약 시간 설정",
    body: "상품을 만드는 데 걸리는 시간을 정해요.\n예) 꽃다발을 2시간으로 정하면\n오후 1시에 주문한 손님은\n주문 시간을 3시부터 선택할 수 있어요.",
  },
  {
    selectors: ['[data-coach="bz-hours"]'],
    pad: 0,
    // 모바일: 목록이 길어 설명 창과 겹쳐서 월요일 위 선부터 목요일 줄 끝까지만, 네모 / 좌우는 1단계처럼 화면 끝까지
    mobileTo: ['[data-coach="bz-hours-thu"]'],
    mobileRadius: 0,
    mobilePadX: 16,
    title: "요일별 영업 시간",
    body: "요일마다 영업 여부와 시간을 정해요.\n손님은 영업시간 안에서만 수령 시간을 고를 수 있고,\n정기 휴무 요일은 예약 달력에서 막혀요.",
  },
  {
    selectors: ['[data-coach="bz-closed"]'],
    pad: 12,
    // 모바일은 네모 + 여백을 조금 더
    mobileRadius: 0,
    mobilePad: 16,
    title: "휴무일 설정",
    body: "공휴일이나 개인 사정으로 쉬는 날을\n날짜로 지정해요. 그날은 손님이 예약할 수 없어요.",
  },
  {
    selectors: ['[data-coach="bz-override"]'],
    pad: 12,
    // 모바일은 네모 + 여백을 조금 더
    mobileRadius: 0,
    mobilePad: 16,
    title: "영업시간 변경",
    body: "특정 날의 영업시간을 늘리거나 줄일 수 있어요.\n요일별 기본 영업시간은 그대로 유지돼요.",
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
