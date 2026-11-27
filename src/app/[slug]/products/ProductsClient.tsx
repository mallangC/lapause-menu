"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Product, FilterState } from "@/types";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import { SEASONS, PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import MobileFilter from "@/components/main/MobileFilter";
import ProductGrid from "@/components/main/ProductGrid";
import StoreHeader from "@/components/main/StoreHeader";
import { sortByOrder } from "@/lib/productTypes";
import StoreFooter from "@/components/main/StoreFooter";
import { formatDeadline, isDeadlinePassed } from "@/lib/seasonDeadline";

interface ProductsClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  products: Product[];
  hiddenProductTypes: string[];
  hiddenSeasons: string[];
  /** 시즌 예약 마감 시각 { 시즌 이름: 값 } — 시즌 메뉴 위 안내·메뉴 서랍 표시 */
  seasonDeadlines?: Record<string, string>;
  customProductTypes: string[];
  customSeasons: string[];
  /** 사장님이 정한 상품 유형·시즌 순서 */
  productTypeOrder?: string[];
  seasonOrder?: string[];
  consultEnabled: boolean;
  /** 바로 구매 메뉴 — 이름과 안내 (숨겼으면 null) */
  instantMenu?: { name: string; unattended: boolean } | null;
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
  seasonDeadlines = {},
  customProductTypes,
  customSeasons,
  productTypeOrder,
  seasonOrder,
  consultEnabled,
  instantMenu = null,
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
  const tab = searchParams.get("tab") as "featured" | "season" | "instant" | null;
  const typeParam = searchParams.get("type");
  // 메뉴 서랍에서 고른 시즌 (?tab=season&season=크리스마스) — 없으면 시즌 상품 전체
  const seasonParam = searchParams.get("season");
  const activeTab = tab === "featured" ? "featured" : tab === "season" ? "season" : tab === "instant" && instantMenu ? "instant" : "all";

  const [filter, setFilter] = useState<FilterState>({
    ...EMPTY_FILTER,
    featured: activeTab === "featured",
    isSeason: activeTab === "season",
    isInstant: activeTab === "instant",
    productTypes: typeParam ? [typeParam] : [],
    seasons: activeTab === "season" && seasonParam ? [seasonParam] : [],
  });

  useEffect(() => {
    setFilter({
      ...EMPTY_FILTER,
      featured: activeTab === "featured",
      isSeason: activeTab === "season",
      isInstant: activeTab === "instant",
      productTypes: typeParam ? [typeParam] : [],
      seasons: activeTab === "season" && seasonParam ? [seasonParam] : [],
    });
  }, [activeTab, typeParam, seasonParam]);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  // 지금 보는 시즌의 예약 마감 시각 (시즌 메뉴에서 시즌을 골랐을 때만)
  const seasonDeadline = activeTab === "season" && seasonParam ? seasonDeadlines[seasonParam] : undefined;
  const seasonClosed = !!seasonDeadline && isDeadlinePassed(seasonDeadline);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<FilterKey | null>(null);

  // 사장님이 메뉴 설정에서 정한 순서대로
  const productTypeList = sortByOrder([...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)), ...customProductTypes], productTypeOrder);
  const seasonList = sortByOrder([...SEASONS.filter((s) => !hiddenSeasons.includes(s)), ...customSeasons], seasonOrder);

  const filteredProducts = applyFilter(products, filter)
    .filter((p) => {
      if (!filter.isSeason && !filter.isInstant && hiddenProductTypes.includes(p.product_type)) return false;
      // 숨긴 시즌만 붙은 상품은 뺀다 (바로 구매 메뉴에서는 시즌과 관계없이 보인다)
      if (!filter.isInstant && p.seasons.length > 0 && p.seasons.every((s) => hiddenSeasons.includes(s))) return false;
      return true;
    })
    // 전체 상품: 상품 유형 순서(메뉴 설정)대로 묶고 그 안에서 금액 낮은 순
    // 시즌·인기·바로 구매 등 다른 탭: 금액 낮은 순 (같은 금액이면 이름순)
    .sort((a, b) => {
      const byPrice = (a.price ?? 0) - (b.price ?? 0) || a.name.localeCompare(b.name, "ko");
      if (activeTab !== "all") return byPrice;
      const order = sortByOrder([...PRODUCT_TYPES, ...customProductTypes], productTypeOrder);
      const ai = order.indexOf(a.product_type);
      const bi = order.indexOf(b.product_type);
      return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi) || byPrice;
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
          instantMenu={instantMenu && products.some((p) => p.instant) ? instantMenu.name : null}
          seasonDeadlines={seasonDeadlines}
        />

        {/* 시즌 예약 마감 띠 — 헤더 바로 아래 화면 폭 전체 (마감 전엔 언제까지, 마감 뒤엔 마감 안내. 상품은 그대로 보이고 예약 마감 표시) */}
        {seasonDeadline && (
          <div
            className={`px-4 py-2 text-center text-xs md:text-sm font-medium text-white break-keep ${
              seasonClosed ? "bg-gray-500" : "bg-gold-500"
            }`}
          >
            {seasonClosed
              ? `${seasonParam} 시즌 예약이 마감되었어요`
              : `${seasonParam} 예약은 ${formatDeadline(seasonDeadline)}까지예요`}
          </div>
        )}

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
                <div className="absolute top-full right-0 mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-4 w-[340px] max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain">
                  {/* 세로가 짧은 화면에서도 잘리지 않게 — 줄 수를 줄이고(색상 3열·포장지 한 줄·분위기 2열), 그래도 넘치면 창 안에서 스크롤 */}
                  {/* 색상 */}
                  <p className="text-xs font-semibold text-gold-500 mb-2">색상</p>
                  <div className="grid grid-cols-3 gap-1 mb-4">
                    {FLOWER_COLORS.map((color) => {
                      const active = filter.flowerColors.includes(color);
                      return (
                        <button
                          key={color}
                          onClick={() => toggleFilter("flowerColors", color)}
                          className={`flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg text-sm border transition-colors whitespace-nowrap ${
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
                  <div className="grid grid-cols-3 gap-1 mb-4">
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
                  <div className="grid grid-cols-2 gap-1">
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
          if (activeTab === "instant" && instantMenu) {
            return (
              <>
                <div className="pt-3.5 pb-2.5 px-4 md:px-2">
                  <p className="text-lg font-semibold text-gray-800">{instantMenu.name}</p>
                </div>
                <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />
              </>
            );
          }
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
              {/* 제목 위 여백은 짧게 — 바로 위 메뉴 줄과 붙어 보이지 않을 만큼만 */}
              <div className="pt-3.5 pb-2.5 px-4 md:px-2">
                <p className="text-lg font-semibold text-gray-800">추천·인기 상품</p>
              </div>
              <ProductGrid products={featured} consultEnabled={consultEnabled} slug={slug} />

              {/* 전체 상품 */}
              {rest.length > 0 && (
                <>
                  {/* 제목 위 여백은 추천·인기 상품과 같은 정도로 짧게 */}
                  <div className="pt-4 pb-2.5 px-4 md:px-2">
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

      {/* 모바일 FAB (필터) — 메뉴판은 보는 곳이라 상담 버튼은 두지 않는다 (로고를 누르면 첫 화면 대화로) */}
      <div className="md:hidden fixed bottom-6 right-5 z-30 flex flex-col items-center gap-3">
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
