import { Product, FilterState } from "@/types";

export const EMPTY_FILTER: FilterState = {
  productTypes: [],
  flowerColors: [],
  wrappingColors: [],
  seasons: [],
  featured: false,
  isSeason: false,
};

export function applyFilter(products: Product[], filter: FilterState): Product[] {
  if (filter.isSeason) {
    if (filter.seasons.length > 0) {
      return products.filter((p) => filter.seasons.some((s) => p.seasons.includes(s)));
    }
    return products.filter((p) => p.seasons.length > 0);
  }
  return products.filter((p) => {
    if (p.seasons.length > 0) return false;
    if (filter.featured && !p.is_popular && !p.is_recommended) return false;
    if (filter.productTypes.length > 0 && !filter.productTypes.includes(p.product_type)) return false;
    if (filter.flowerColors.length > 0 && !filter.flowerColors.some((c) => p.flower_colors.includes(c))) return false;
    return !(filter.wrappingColors.length > 0 && !filter.wrappingColors.includes(p.wrapping_color));
  });
}
