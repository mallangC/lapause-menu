export const PRODUCT_TYPES = ["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "식물", "조화"] as const;

export const FLOWER_COLORS = [
  "핑크색",
  "빨간색",
  "주황색",
  "노란색",
  "초록색",
  "파란색",
  "보라색",
  "하얀색",
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
  하얀색: "#f5f5f5",
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
  monthly: 14900,
  annual: 9900,       // 월 환산
  annualTotal: 118800, // 연 총액
} as const;

export const PLAN_DESCRIPTIONS = {
  monthly: "모든 기능을 월 단위로 유연하게",
  annual: "연간 결제로 더 합리적으로",
} as const;

export const PLAN_FEATURES = [
  { text: "전자 메뉴판 운영", highlight: false },
  { text: "나만의 가게 링크 (flo-aide.com/내가게)", highlight: false },
  { text: "맞춤 주문 & 예약 관리", highlight: false },
  { text: "매출·예약 통계", highlight: false },
  { text: "카카오 예약 알림 자동 발송", highlight: false },
  { text: "결제 수수료 0% (카드 수수료 별도)", highlight: true },
] as const;
