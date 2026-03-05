"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, FilterState } from "@/types";
import { INACTIVITY_TIMEOUT_MS, PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, SEASONS } from "@/lib/constants";
import ProductGrid from "./ProductGrid";

const EMPTY_FILTER: FilterState = {
  productTypes: [],
  flowerColors: [],
  wrappingColors: [],
  seasons: [],
  featured: false,
  isSeason: false,
};

function applyFilter(products: Product[], filter: FilterState): Product[] {
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

interface MainLayoutProps {
  products: Product[];
  companyName?: string;
  logoImage?: string | null;
  themeVars?: Record<string, string>;
  slug?: string;
  landingFeaturedImage?: string | null;
  landingAllImage?: string | null;
  landingSeasonImage?: string | null;
}

export default function MainLayout({ products, companyName = "Lapause Fleur", logoImage, themeVars, slug, landingFeaturedImage, landingAllImage, landingSeasonImage }: MainLayoutProps) {
  const [showLanding, setShowLanding] = useState(true);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 비활성 타이머: 랜딩이 아닐 때만
  useEffect(() => {
    if (showLanding) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowLanding(true);
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
  }, [showLanding]);

  const handleEnter = (tab: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setOpenDropdown(tab);
  };

  const handleLeave = () => {
    dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const isAll = !filter.featured && !filter.isSeason;
  const isSeason = filter.isSeason;

  const filteredProducts = applyFilter(products, filter);

  const logo = logoImage ? (
    <Image src={logoImage} alt={companyName} width={200} height={48} className={`object-contain transition-all w-auto ${showLanding ? "h-12" : "h-8"}`} />
  ) : (
    <span className={`font-light tracking-widest text-gold-500 transition-all ${showLanding ? "text-3xl" : "text-xl"}`}>{companyName}</span>
  );

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars as React.CSSProperties}>
      {/* 헤더 */}
      <header className="border-b border-gray-100 bg-white">
        <div className={`max-w-6xl mx-auto px-4 flex items-center justify-center transition-all ${showLanding ? "py-6" : "py-4"}`}>
          {slug ? <Link href={`/${slug}/admin`}>{logo}</Link> : logo}
        </div>
      </header>

      {/* 내비게이션: 랜딩일 때 숨김 */}
      {!showLanding && (
        <nav className="border-b border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 flex gap-1 justify-center">

            {/* 추천/인기 */}
            <button
              onClick={() => setFilter({ ...EMPTY_FILTER, featured: true })}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                filter.featured
                  ? "border-gold-500 text-gold-500"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              추천/인기
            </button>

            {/* 모든 꽃 (ALL) */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("ALL")}
              onMouseLeave={handleLeave}
            >
              <button
                onClick={() => { setFilter(EMPTY_FILTER); setMobileFilterOpen(true); }}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isAll
                    ? "border-gold-500 text-gold-500"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                모든 꽃
              </button>
              {openDropdown === "ALL" && (
                <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                    {/* 상품 유형 */}
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">상품 유형</h3>
                      <div className="grid grid-cols-2 gap-1">
                        {PRODUCT_TYPES.map((type) => (
                          <button
                            key={type}
                            onClick={() =>
                              setFilter((f) => ({
                                ...f,
                                featured: false,
                                seasons: [],
                                productTypes: f.productTypes.includes(type)
                                  ? f.productTypes.filter((t) => t !== type)
                                  : [...f.productTypes, type],
                              }))
                            }
                            className={`text-center text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                              filter.productTypes.includes(type)
                                ? "border-gold-400 bg-gold-400 text-white font-medium"
                                : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 꽃 색상 */}
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">꽃 색상</h3>
                      <div className="grid grid-cols-5 gap-2 justify-items-center">
                        {FLOWER_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() =>
                              setFilter((f) => ({
                                ...f,
                                featured: false,
                                seasons: [],
                                flowerColors: f.flowerColors.includes(color)
                                  ? f.flowerColors.filter((c) => c !== color)
                                  : [...f.flowerColors, color],
                              }))
                            }
                            className={`w-7 h-7 rounded-full border-2 transition-all ${
                              filter.flowerColors.includes(color)
                                ? "border-gold-500 scale-110"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                            style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 포장지 색상 */}
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-500 mb-2">포장지 색상</h3>
                      <div className="grid grid-cols-3 gap-1">
                        {WRAPPING_COLORS.map((wc) => (
                          <button
                            key={wc}
                            onClick={() =>
                              setFilter((f) => ({
                                ...f,
                                featured: false,
                                seasons: [],
                                wrappingColors: f.wrappingColors.includes(wc)
                                  ? f.wrappingColors.filter((c) => c !== wc)
                                  : [...f.wrappingColors, wc],
                              }))
                            }
                            className={`text-center text-sm px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                              filter.wrappingColors.includes(wc)
                                ? "border-gold-400 bg-gold-400 text-white font-medium"
                                : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                            }`}
                          >
                            {wc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(filter.productTypes.length > 0 || filter.flowerColors.length > 0 || filter.wrappingColors.length > 0) && (
                      <button
                        onClick={() => setFilter(EMPTY_FILTER)}
                        className="mt-3 w-full text-xs py-1.5 rounded-lg border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white transition-colors"
                      >
                        필터 해제
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 시즌 */}
            <div
              className="relative"
              onMouseEnter={() => handleEnter("시즌")}
              onMouseLeave={handleLeave}
            >
              <button
                onClick={() => {
                  if (isSeason) return;
                  setFilter({ ...EMPTY_FILTER, isSeason: true });
                }}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isSeason
                    ? "border-gold-500 text-gold-500"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                시즌
              </button>
              {openDropdown === "시즌" && (
                <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-36">
                    <div className="flex flex-col gap-1">
                      {SEASONS.map((season) => (
                        <button
                          key={season}
                          onClick={() =>
                            setFilter({
                              ...EMPTY_FILTER,
                              isSeason: true,
                              seasons: filter.seasons.length === 1 && filter.seasons.includes(season) ? [] : [season],
                            })
                          }
                          className={`text-center text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                            filter.seasons.includes(season)
                              ? "border-gold-400 bg-gold-400 text-white font-medium"
                              : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                          }`}
                        >
                          {season}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </nav>
      )}

      {/* 모바일 필터 섹션 */}
      {!showLanding && (isAll || isSeason) && (
        <div className="md:hidden border-b border-gray-100 bg-white">
          <button
            onClick={() => setMobileFilterOpen((v) => !v)}
            className="w-full flex items-center justify-end px-4 py-3"
          >
            <span className="text-gold-500 text-sm">{mobileFilterOpen ? "▲" : "▼"}</span>
          </button>
          {mobileFilterOpen && (
          <div className="px-4 pb-4 space-y-4">
          {isAll && (
            <>
              {/* 상품 유형 */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">상품 유형</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRODUCT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          featured: false,
                          seasons: [],
                          productTypes: f.productTypes.includes(type)
                            ? f.productTypes.filter((t) => t !== type)
                            : [...f.productTypes, type],
                        }))
                      }
                      className={`text-center text-sm py-2 rounded-lg border transition-colors ${
                        filter.productTypes.includes(type)
                          ? "border-gold-400 bg-gold-400 text-white font-medium"
                          : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 꽃 색상 */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">꽃 색상</h3>
                <div className="grid grid-cols-9 gap-2">
                  {FLOWER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          featured: false,
                          seasons: [],
                          flowerColors: f.flowerColors.includes(color)
                            ? f.flowerColors.filter((c) => c !== color)
                            : [...f.flowerColors, color],
                        }))
                      }
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        filter.flowerColors.includes(color)
                          ? "border-gold-500 scale-110"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* 포장지 색상 */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">포장지 색상</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {WRAPPING_COLORS.map((wc) => (
                    <button
                      key={wc}
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          featured: false,
                          seasons: [],
                          wrappingColors: f.wrappingColors.includes(wc)
                            ? f.wrappingColors.filter((c) => c !== wc)
                            : [...f.wrappingColors, wc],
                        }))
                      }
                      className={`text-center text-sm py-2 rounded-lg border transition-colors whitespace-nowrap ${
                        filter.wrappingColors.includes(wc)
                          ? "border-gold-400 bg-gold-400 text-white font-medium"
                          : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                      }`}
                    >
                      {wc}
                    </button>
                  ))}
                </div>
              </div>

              {(filter.productTypes.length > 0 || filter.flowerColors.length > 0 || filter.wrappingColors.length > 0) && (
                <button
                  onClick={() => setFilter(EMPTY_FILTER)}
                  className="w-full text-xs py-2 rounded-lg border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white transition-colors"
                >
                  필터 해제
                </button>
              )}
            </>
          )}

          {isSeason && (
            <div>
              <div className="grid grid-cols-3 gap-1.5">
                {SEASONS.map((season) => (
                  <button
                    key={season}
                    onClick={() =>
                      setFilter({
                        ...EMPTY_FILTER,
                        isSeason: true,
                        seasons: filter.seasons.length === 1 && filter.seasons.includes(season) ? [] : [season],
                      })
                    }
                    className={`text-center text-sm py-2 rounded-lg border transition-colors ${
                      filter.seasons.includes(season)
                        ? "border-gold-400 bg-gold-400 text-white font-medium"
                        : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                    }`}
                  >
                    {season}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {/* 컨텐츠 */}
      {showLanding ? (
        /* 랜딩 페이지 */
        <div className="max-w-4xl mx-auto px-4 pt-14 pb-14 flex flex-col items-center gap-6">
          <div className="grid grid-cols-1 gap-4 w-full max-w-70 mx-auto md:max-w-none md:grid-cols-3 md:gap-6">
            {[
              { label: "추천/인기", image: landingFeaturedImage, onClick: () => { setFilter({ ...EMPTY_FILTER, featured: true }); setShowLanding(false); } },
              { label: "모든 꽃", image: landingAllImage, onClick: () => { setFilter(EMPTY_FILTER); setShowLanding(false); } },
              { label: "시즌", image: landingSeasonImage, onClick: () => { setFilter({ ...EMPTY_FILTER, isSeason: true }); setShowLanding(false); } },
            ].map(({ label, image, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`relative flex items-center justify-center overflow-hidden bg-beige-50 rounded-2xl aspect-square md:aspect-auto md:py-24 transition-all shadow-sm group ${image ? "border-0" : "border border-gray-200 hover:border-gold-400"}`}
              >
                {image && (
                  <Image
                    src={image}
                    alt={label}
                    fill
                    className="object-cover"
                  />
                )}
                <div className={`absolute inset-0 rounded-2xl transition-opacity ${image ? "bg-black/15 group-hover:bg-black/25" : "group-hover:bg-gold-400/5"}`} />
                <span className={`relative text-3xl font-bold transition-colors ${image ? "text-white" : "text-foreground group-hover:text-gold-500"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <main>
            <ProductGrid products={filteredProducts} />
          </main>
        </div>
      )}
    </div>
  );
}
