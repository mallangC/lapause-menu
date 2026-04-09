export const PRODUCT_TYPES = ["다발", "바구니", "센터피스", "화병꽂이", "식물", "조화"] as const;

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

export const SEASONS = ["어버이날", "크리스마스", "이벤트"] as const;

export const FLOWER_COLOR_MAP: Record<string, string> = {
  핑크색: "#f472b6",
  빨간색: "#ef4444",
  주황색: "#f97316",
  노란색: "#ffe600",
  초록색: "#22c55e",
  파란색: "#3b82f6",
  보라색: "#a855f7",
  흰색: "#f5f5f5",
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
  starter: 3900,
  pro: 9900,
} as const;

export const PLAN_DESCRIPTIONS = {
  starter: "전자 메뉴판으로 간편하게 시작",
  pro: "맞춤 주문과 예약까지 한번에",
} as const;

export const PLAN_FEATURES = {
  starter: [
    { text: "전자 메뉴판 운영", highlight: false },
    { text: "나만의 가게 링크 (flo-aide.com/내가게)", highlight: false },
    { text: "모바일 최적화 상품 페이지", highlight: false },
    { text: "로고·테마 커스터마이징", highlight: false },
  ],
  pro: [
    { text: "Starter 플랜 모든 기능 포함", highlight: false },
    { text: "맞춤 주문 & 예약 관리", highlight: false },
    { text: "매출·예약 통계", highlight: false },
    { text: "카카오 예약 알림 자동 발송", highlight: false },
    { text: "결제 수수료 0% (카드 수수료 별도)", highlight: true },
  ],
} as const;
