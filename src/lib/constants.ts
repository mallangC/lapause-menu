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
