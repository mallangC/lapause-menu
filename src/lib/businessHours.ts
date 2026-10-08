export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export type BusinessHours = Record<string, DayHours>;
export type DateOverrides = Record<string, { open: string; close: string }>;

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// 요일별 기본 영업시간에 특정 날짜의 영업시간 예외(date_overrides)를 적용해 최종 영업시간을 계산한다.
// 예외는 영업시간(open/close)만 바꾸고, 휴무 여부(closed)는 요일별 기본 설정을 그대로 따른다.
export function resolveDayHours(
  date: Date,
  businessHours: BusinessHours,
  dateOverrides: DateOverrides = {}
): DayHours | null {
  const base = businessHours[String(date.getDay())] ?? null;
  const override = dateOverrides[dateKey(date)];
  if (!override) return base;
  return { closed: base?.closed ?? false, open: override.open, close: override.close };
}
