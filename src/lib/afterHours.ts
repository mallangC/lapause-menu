// 영업시간 외 수령 — 사장님이 켜 두면 '받을 수 있는 시간 범위'(예: 04:00~23:30) 중 영업시간 앞뒤도 수령 시간으로 고를 수 있다.
// 예) 영업 09:00~19:00, 범위 04:00~23:30 → 04:00~08:30 · 19:30~23:30 이 '영업시간 외'로 열린다.
// 추가 요금 없음, 다른 예약처럼 자동 접수되고 사장님이 확정·취소한다.
// 휴무일에는 열리지 않는다 (영업하는 날의 앞뒤만).

export interface AfterHours {
  /** 받을 수 있는 가장 이른 시각 'HH:MM' (꺼져 있으면 null) */
  start: string | null;
  /** 받을 수 있는 가장 늦은 시각 'HH:MM' */
  end: string | null;
}

export const AFTER_HOURS_OFF: AfterHours = { start: null, end: null };
export const DEFAULT_AFTER_HOURS_START = "07:00";
export const DEFAULT_AFTER_HOURS_END = "22:00";

/** 고를 수 있는 시각 (30분 단위) — 시작은 00:30 ~ 23:30, 끝은 00:30 ~ 24:00(자정) */
const halfHours = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${String(Math.floor((from + i) / 2)).padStart(2, "0")}:${(from + i) % 2 ? "30" : "00"}`);
export const AFTER_HOURS_START_OPTIONS = halfHours(1, 47);
export const AFTER_HOURS_END_OPTIONS = halfHours(1, 48);

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

/**
 * 그날의 영업시간 외 수령 시간 (30분 단위) — 범위 안에서 영업시간 앞(오픈 전)과 뒤(마감 후)
 * @param earliest 오늘이면 준비 시간을 더한 가장 이른 시각(분), 아니면 null
 */
export function afterHoursSlots(
  day: { open: string; close: string; closed?: boolean } | null | undefined,
  afterHours: AfterHours,
  earliest: number | null
): string[] {
  if (!day || day.closed || !afterHours.start || !afterHours.end) return [];
  const open = toMin(day.open);
  const close = toMin(day.close);
  const start = toMin(afterHours.start);
  // 자정(24:00)까지 받을 수 있다 — 그날 마지막 수령 시간
  const end = Math.min(toMin(afterHours.end), 24 * 60);
  const slots: number[] = [];
  for (let t = Math.ceil(start / 30) * 30; t < open && t <= end; t += 30) slots.push(t);
  for (let t = Math.max(close + 30, Math.ceil(start / 30) * 30); t <= end; t += 30) slots.push(t);
  return slots.filter((t) => earliest === null || t >= earliest).map(toHHMM);
}

/** 매장 설정에서 읽기 — 꺼져 있으면 범위 없음 */
export function readAfterHours(s: Record<string, unknown>): AfterHours {
  if (!s.after_hours_enabled) return AFTER_HOURS_OFF;
  const ok = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
  return {
    start: ok(s.after_hours_start) ? (s.after_hours_start as string) : DEFAULT_AFTER_HOURS_START,
    end: ok(s.after_hours_end) ? (s.after_hours_end as string) : DEFAULT_AFTER_HOURS_END,
  };
}
