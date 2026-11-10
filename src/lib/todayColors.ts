// 오늘 준비된 꽃 색상 · 색 맞춤 가능 일수
// - 사장님이 매일 아침 '오늘 들어온 꽃 색상'을 고른다 (company_settings.today_colors / today_colors_date)
// - 받는 날이 '색 맞춤 가능 일수'(color_lead_days) 안쪽이면, 손님 주문은 그날 매장에 있는 색으로 준비된다
// - 그 이후 날짜는 원하는 색을 따로 들여올 수 있어 모든 색 중에서 고른다
// - '색 맞춤 최소 금액'(color_min_price)은 날짜와 관계없이 항상 — 상품 금액이 작으면 색은 사장님께 맡긴다
// - 하루의 기준은 한국 시간 아침 7시 — 새벽 마감 중엔 전날로 친다
// - 그날 날짜로 빈 목록을 저장하면 '오늘은 색 안내 없이' (팝업·손님 안내 모두 안 나옴)

import { FLOWER_COLORS } from "@/lib/constants";

export const TODAY_COLOR_OPTIONS: readonly string[] = FLOWER_COLORS;

/** 색 맞춤 가능 일수 기본값 */
export const DEFAULT_COLOR_LEAD_DAYS = 3;

/** 오늘(영업일) 날짜 'YYYY-MM-DD' — 한국 시간 아침 7시에 날짜가 바뀐다 (UTC+9 에서 7시간을 빼면 UTC+2) */
export function colorBusinessDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 2 * 3600_000).toISOString().slice(0, 10);
}

type ColorSettings = { today_colors?: string[] | null; today_colors_date?: string | null; today_colors_enabled?: boolean | null };

/** 오늘 꽃 색상 기능을 쓰는지 (사장님이 끌 수 있다, 기본 켜짐) */
export const isTodayColorsEnabled = (s: ColorSettings | null | undefined) => s?.today_colors_enabled !== false;

/** 오늘 색상을 정했는지 (색을 골랐거나 '오늘은 안내 없이'를 눌렀으면 true) */
export const isTodayColorsDecided = (s: ColorSettings | null | undefined) => !!s && s.today_colors_date === colorBusinessDate();

/** 오늘 손님에게 보여줄 색 — 오늘 정하지 않았거나 안내 없이 했으면 빈 목록 */
export const todayColorsFor = (s: ColorSettings | null | undefined): string[] =>
  isTodayColorsEnabled(s) && isTodayColorsDecided(s) ? (s!.today_colors ?? []) : [];

/** 주문 마지막 페이지에서 색을 사장님께 맡기는 답 */
export const PREPARED_COLOR_TRUST = "사장님께 맡길게요";

/** 'YYYY-MM-DD' 두 날짜 사이 일수 (b - a) */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * 주문 마지막 페이지의 색 고르기 방식
 * - "today": 받는 날이 색 맞춤 가능 일수 안쪽 → 오늘 매장에 있는 색 중에서 (오늘 색을 알려준 날만)
 * - "all": 그 이후 날짜 → 모든 색 중에서
 * - null: 색을 고르지 않음 (기능 꺼짐, 날짜 없음, 가까운 날인데 오늘 색을 아직 안 알려줌)
 */
export type ColorPickMode = "today" | "all";

export function colorPickMode(
  enabled: boolean,
  todayColors: string[],
  colorLeadDays: number,
  desiredDate: string | null | undefined
): ColorPickMode | null {
  if (!enabled || !desiredDate) return null;
  const diff = daysBetween(colorBusinessDate(), desiredDate);
  if (diff < 0) return null;
  if (diff < colorLeadDays) return todayColors.length > 0 ? "today" : null;
  return "all";
}

/** 받는 날이 색 맞춤 가능 일수 안쪽인지 (오늘 매장에 있는 꽃으로 준비되는 날) */
export function isNearColorDate(colorLeadDays: number, desiredDate: string | null | undefined) {
  if (!desiredDate) return false;
  const diff = daysBetween(colorBusinessDate(), desiredDate);
  return diff >= 0 && diff < colorLeadDays;
}

/** 색 맞춤 최소 금액 — 상품 금액(추가 옵션·배송비 제외)이 이보다 작으면 색을 고르지 못하고 사장님께 맡긴다 (0이면 제한 없음) */
export const canPickColor = (minPrice: number | null | undefined, amount: number) => !minPrice || minPrice <= 0 || amount >= minPrice;

/** 손님이 고른 준비 색이 받을 수 있는 값인지 (서버 확인용) */
export const isValidPreparedColor = (v: unknown) =>
  typeof v === "string" && (v === PREPARED_COLOR_TRUST || (TODAY_COLOR_OPTIONS as readonly string[]).includes(v));

/** 서버 저장용 — 받을 수 없는 값은 빼고, 최소 금액보다 작은 주문이 색을 골랐으면 '사장님께 맡길게요'로 */
export function preparedColorToSave(v: unknown, minPrice: number | null | undefined, amount: number): string | null {
  if (!isValidPreparedColor(v)) return null;
  return canPickColor(minPrice, amount) ? (v as string) : PREPARED_COLOR_TRUST;
}
