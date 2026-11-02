import { Playfair_Display } from "next/font/google";

// 미리보기 가짜 매장 로고용 영문 세리프
export const brandFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["500"],
  style: ["italic"],
  display: "swap",
});
