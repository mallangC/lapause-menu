import { Product, FilterState } from "@/types";

export const EMPTY_FILTER: FilterState = {
  productTypes: [],
  flowerColors: [],
  wrappingColors: [],
  moods: [],
  seasons: [],
  featured: false,
  isSeason: false,
};

export function applyFilter(products: Product[], filter: FilterState): Product[] {
  // 바로 구매 메뉴 — 이미 만들어 둔 상품만
  if (filter.isInstant) return products.filter((p) => p.instant);
  // 시즌 메뉴 — 시즌을 고른 상품 (바로 구매 상품이어도 시즌을 골랐으면 시즌 메뉴에도 나온다)
  if (filter.isSeason) {
    if (filter.seasons.length > 0) {
      return products.filter((p) => filter.seasons.some((s) => p.seasons.includes(s)));
    }
    return products.filter((p) => p.seasons.length > 0);
  }
  // 그 밖의 탭(상품 종류) — 시즌 상품·바로 구매 상품은 빼고
  return products.filter((p) => {
    if (p.instant) return false;
    if (p.seasons.length > 0) return false;
    if (filter.featured && !p.is_popular && !p.is_recommended) return false;
    if (filter.productTypes.length > 0 && !filter.productTypes.includes(p.product_type)) return false;
    if (filter.flowerColors.length > 0 && !filter.flowerColors.some((c) => p.flower_colors.includes(c))) return false;
    if (filter.wrappingColors.length > 0 && !filter.wrappingColors.includes(p.wrapping_color ?? "")) return false;
    return !(filter.moods.length > 0 && !filter.moods.includes(p.mood ?? ""));
  });
}
