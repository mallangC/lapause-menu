import type { Product } from "@/types";

// 상품 없이 하는 주문 — 매장 첫 화면 대화에서 고른 내용으로 주문한다.
//  · 사장님 스타일로 알아서 (style)
//  · 찾아본 사진이랑 비슷하게 (photo) — 손님이 보낸 사진이 상품 사진 자리에 들어간다
// 맞춤주문 마지막 단계(예약 확인·결제)를 그대로 쓰고, 상품 자리에는 형태·분위기·예산으로 만든 가상 상품을 넣는다.

/** 가상 상품 id — 서버는 이 id를 보면 DB 상품 대신 예산을 상품 금액으로 쓴다 */
export const STYLE_PRODUCT_ID = "owner-style";
export const PHOTO_PRODUCT_ID = "photo-style";
export const isVirtualProductId = (id: string | undefined) => id === STYLE_PRODUCT_ID || id === PHOTO_PRODUCT_ID;

export type StyleKind = "style" | "photo";

export const STYLE_PRODUCT_TYPES = ["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "기타"];
export const BASE_MOODS = ["깔끔한 화이트&그린", "화사한 파스텔톤", "선명한 비비드톤", "차분한 딥컬러"];
/** 분위기도 사장님께 맡기는 답 — '사장님 스타일' 주문에서만 맨 앞에 보인다 */
export const STYLE_MOOD_TRUST = "사장님에게 맡길게요";
/** 사진 분위기 그대로 — '찾아본 사진' 주문에서만 맨 앞에 보인다 */
export const PHOTO_MOOD_SAME = "보낸 사진이랑 같은 분위기로";
export const STYLE_MOODS = [STYLE_MOOD_TRUST, ...BASE_MOODS];
export const PHOTO_MOODS = [PHOTO_MOOD_SAME, ...BASE_MOODS];
export const STYLE_PURPOSES = ["기념", "축하", "감사", "위로", "데이트", "기타"];
export const STYLE_GENDERS = ["여성", "남성"];
export const STYLE_AGES = ["10대 이하", "10대", "20대", "30대", "40대", "50대 이상"];

/** 예산은 1만 원 단위, 1만 원 ~ 1,000만 원 */
export const isValidStyleBudget = (n: number) => Number.isInteger(n) && n >= 10000 && n <= 10_000_000 && n % 10000 === 0;

/**
 * 찾아본 사진 — 주문을 마치기 전까지는 저장소에 올리지 않고 손님 브라우저 탭(sessionStorage)에만 둔다.
 * 결제가 승인되면 예약을 저장하면서 서버가 그때 올린다 → 주문하지 않은 손님의 사진이 저장소에 남지 않는다.
 */
export const photoOrderKey = (slug: string) => `photo_order_${slug}`;
export const readPhotoOrder = (slug: string): string | null => {
  try {
    return sessionStorage.getItem(photoOrderKey(slug));
  } catch {
    return null;
  }
};
/** 보관 가능한 사진 형식 (data URL) — 서버도 같은 규칙으로 받는다 */
export const REF_DATA_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export interface StyleOrder {
  kind: StyleKind;
  purpose: string;
  gender: string;
  age: string;
  productType: string;
  mood: string;
  budget: number;
}

/** 주문 내역·사장님 화면에 보일 상품 이름 */
export function styleProductName(kind: StyleKind, mood: string) {
  if (kind === "photo") return mood && mood !== PHOTO_MOOD_SAME ? `사진 참고 · ${mood}` : "사진 참고";
  return mood && mood !== STYLE_MOOD_TRUST ? `사장님 스타일 · ${mood}` : "사장님 스타일";
}

/** 맞춤주문 화면의 상품 자리에 넣을 가상 상품 — 사장님 스타일은 사진 없음, 찾아본 사진은 손님 사진 */
export function makeStyleProduct(o: { kind: StyleKind; productType: string; mood: string; budget: number; refImage?: string | null }): Product {
  return {
    id: o.kind === "photo" ? PHOTO_PRODUCT_ID : STYLE_PRODUCT_ID,
    name: styleProductName(o.kind, o.mood),
    price: o.budget,
    image_url: o.kind === "photo" ? o.refImage ?? null : null,
    product_type: o.productType,
    flower_colors: [],
    wrapping_color: null,
    seasons: [],
    mood: o.mood || null,
    company_id: "",
    is_popular: false,
    is_recommended: false,
    status: "active",
    created_at: "",
    bag_included: false,
    message_card_unavailable: false,
    preservative_unavailable: false,
  };
}

/** 첫 화면 → 맞춤주문으로 넘길 주소 (새로고침해도 그대로 남도록 주소에 담는다) */
export function styleOrderHref(slug: string, o: StyleOrder) {
  const q = new URLSearchParams({ style: o.kind === "photo" ? "photo" : "1", type: o.productType, mood: o.mood, budget: String(o.budget) });
  if (o.purpose) q.set("purpose", o.purpose);
  if (o.gender) q.set("gender", o.gender);
  if (o.age) q.set("age", o.age);
  return `/${slug}/consult?${q.toString()}`;
}

/** 주소에서 읽어 검증 — 정해진 값이 아니면 무시한다 */
export function parseStyleOrder(sp: Record<string, string | undefined>): StyleOrder | null {
  const kind: StyleKind | null = sp.style === "1" ? "style" : sp.style === "photo" ? "photo" : null;
  if (!kind) return null;
  const budget = Number(sp.budget);
  const productType = sp.type ?? "";
  const mood = sp.mood ?? "";
  const moods = kind === "photo" ? PHOTO_MOODS : STYLE_MOODS;
  if (!isValidStyleBudget(budget) || !STYLE_PRODUCT_TYPES.includes(productType) || !moods.includes(mood)) return null;
  const pick = (v: string | undefined, list: string[]) => (v && list.includes(v) ? v : "");
  return {
    kind,
    purpose: pick(sp.purpose, STYLE_PURPOSES),
    gender: pick(sp.gender, STYLE_GENDERS),
    age: pick(sp.age, STYLE_AGES),
    productType,
    mood,
    budget,
  };
}
