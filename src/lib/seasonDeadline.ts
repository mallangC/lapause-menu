// 시즌 예약 마감 — 사장님이 메뉴 설정에서 시즌마다 '언제까지' 주문받을지 정한다.
// company_settings.season_deadlines: { 시즌 이름: "YYYY-MM-DD" | "YYYY-MM-DDTHH:mm" } (한국 시간)
// 날짜만 정하면 그날 끝(다음 날 0시)까지, 시간까지 정하면 그 시각까지 주문할 수 있다.
// 마감은 숨김과 다르다 — 시즌·상품은 메뉴판에 그대로 보이고 '예약 마감'으로 표시되며 주문만 막힌다.
// 숨김 상태(hidden_seasons·company_categories.hidden)는 바꾸지 않는다. 마감 시각을 늦추거나 지우면 바로 다시 주문할 수 있다.

export type SeasonDeadlines = Record<string, string>;

const DEADLINE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** DB 값 읽기 — 형식이 맞는 것만 */
export function readSeasonDeadlines(v: unknown): SeasonDeadlines {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: SeasonDeadlines = {};
  for (const [name, value] of Object.entries(v as Record<string, unknown>)) {
    if (typeof value === "string" && DEADLINE_RE.test(value)) out[name] = value;
  }
  return out;
}

/** 주문이 막히는 시각 (ms) — 시간이 있으면 그 시각, 날짜만 있으면 다음 날 0시 (한국 시간) */
export function deadlineClosesAt(value: string): number {
  const [date, time] = value.split("T");
  return time
    ? new Date(`${date}T${time}:00+09:00`).getTime()
    : new Date(`${date}T00:00:00+09:00`).getTime() + DAY_MS;
}

export function isDeadlinePassed(value: string | null | undefined, now = Date.now()): boolean {
  return !!value && now >= deadlineClosesAt(value);
}

/** 마감 시각이 지난 시즌 이름들 */
export function closedSeasonNames(deadlines: SeasonDeadlines, now = Date.now()): string[] {
  return Object.entries(deadlines).filter(([, v]) => isDeadlinePassed(v, now)).map(([name]) => name);
}

/** 시즌 상품인데 붙은 시즌이 모두 마감됐으면 주문할 수 없다 (마감 안 된 시즌이 하나라도 있으면 주문 가능) */
export function isSeasonClosedProduct(seasons: string[] | null | undefined, closedSeasons: string[]): boolean {
  return !!seasons && seasons.length > 0 && seasons.every((s) => closedSeasons.includes(s));
}

/**
 * 상품의 예약 마감 시각 — 붙은 시즌이 모두 마감 시각을 갖고 있을 때 그중 가장 늦은 것 (그때까지는 주문할 수 있다).
 * 시즌이 없거나 마감 없는 시즌이 하나라도 있으면 마감 없음(undefined).
 * (이 시각이 지났는지 = isSeasonClosedProduct 와 같은 판단)
 */
export function productDeadline(seasons: string[] | null | undefined, deadlines: SeasonDeadlines): string | undefined {
  if (!seasons || seasons.length === 0) return undefined;
  let latest: string | undefined;
  for (const s of seasons) {
    const v = deadlines[s];
    if (!v) return undefined;
    if (!latest || deadlineClosesAt(v) > deadlineClosesAt(latest)) latest = v;
  }
  return latest;
}

const kstDay = (ms: number) => new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 마감까지 남은 날 (한국 날짜 기준) — 마감 당일 0, 전날 1 … 이미 지났으면 null */
export function daysUntilDeadline(value: string, now = Date.now()): number | null {
  const closesAt = deadlineClosesAt(value);
  if (now >= closesAt) return null;
  const lastDay = kstDay(closesAt - 1); // 주문할 수 있는 마지막 날
  return Math.round((Date.parse(lastDay) - Date.parse(kstDay(now))) / DAY_MS);
}

/** 마감 임박 뱃지 — 3일 전부터 "마감 D-3" … 당일 "오늘 마감", 그 전·지난 뒤는 null */
export function deadlineBadge(value: string | null | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const days = daysUntilDeadline(value, now);
  if (days === null || days > 3) return null;
  return days === 0 ? "오늘 마감" : `마감 D-${days}`;
}

/** 서랍 메뉴 짧은 표시 — "~12/24" */
export function shortDeadline(value: string): string {
  const [, m, d] = value.split("T")[0].split("-").map(Number);
  return `~${m}/${d}`;
}

/** 화면 표시 — "12월 26일" / "12월 26일 18:00" */
export function formatDeadline(value: string): string {
  const [date, time] = value.split("T");
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일${time ? ` ${time}` : ""}`;
}

/** 손님 화면 — 주문할 수 없는 상품이면 이유 ('품절' / '예약 마감'), 주문할 수 있으면 null */
export function unavailableLabel(p: { status?: string | null; season_closed?: boolean }): "품절" | "예약 마감" | null {
  if (p.status === "soldout") return "품절";
  if (p.season_closed) return "예약 마감";
  return null;
}
