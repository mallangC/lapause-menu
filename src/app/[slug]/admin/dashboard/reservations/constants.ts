export const STATUS_OPTIONS = ["미확인", "준비중", "제작완료", "픽업/배송완료", "취소"] as const;

export const STATUS_ROW_BG: Record<string, string> = {
  미확인: "bg-red-50",
  준비중: "bg-white",
  제작완료: "bg-yellow-50",
  "픽업/배송완료": "bg-blue-50",
  취소: "bg-gray-100",
};

export const STATUS_LEGEND = [
  { label: "미확인", color: "bg-red-400" },
  { label: "준비중", color: "bg-white border border-gray-300" },
  { label: "제작완료", color: "bg-yellow-400" },
  { label: "픽업/배송완료", color: "bg-blue-400" },
  { label: "취소", color: "bg-gray-300" },
];

export const PAGE_SIZE = 10;
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
