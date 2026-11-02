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
  price: number;
  image_url: string | null;
  product_type: string;
  flower_colors: string[];
  wrapping_color: "밝은 계열" | "어두운 계열" | "기타" | null;
  seasons: string[];
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
}

export type ProductInput = Omit<Product, "id" | "created_at" | "company_id">;
