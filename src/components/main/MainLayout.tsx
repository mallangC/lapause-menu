"use client";

import { useState, useEffect, useRef } from "react";
import { Product, FilterState } from "@/types";
import { INACTIVITY_TIMEOUT_MS } from "@/lib/constants";
import FilterSidebar from "./FilterSidebar";
import ProductGrid from "./ProductGrid";
import HeroImage from "./HeroImage";

const EMPTY_FILTER: FilterState = {
  productTypes: [],
  flowerColors: [],
  wrappingColors: [],
};

function hasActiveFilter(filter: FilterState): boolean {
  return (
    filter.productTypes.length > 0 ||
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0
  );
}

function applyFilter(products: Product[], filter: FilterState): Product[] {
  return products.filter((p) => {
    if (
      filter.productTypes.length > 0 &&
      !filter.productTypes.includes(p.product_type)
    ) {
      return false;
    }
    if (
      filter.flowerColors.length > 0 &&
      !filter.flowerColors.some((c) => p.flower_colors.includes(c))
    ) {
      return false;
    }
    return !(filter.wrappingColors.length > 0 &&
        !filter.wrappingColors.includes(p.wrapping_color));

  });
}

interface MainLayoutProps {
  products: Product[];
}

export default function MainLayout({ products }: MainLayoutProps) {
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
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
    <div className="min-h-screen bg-beige-100">
      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-beige-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-light tracking-widest text-gold-500">
            Lapause Fleur
          </h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
        {/* 사이드바 */}
        <FilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          onClearAll={() => setFilter(EMPTY_FILTER)}
        />

        {/* 메인 콘텐츠 */}
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
