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
  /** 상품 설명 — 사장님이 적는 짧은 글 (손님 상품 상세에 보인다, 300자까지) */
  description?: string | null;
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
  /** 재고 관리 사용 — 판매될 때마다 stock 이 줄고 0이 되면 품절(soldout)로 바뀐다 */
  stock_enabled?: boolean;
  /** 남은 재고 (재고 관리를 쓸 때만) */
  stock?: number | null;
  /** 붙은 시즌이 모두 예약 마감 — 손님 화면에서만 계산해 붙는다 (DB 칸 아님, lib/seasonDeadline). 품절처럼 보이고 주문할 수 없다 */
  season_closed?: boolean;
  /** 예약 마감 시각 ("YYYY-MM-DD" | "YYYY-MM-DDTHH:mm") — 붙은 시즌이 모두 마감을 정했을 때 가장 늦은 것. 손님 화면에서만 붙는다 */
  season_deadline?: string;
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
