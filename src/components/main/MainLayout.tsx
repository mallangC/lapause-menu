"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Product, FilterState } from "@/types";
import { INACTIVITY_TIMEOUT_MS } from "@/lib/constants";
import FilterSidebar from "./FilterSidebar";
import ProductGrid from "./ProductGrid";
import HeroImage from "./HeroImage";

const EMPTY_FILTER: FilterState = {
  productTypes: [],
  flowerColors: [],
  wrappingColors: [],
  seasons: [],
};

function hasActiveFilter(filter: FilterState): boolean {
  return (
    filter.productTypes.length > 0 ||
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0 ||
    filter.seasons.length > 0
  );
}

function applyFilter(products: Product[], filter: FilterState): Product[] {
  // 시즌 필터가 활성화된 경우: 해당 시즌 상품만 표시
  if (filter.seasons.length > 0) {
    return products.filter((p) => filter.seasons.some((s) => p.seasons.includes(s)));
  }
  // 일반 필터: 시즌 상품 제외 후 필터 적용
  return products.filter((p) => {
    if (p.seasons.length > 0) return false;
    if (filter.productTypes.length > 0 && !filter.productTypes.includes(p.product_type)) return false;
    if (filter.flowerColors.length > 0 && !filter.flowerColors.some((c) => p.flower_colors.includes(c))) return false;
    return !(filter.wrappingColors.length > 0 && !filter.wrappingColors.includes(p.wrapping_color));

  });
}

interface MainLayoutProps {
  products: Product[];
  companyName?: string;
  logoImage?: string | null;
  themeVars?: Record<string, string>;
  slug?: string;
}

export default function MainLayout({ products, companyName = "Lapause Fleur", logoImage, themeVars, slug }: MainLayoutProps) {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFilterActive = hasActiveFilter(filter);

  // 비활성 자동 해제: 필터 활성 상태일 때만 이벤트 리스너 등록
  useEffect(() => {
    if (!isFilterActive) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFilter(EMPTY_FILTER);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isFilterActive]);

  const filteredProducts = isFilterActive ? applyFilter(products, filter) : [];

  return (
    <div className="min-h-screen bg-beige-100 pb-14 md:pb-0" style={themeVars as React.CSSProperties}>
      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-beige-50 relative">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          {logoImage ? (
            <img src={logoImage} alt={companyName} className="h-8 object-contain" />
          ) : (
            <span className="text-xl font-light tracking-widest text-gold-500">
              {companyName}
            </span>
          )}
        </div>
        {slug && (
          <Link href={`/${slug}/admin`} className="absolute right-0 top-0 bottom-0 w-12" aria-hidden />
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
        <FilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          onClearAll={() => setFilter(EMPTY_FILTER)}
          mobileOpen={mobileFilterOpen}
          onMobileToggle={() => setMobileFilterOpen((prev) => !prev)}
        />

        <main className="flex-1 min-w-0">
          {isFilterActive ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <HeroImage />
          )}
        </main>
      </div>
    </div>
  );
}
