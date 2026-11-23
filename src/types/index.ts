export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_image: string | null;
  owner_id: string;
  created_at: string;
  location_url: string | null;
  kakao_channel_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  hidden_product_types: string[];
  hidden_seasons: string[];
}

export type ProductStatus = "active" | "inactive" | "soldout";

export interface Product {
  id: string;
  name: string;
  /** 손님이 실제로 내는 가격 (할인 중이면 할인가) */
  price: number;
  /** 할인 전 정가 — 있으면 할인 중 (price보다 크다), 없으면 할인 없음 */
  original_price?: number | null;
  image_url: string | null;
  /** 손님이 고르는 상품 옵션 묶음 (예: 포장지 기본/고급, 꽃 추가) — lib/productOptions */
  options?: import("@/lib/productOptions").ProductOptionGroup[];
  /** 대표 사진(image_url) 다음 사진들 — 순서대로 최대 4장 (상품 사진은 모두 5장까지) */
  extra_images?: string[];
  product_type: string;
  flower_colors: string[];
  wrapping_color: "밝은 계열" | "어두운 계열" | "기타" | null;
  seasons: string[];
  /** 바로 구매 메뉴 — 이미 만들어 둔 상품 (제작시간 없이 바로, 무인 픽업 가능) */
  instant?: boolean;
  mood: string | null;
  company_id: string;
  is_popular: boolean;
  is_recommended: boolean;
  status: ProductStatus;
  created_at: string;
  bag_included: boolean;
  message_card_unavailable: boolean;
  /** 생화 수명연장제 추가 불가 — 체크한 상품은 장바구니·바로 예약·맞춤주문에서 수명연장제를 고를 수 없다 */
  preservative_unavailable: boolean;
}

export interface FilterState {
  productTypes: string[];
  flowerColors: string[];
  wrappingColors: string[];
  moods: string[];
  seasons: string[];
  featured: boolean;
  isSeason: boolean;
  /** 바로 구매 메뉴 탭 */
  isInstant?: boolean;
}

export type ProductInput = Omit<Product, "id" | "created_at" | "company_id">;
