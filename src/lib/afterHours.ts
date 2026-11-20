// 영업시간 외 수령 — 사장님이 켜 두면 '받을 수 있는 시간 범위'(예: 04:00~23:30) 중 영업시간 앞뒤도 수령 시간으로 고를 수 있다.
// 예) 영업 09:00~19:00, 범위 04:00~23:30 → 04:00~08:30 · 19:30~23:30 이 '영업시간 외'로 열린다.
// 추가 요금 없음, 다른 예약처럼 자동 접수되고 사장님이 확정·취소한다.
// 휴무일에는 열리지 않는다 (영업하는 날의 앞뒤만).
// 준비는 영업시간 안에 끝나야 한다 — 마감 후에는 사장님이 없으니까.
//   · 오늘 마감 후 수령: 지금 + 준비 시간이 오늘 마감 안에 끝날 때만
//   · 내일 오픈 전 수령: 전날(오늘) 마감 전에 준비가 끝날 때만 (오늘 주문해야 하고, 오늘 마감 안에 끝나야)
// 이미 만들어 둔 상품(바로 구매 메뉴)을 사람 없이 가져가는 건 '무인 픽업' — 아래 unattendedSlots
// 영업시간 외 수령을 고르면 사장님이 써 둔 안내(찾아가는 방법 등)를 손님에게 보여준다.

import { resolveDayHours, type BusinessHours, type DateOverrides } from "@/lib/businessHours";

export interface AfterHours {
  /** 받을 수 있는 가장 이른 시각 'HH:MM' (꺼져 있으면 null) */
  start: string | null;
  /** 받을 수 있는 가장 늦은 시각 'HH:MM' */
  end: string | null;
  /** 영업시간 외 수령 손님에게 전할 안내 (찾아가는 방법 등) */
  note: string;
}

export const AFTER_HOURS_OFF: AfterHours = { start: null, end: null, note: "" };
/** 안내 최대 글자 수 */
export const AFTER_HOURS_NOTE_MAX = 300;
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

/** 마감 전 준비 규칙에 필요한 것 — 고른 날짜, 준비 시간, 영업시간 */
export interface PrepContext {
  selectedDate: Date;
  leadHours: number;
  businessHours: BusinessHours;
  dateOverrides?: DateOverrides;
  now?: Date;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * 그날의 영업시간 외 수령 시간 (30분 단위) — 범위 안에서 영업시간 앞(오픈 전)과 뒤(마감 후)
 * @param earliest 오늘이면 준비 시간을 더한 가장 이른 시각(분), 아니면 null
 * @param prep 넘기면 '준비는 마감 전까지' 규칙을 적용한다
 */
export function afterHoursSlots(
  day: { open: string; close: string; closed?: boolean } | null | undefined,
  afterHours: AfterHours,
  earliest: number | null,
  prep?: PrepContext
): string[] {
  if (!day || day.closed || !afterHours.start || !afterHours.end) return [];
  const open = toMin(day.open);
  const close = toMin(day.close);
  const start = toMin(afterHours.start);
  // 자정(24:00)까지 받을 수 있다 — 그날 마지막 수령 시간
  const end = Math.min(toMin(afterHours.end), 24 * 60);
  // 마감 전 준비 규칙 — 오픈 전 / 마감 후 묶음을 열지 말지
  let allowBefore = true;
  let allowAfter = true;
  if (prep) {
    const now = prep.now ?? new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const leadMin = prep.leadHours * 60;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const today = resolveDayHours(now, prep.businessHours, prep.dateOverrides);
    // 오늘 마감까지 준비를 끝낼 수 있는지 (오늘 쉬는 날이면 못 끝낸다)
    const doneByTodayClose = !!today && !today.closed && nowMin + leadMin <= toMin(today.close);
    if (sameDay(prep.selectedDate, now)) {
      // 오늘 오픈 전 — 이미 지났거나, 전날 마감 전에 준비했어야 해서 안 된다
      allowBefore = false;
      allowAfter = doneByTodayClose;
    } else if (sameDay(prep.selectedDate, tomorrow)) {
      // 내일 오픈 전 — 오늘 마감 전에 준비가 끝나야
      allowBefore = doneByTodayClose;
    }
  }

  const slots: number[] = [];
  if (allowBefore) for (let t = Math.ceil(start / 30) * 30; t < open && t <= end; t += 30) slots.push(t);
  if (allowAfter) for (let t = Math.max(close + 30, Math.ceil(start / 30) * 30); t <= end; t += 30) slots.push(t);
  return slots.filter((t) => earliest === null || t >= earliest).map(toHHMM);
}

/** 매장 설정에서 읽기 — 꺼져 있으면 범위 없음 */
export function readAfterHours(s: Record<string, unknown>): AfterHours {
  if (!s.after_hours_enabled) return AFTER_HOURS_OFF;
  const ok = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
  return {
    start: ok(s.after_hours_start) ? (s.after_hours_start as string) : DEFAULT_AFTER_HOURS_START,
    end: ok(s.after_hours_end) ? (s.after_hours_end as string) : DEFAULT_AFTER_HOURS_END,
    note: typeof s.after_hours_note === "string" ? s.after_hours_note.slice(0, AFTER_HOURS_NOTE_MAX) : "",
  };
}

/**
 * 이 수령 날짜·시간이 영업시간 밖인지 (주문 저장 때 '영업시간 외 수령' 표시용)
 * @param date 'YYYY-MM-DD' @param time 'HH:MM'
 */
export function isAfterHoursPickup(
  date: string | null | undefined,
  time: string | null | undefined,
  businessHours: BusinessHours | null | undefined,
  dateOverrides?: DateOverrides | null
): boolean {
  if (!date || !time || !/^\d{2}:\d{2}$/.test(time)) return false;
  const day = resolveDayHours(new Date(`${date}T00:00:00`), businessHours ?? {}, dateOverrides ?? {});
  if (!day || day.closed) return false;
  const t = toMin(time);
  return t < toMin(day.open) || t > toMin(day.close);
}

// ── 무인 픽업 — 바로 구매 메뉴(이미 만들어 둔 상품)만 담긴 주문 ──
// 준비 시간이 없어 지금부터 고를 수 있고, 무인 픽업을 켠 매장은 영업시간 밖이라도 '무인 픽업 시간' 안이면 가져갈 수 있다.
// 휴무일은 열지 않는다 (다른 주문과 같다).

export interface Unattended {
  /** 무인 픽업 시작 'HH:MM' (꺼져 있으면 null) */
  start: string | null;
  /** 무인 픽업 끝 'HH:MM' (24:00 = 자정까지) */
  end: string | null;
  /** 무인 픽업 손님에게 전할 안내 (가져가는 방법 등) */
  note: string;
}

export const UNATTENDED_OFF: Unattended = { start: null, end: null, note: "" };
export const DEFAULT_UNATTENDED_START = "00:00";
export const DEFAULT_UNATTENDED_END = "24:00";
/** 무인 픽업 시간 — 시작 00:00 ~ 23:30, 끝 00:30 ~ 24:00 */
export const UNATTENDED_START_OPTIONS = halfHours(0, 47);
export const UNATTENDED_END_OPTIONS = halfHours(1, 48);
/** 바로 구매 메뉴 기본 이름 */
export const DEFAULT_INSTANT_MENU_NAME = "바로 구매";
export const INSTANT_MENU_NAME_MAX = 12;

/** 매장 설정에서 읽기 — 꺼져 있으면 범위 없음 */
export function readUnattended(s: Record<string, unknown>): Unattended {
  if (!s.unattended_enabled) return UNATTENDED_OFF;
  const ok = (v: unknown) => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);
  return {
    start: ok(s.unattended_start) ? (s.unattended_start as string) : DEFAULT_UNATTENDED_START,
    end: ok(s.unattended_end) ? (s.unattended_end as string) : DEFAULT_UNATTENDED_END,
    note: typeof s.unattended_note === "string" ? s.unattended_note.slice(0, AFTER_HOURS_NOTE_MAX) : "",
  };
}

/** 바로 구매 메뉴 이름 (비었으면 기본) */
export const instantMenuName = (s: Record<string, unknown>) =>
  (typeof s.instant_menu_name === "string" && s.instant_menu_name.trim()) || DEFAULT_INSTANT_MENU_NAME;

/**
 * 그날의 무인 픽업 시간 (30분 단위) — 무인 픽업 범위 중 영업시간 밖
 * @param earliest 오늘이면 지금 이후 가장 이른 시각(분), 아니면 null
 */
export function unattendedSlots(
  day: { open: string; close: string; closed?: boolean } | null | undefined,
  unattended: Unattended,
  earliest: number | null
): string[] {
  if (!day || day.closed || !unattended.start || !unattended.end) return [];
  const open = toMin(day.open);
  const close = toMin(day.close);
  const start = Math.ceil(toMin(unattended.start) / 30) * 30;
  const end = Math.min(toMin(unattended.end), 24 * 60);
  const slots: number[] = [];
  for (let t = start; t <= end; t += 30) if (t < open || t > close) slots.push(t);
  return slots.filter((t) => earliest === null || t >= earliest).map(toHHMM);
}

/** 이 수령 시간이 무인 픽업인지 — 바로 구매 상품만 담겼고, 무인 픽업을 켰고, 영업시간 밖이면서 무인 픽업 범위 안 */
export function isUnattendedPickup(
  allInstant: boolean,
  unattended: Unattended,
  date: string | null | undefined,
  time: string | null | undefined,
  businessHours: BusinessHours | null | undefined,
  dateOverrides?: DateOverrides | null
): boolean {
  if (!allInstant || !unattended.start || !unattended.end || !time || !/^\d{2}:\d{2}$/.test(time)) return false;
  if (!isAfterHoursPickup(date, time, businessHours, dateOverrides)) return false;
  const t = toMin(time);
  return t >= toMin(unattended.start) && t <= Math.min(toMin(unattended.end), 24 * 60);
}
