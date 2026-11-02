// 미리보기 매장 목업 — 손님·사장님 화면 미리보기가 함께 쓰는 매장 설정 (실제·데모 매장 데이터를 읽지 않는다)
import type { Product } from "@/types";
import type { BusinessHours, DateOverrides } from "@/lib/businessHours";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import { makeMockProductList } from "./owner/_mockReservations";

// 상품 — public/preview/thumb 사진으로 만든 목업 상품 (손님 메뉴판에는 노출 상품만)
export const PREVIEW_ALL_PRODUCTS: Product[] = makeMockProductList();
export const PREVIEW_PRODUCTS: Product[] = PREVIEW_ALL_PRODUCTS.filter((p) => p.status === "active");

// 디자인 — Flo.Aide 기본 색
export const PREVIEW_THEME_VARS = generateThemeVars(DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT);

// 영업 설정 — 월요일 정기 휴무, 일요일은 짧게, 크리스마스 이브는 늦게까지
export const PREVIEW_BUSINESS_HOURS: BusinessHours = {
  "0": { closed: false, open: "11:00", close: "17:00" },
  "1": { closed: true, open: "10:00", close: "20:00" },
  "2": { closed: false, open: "10:00", close: "20:00" },
  "3": { closed: false, open: "10:00", close: "20:00" },
  "4": { closed: false, open: "10:00", close: "20:00" },
  "5": { closed: false, open: "10:00", close: "20:00" },
  "6": { closed: false, open: "10:00", close: "20:00" },
};
export const PREVIEW_CLOSED_DATES = ["2026-11-24", "2027-01-01"];
export const PREVIEW_DATE_OVERRIDES: DateOverrides = {
  "2026-12-24": { open: "09:00", close: "22:00" },
  "2026-12-31": { open: "10:00", close: "17:00" },
};
export const PREVIEW_MIN_LEAD_TIMES: Record<string, number> = { 꽃다발: 2, 꽃바구니: 3, 센터피스: 4, 화병꽂이: 3, 기타: 2 };

// 판매 설정 — 옵션 가격·거리별 배송비
export const PREVIEW_PRICES = { messageCard: 2000, shoppingBag: 2000, preservative: 500 };
export const PREVIEW_DELIVERY_FEES: Record<string, number> = { "0-1": 5000, "1-3": 7000, "3-5": 10000, "5-10": 15000 };

// 매장 주소 — 배송 거리 계산이 실제로 되도록 검색되는 주소
export const PREVIEW_STORE_ADDRESS = "서울 강남구 가로수길 9";

// 예약 확인 안내 문구 (사장님 판매 설정 미리보기와 같은 문구)
export const PREVIEW_CONSULT_NOTICE =
  "생화 특성상 원하시는 색감을 정확히 지정해 드리기 어려워요.\n계절에 맞는 가장 예쁜 꽃으로, 고르신 분위기에 맞춰 정성껏 제작해 드릴게요.";
