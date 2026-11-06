"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product, FilterState } from "@/types";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import { SEASONS, PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import MobileFilter from "@/components/main/MobileFilter";
import ProductGrid from "@/components/main/ProductGrid";
import StoreHeader from "@/components/main/StoreHeader";
import StoreFooter from "@/components/main/StoreFooter";

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
  locationUrl?: string | null;
  kakaoChannelUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  phone?: string | null;
  representativeName?: string | null;
  businessNumber?: string | null;
  mailOrderNumber?: string | null;
  address?: string | null;
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
  locationUrl,
  kakaoChannelUrl,
  instagramUrl,
  youtubeUrl,
  phone,
  representativeName,
  businessNumber,
  mailOrderNumber,
  address,
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
    // 세로 flex — 상품이 적거나 없어도 푸터가 화면 바닥보다 위로 올라오지 않게 (상품 목록이 남는 높이를 채운다)
    <div className="min-h-screen flex flex-col bg-beige-100" style={themeVars}>
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
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 border ${c === "흰색" ? "border-gray-300 shadow-sm" : "border-gray-200"}`} style={{ backgroundColor: FLOWER_COLOR_MAP[c] }} />
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
              aria-label="필터"
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
                          <span className={`w-3.5 h-3.5 rounded-full shrink-0 border ${color === "흰색" ? "border-gray-300 shadow-sm" : "border-gray-200"}`} style={{ backgroundColor: FLOWER_COLOR_MAP[color] }} />
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

      {/* 상품 목록 — 남는 높이를 채워 푸터를 화면 바닥으로 민다 */}
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        {(() => {
          if (activeTab !== "all" || hasFilter || !!typeParam) {
            return <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />;
          }

          const featured = filteredProducts.filter((p) => p.is_recommended || p.is_popular);
          const rest = filteredProducts.filter((p) => !p.is_recommended && !p.is_popular);

          if (featured.length === 0) {
            return <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />;
          }

          return (
            <>
              {/* 추천·인기 섹션 */}
              <div className="pt-6 pb-3 px-4 md:px-2">
                <p className="text-lg font-semibold text-gray-800">추천·인기 상품</p>
              </div>
              <ProductGrid products={featured} consultEnabled={consultEnabled} slug={slug} />

              {/* 전체 상품 */}
              {rest.length > 0 && (
                <>
                  <div className="pt-8 pb-3 px-4 md:px-2">
                    <p className="text-lg font-semibold text-gray-800">전체 상품</p>
                  </div>
                  <ProductGrid products={rest} consultEnabled={consultEnabled} slug={slug} />
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* 푸터 — 마지막 상품 바로 아래에 붙이고, 위에 옅은 회색 선으로 구분한다 (첫 화면과 같은 푸터) */}
      <StoreFooter
        companyName={companyName}
        locationUrl={locationUrl}
        kakaoChannelUrl={kakaoChannelUrl}
        instagramUrl={instagramUrl}
        youtubeUrl={youtubeUrl}
        representativeName={representativeName}
        businessNumber={businessNumber}
        mailOrderNumber={mailOrderNumber}
        address={address}
        phone={phone}
      />

      {/* 모바일 FAB (맞춤주문 + 필터) */}
      <div className="md:hidden fixed bottom-6 right-5 z-30 flex flex-col items-center gap-3">
        {consultEnabled && (
          <Link
            href={`/${slug}/consult`}
            className="flex flex-col items-center gap-1"
            aria-label="맞춤주문"
          >
            <span className="w-16 h-16 rounded-full bg-gold-500 shadow-lg flex items-center justify-center text-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </span>
            <span className="text-xs font-bold text-white leading-none [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">맞춤주문</span>
          </Link>
        )}
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="flex flex-col items-center gap-1"
          aria-label="필터"
        >
          <span className="relative w-16 h-16 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasFilter ? "text-gold-500" : "text-gray-600"}>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {hasFilter && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-gold-500" />}
          </span>
          <span className="text-xs font-bold text-white leading-none [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">필터</span>
        </button>
      </div>

    </div>
  );
}
