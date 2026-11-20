import { hasAnySizeTier, normalizeSizeConfig } from "@/lib/sizeTiers";
import { isTodayColorsDecided, isTodayColorsEnabled } from "@/lib/todayColors";

// 손님 문의 줄이기 — 기능마다 켰는지 판단 (사장님 대시보드 체크리스트와 운영자 활용도 요약이 같은 기준을 쓴다)

/** 판단에 쓰는 매장 설정 값 */
export interface InquirySettings {
  delivery_enabled?: boolean | null;
  delivery_fees?: unknown;
  consult_enabled?: boolean | null;
  size_tiers?: unknown;
  today_colors_enabled?: boolean | null;
  today_colors?: string[] | null;
  today_colors_date?: string | null;
  message_card_enabled?: boolean | null;
  shopping_bag_enabled?: boolean | null;
  preservative_enabled?: boolean | null;
  after_hours_enabled?: boolean | null;
  after_hours_note?: string | null;
  location_url?: string | null;
  parking?: string | null;
}
/** 운영자 화면에서 매장 설정을 불러올 때 쓰는 칸 목록 */
export const INQUIRY_SETTING_COLUMNS =
  "delivery_enabled, delivery_fees, consult_enabled, size_tiers, today_colors_enabled, today_colors, today_colors_date, message_card_enabled, shopping_bag_enabled, preservative_enabled, after_hours_enabled, after_hours_note, location_url, parking";

export interface InquiryItem {
  key: string;
  label: string;
  /** 켜면 사라지는 손님 질문 */
  question: string;
  on: boolean;
  /** 설정할 탭 */
  tab: string;
  /** 여러 개를 다 채워야 켜지는 항목 — [채운 수, 전체] */
  progress?: [number, number];
  /** 사장님이 기능 자체를 꺼 둠 (오늘 꽃 색상) — 체크리스트에서는 빼고, 운영자 요약에서는 따로 센다 */
  off?: boolean;
}

export function inquiryItems(s: InquirySettings): InquiryItem[] {
  const fees = (s.delivery_fees ?? {}) as Record<string, number | null>;
  const hasFee = Object.values(fees).some((v) => v != null);
  const colorsEnabled = isTodayColorsEnabled(s);
  const afterDone = Number(!!s.after_hours_enabled) + Number(!!(s.after_hours_note ?? "").trim());
  const placeDone = Number(!!s.location_url) + Number(!!s.parking);
  return [
    { key: "delivery", label: "배송 기능 · 배송비", question: "“배송 돼요? 배송비 얼마예요?”", on: !!s.delivery_enabled && hasFee, tab: "reservation" },
    { key: "consult", label: "맞춤 주문", question: "“이 금액으로 어떤 꽃이 돼요?”", on: !!s.consult_enabled, tab: "reservation" },
    { key: "volume", label: "볼륨감 참고 이미지", question: "“이 가격이면 크기 어느 정도예요?”", on: hasAnySizeTier(normalizeSizeConfig(s.size_tiers)), tab: "reservation" },
    {
      key: "colors",
      label: "오늘 가능한 꽃 색상",
      question: "“오늘 무슨 색 꽃 있어요?”",
      on: colorsEnabled && isTodayColorsDecided(s) && (s.today_colors ?? []).length > 0,
      tab: "dashboard",
      off: !colorsEnabled,
    },
    { key: "options", label: "추가 옵션 (카드·쇼핑백·연장제)", question: "“메시지 카드 써주세요? 쇼핑백 있어요?”", on: !!(s.message_card_enabled || s.shopping_bag_enabled || s.preservative_enabled), tab: "reservation" },
    // 영업시간 외 수령 · 손님 안내 — 둘 다 해야 체크
    { key: "afterHours", label: "영업시간 외 수령 · 안내", question: "“일찍·늦게 찾아가도 돼요? 꽃 어떻게 가져가요?”", on: afterDone === 2, tab: "business", progress: [afterDone, 2] },
    // 매장 위치·주차 정보 — 둘 다 채워야 체크
    { key: "place", label: "매장 위치 · 주차 정보", question: "“매장 어디예요? 주차 돼요?”", on: placeDone === 2, tab: "company", progress: [placeDone, 2] },
  ];
}
