export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_image: string | null;
  owner_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  product_type: "다발" | "바구니" | "센터피스" | "화병꽂이";
  flower_colors: string[];
  wrapping_color: "밝은 계열" | "어두운 계열" | "기타";
  seasons: string[];
  company_id: string;
  is_popular: boolean;
  is_recommended: boolean;
  created_at: string;
}

export interface FilterState {
  productTypes: string[];
  flowerColors: string[];
  wrappingColors: string[];
  seasons: string[];
}

export type ProductInput = Omit<Product, "id" | "created_at" | "company_id">;
