export const PRODUCT_TYPES = ["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "식물", "조화"] as const;

export const FLOWER_COLORS = [
  "핑크색",
  "빨간색",
  "주황색",
  "노란색",
  "초록색",
  "파란색",
  "보라색",
  "흰색",
  "검은색",
] as const;

export const WRAPPING_COLORS = ["밝은 계열", "어두운 계열", "기타"] as const;

export const SEASONS = ["어버이날", "크리스마스", "현장 판매"] as const;

export const FLOWER_COLOR_MAP: Record<string, string> = {
  핑크색: "#f472b6",
  빨간색: "#ef4444",
  주황색: "#f97316",
  노란색: "#ffe600",
  초록색: "#22c55e",
  파란색: "#3b82f6",
  보라색: "#a855f7",
  흰색: "#ffffff",
  검은색: "#1c1917",
};

export const BADGE_COLORS = {
  popular: { bg: "#F08080", label: "인기" },
  recommended: { bg: "#9CAF88", label: "추천" },
} as const;

export const MOODS = ["깔끔한 화이트&그린", "화사한 파스텔톤", "선명한 비비드톤", "차분한 딥컬러"] as const;

export const INACTIVITY_TIMEOUT_MS = 60000;

export const STORAGE_BUCKET = "product_menu";

// ── 요금제 ──────────────────────────────────────────
// 가격이나 기능 내용은 여기서만 수정하면 전체 반영됩니다.

export const PLAN_PRICES = {
  monthly: 18900,
  annual: 13250,       // 월 환산
  annualTotal: 159000, // 연 총액
} as const;

// 연간 플랜이 월간 플랜 대비 할인되는 비율 (표시용, 반올림)
export const ANNUAL_DISCOUNT_RATE = 30;

// ── 결제 수수료 ──────────────────────────────────────
// 매장이 결제 금액에서 차감당하는 수수료율. 여기서만 수정하면 정산 계산/안내 문구 전체에 반영됩니다.
export const PLATFORM_FEE_RATE = 0.02; // 2% (카드 수수료, 부가세 포함, 매장 부담)
export const PG_FEE_RATE = 0.0165; // PG사(토스페이먼츠 등) 수수료율 — Flo.Aide 순마진 계산 기준
export const PLATFORM_MARGIN_RATE = Math.round((PLATFORM_FEE_RATE - PG_FEE_RATE) * 100000) / 100000; // Flo.Aide 순마진율

function formatPercent(rate: number) {
  return `${Number((rate * 100).toFixed(2))}%`;
}

export const PLATFORM_FEE_PERCENT_LABEL = formatPercent(PLATFORM_FEE_RATE); // "2%"
export const PG_FEE_PERCENT_LABEL = formatPercent(PG_FEE_RATE); // "1.65%"
export const PLATFORM_MARGIN_PERCENT_LABEL = formatPercent(PLATFORM_MARGIN_RATE); // "0.35%"

export const PLAN_DESCRIPTIONS = {
  monthly: "모든 기능을 월 단위로 유연하게",
  annual: "연간 결제로 더 합리적으로",
} as const;

export const PLAN_FEATURES = [
  { text: "전자 메뉴판 운영", highlight: false },
  { text: "나만의 가게 링크 (flo-aide.com/내가게)", highlight: false },
  { text: "맞춤 주문 & 예약 관리", highlight: false },
  { text: "링크결제 사용 가능", highlight: false },
  { text: "매출·예약 통계", highlight: false },
  { text: "카카오 예약 알림 자동 발송", highlight: false },
  { text: `결제 수수료 ${PLATFORM_FEE_PERCENT_LABEL} (카드 수수료, 부가세 포함)`, highlight: true },
] as const;
