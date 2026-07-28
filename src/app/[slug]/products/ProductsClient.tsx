"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Product, FilterState } from "@/types";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import { SEASONS, PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import MobileFilter from "@/components/main/MobileFilter";
import ProductGrid from "@/components/main/ProductGrid";
import StoreHeader from "@/components/main/StoreHeader";
import FloAideFooter from "@/components/FloAideFooter";

interface ProductsClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  products: Product[];
  hiddenProductTypes: string[];
  hiddenSeasons: string[];
  customProductTypes: string[];
  customSeasons: string[];
  consultEnabled: boolean;
}

type FilterKey = "flowerColors" | "wrappingColors" | "moods";

export default function ProductsClient({
  slug,
  companyName,
  logoImage,
  themeVars,
  products,
  hiddenProductTypes,
  hiddenSeasons,
  customProductTypes,
  customSeasons,
  consultEnabled,
}: ProductsClientProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") as "featured" | "season" | null;
  const typeParam = searchParams.get("type");
  const activeTab = tab === "featured" ? "featured" : tab === "season" ? "season" : "all";

  const [filter, setFilter] = useState<FilterState>({
    ...EMPTY_FILTER,
    featured: activeTab === "featured",
    isSeason: activeTab === "season",
    productTypes: typeParam ? [typeParam] : [],
  });

  useEffect(() => {
    setFilter({
      ...EMPTY_FILTER,
      featured: activeTab === "featured",
      isSeason: activeTab === "season",
      productTypes: typeParam ? [typeParam] : [],
    });
  }, [activeTab, typeParam]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<FilterKey | null>(null);

  const productTypeList = [...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)), ...customProductTypes];
  const seasonList = [...SEASONS.filter((s) => !hiddenSeasons.includes(s)), ...customSeasons];

  const filteredProducts = applyFilter(products, filter)
    .filter((p) => {
      if (!filter.isSeason && hiddenProductTypes.includes(p.product_type)) return false;
      if (p.seasons.length > 0 && p.seasons.every((s) => hiddenSeasons.includes(s))) return false;
      return true;
    })
    .sort((a, b) => {
      if (activeTab !== "all") return 0;
      const order = [...PRODUCT_TYPES, ...customProductTypes];
      const ai = order.indexOf(a.product_type);
      const bi = order.indexOf(b.product_type);
      return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
    });

  const hasFilter = filter.flowerColors.length > 0 || filter.wrappingColors.length > 0 || filter.moods.length > 0;

  const toggleFilter = (key: FilterKey, value: string) =>
    setFilter((f) => ({
      ...f,
      [key]: (f[key] as string[]).includes(value)
        ? (f[key] as string[]).filter((v) => v !== value)
        : [...(f[key] as string[]), value],
    }));

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: "flowerColors", label: "색상" },
    { key: "wrappingColors", label: "포장지" },
    { key: "moods", label: "분위기" },
  ];

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars}>
      <div className="sticky top-0 z-40">
        <StoreHeader
          slug={slug}
          companyName={companyName}
          logoImage={logoImage}
          productTypeList={productTypeList}
          seasonList={seasonList}
          consultEnabled={consultEnabled}
        />

        {/* PC 필터 띠 */}
        <div className="hidden md:flex items-center gap-2 px-8 py-2 bg-white border-b border-gray-100">
          {/* 선택된 필터 칩 */}
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            {filter.flowerColors.map((c) => (
              <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 text-xs font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FLOWER_COLOR_MAP[c] }} />
                {c}
                <button onClick={() => toggleFilter("flowerColors", c)} className="ml-0.5 opacity-50 hover:opacity-100">✕</button>
              </span>
            ))}
            {filter.wrappingColors.map((c) => (
              <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 text-xs font-medium">
                {c}
                <button onClick={() => toggleFilter("wrappingColors", c)} className="ml-0.5 opacity-50 hover:opacity-100">✕</button>
              </span>
            ))}
            {filter.moods.map((m) => (
              <span key={m} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 text-xs font-medium">
                {m}
                <button onClick={() => toggleFilter("moods", m)} className="ml-0.5 opacity-50 hover:opacity-100">✕</button>
              </span>
            ))}
          </div>

          {/* 필터 해제 */}
          {hasFilter && (
            <button
              onClick={() => setFilter(EMPTY_FILTER)}
              className="shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              필터 해제
            </button>
          )}

          {/* 필터 아이콘 */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenFilterDropdown(openFilterDropdown === "flowerColors" ? null : "flowerColors")}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                hasFilter ? "border-gold-400 text-gold-500" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="11" y1="18" x2="13" y2="18" />
              </svg>
            </button>

            {openFilterDropdown !== null && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenFilterDropdown(null)} />
                <div className="absolute top-full right-0 mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-4 w-64">
                  {/* 색상 */}
                  <p className="text-xs font-semibold text-gold-500 mb-2">색상</p>
                  <div className="grid grid-cols-2 gap-1 mb-4">
                    {FLOWER_COLORS.map((color) => {
                      const active = filter.flowerColors.includes(color);
                      return (
                        <button
                          key={color}
                          onClick={() => toggleFilter("flowerColors", color)}
                          className={`flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                            active ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: FLOWER_COLOR_MAP[color] }} />
                          {color}
                        </button>
                      );
                    })}
                  </div>
                  {/* 포장지 */}
                  <p className="text-xs font-semibold text-gold-500 mb-2">포장지</p>
                  <div className="flex flex-col gap-1 mb-4">
                    {WRAPPING_COLORS.map((wc) => {
                      const active = filter.wrappingColors.includes(wc);
                      return (
                        <button
                          key={wc}
                          onClick={() => toggleFilter("wrappingColors", wc)}
                          className={`flex items-center justify-center text-center px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                            active ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {wc}
                        </button>
                      );
                    })}
                  </div>
                  {/* 분위기 */}
                  <p className="text-xs font-semibold text-gold-500 mb-2">분위기</p>
                  <div className="flex flex-col gap-1">
                    {MOODS.map((mood) => {
                      const active = filter.moods.includes(mood);
                      return (
                        <button
                          key={mood}
                          onClick={() => toggleFilter("moods", mood)}
                          className={`flex items-center justify-center text-center px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                            active ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {mood}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 모바일 필터 모달 */}
        <MobileFilter
          filter={filter}
          setFilter={setFilter}
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          hasFilter={hasFilter}
        />
      </div>

      {/* 상품 목록 */}
      <div className="max-w-6xl mx-auto">
        <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />
      </div>

      <div className="pb-8">
        <FloAideFooter />
      </div>

      {/* 모바일 필터 FAB */}
      <button
        onClick={() => setMobileFilterOpen(true)}
        className="md:hidden fixed bottom-6 right-5 z-30 w-12 h-12 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasFilter ? "text-gold-500" : "text-gray-600"}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        {hasFilter && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold-500" />}
      </button>

    </div>
  );
}
