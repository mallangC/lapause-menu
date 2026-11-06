// 오늘 준비된 꽃 색상 · 색 맞춤 가능 일수
// - 사장님이 매일 아침 '오늘 들어온 꽃 색상'을 고른다 (company_settings.today_colors / today_colors_date)
// - 받는 날이 '색 맞춤 가능 일수'(color_lead_days) 안쪽이면, 손님 주문은 그날 매장에 있는 색으로 준비된다
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

type ColorSettings = { today_colors?: string[] | null; today_colors_date?: string | null };

/** 오늘 색상을 정했는지 (색을 골랐거나 '오늘은 안내 없이'를 눌렀으면 true) */
export const isTodayColorsDecided = (s: ColorSettings | null | undefined) => !!s && s.today_colors_date === colorBusinessDate();

/** 오늘 손님에게 보여줄 색 — 오늘 정하지 않았거나 안내 없이 했으면 빈 목록 */
export const todayColorsFor = (s: ColorSettings | null | undefined): string[] =>
  isTodayColorsDecided(s) ? (s!.today_colors ?? []) : [];

/** 주문 마지막 페이지에서 색을 사장님께 맡기는 답 */
export const PREPARED_COLOR_TRUST = "사장님께 맡길게요";

/** 'YYYY-MM-DD' 두 날짜 사이 일수 (b - a) */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * 이 받는 날에 '오늘 매장에 있는 색'에서 골라야 하는지
 * — 오늘 색을 알려준 날이고, 받는 날이 오늘부터 색 맞춤 가능 일수 안쪽일 때 (예: 3일이면 오늘·내일·모레)
 */
export function needsPreparedColor(todayColors: string[], colorLeadDays: number, desiredDate: string | null | undefined) {
  if (!desiredDate || todayColors.length === 0 || colorLeadDays <= 0) return false;
  const diff = daysBetween(colorBusinessDate(), desiredDate);
  return diff >= 0 && diff < colorLeadDays;
}

/** 손님이 고른 준비 색이 받을 수 있는 값인지 (서버 확인용) */
export const isValidPreparedColor = (v: unknown) =>
  typeof v === "string" && (v === PREPARED_COLOR_TRUST || (TODAY_COLOR_OPTIONS as readonly string[]).includes(v));
