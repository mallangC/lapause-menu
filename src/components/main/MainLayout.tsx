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
  homeFeaturedImage?: string | null;
  homeAllImage?: string | null;
  homeSeasonImage?: string | null;
  naverTalkUrl?: string | null;
  kakaoChannelUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
}

export default function MainLayout({ products, companyName = "Lapause Fleur", logoImage, themeVars, slug, homeFeaturedImage, homeAllImage, homeSeasonImage, naverTalkUrl, kakaoChannelUrl, instagramUrl, youtubeUrl }: MainLayoutProps) {
  const [showHome, setShowHome] = useState(true);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 비활성 타이머: 랜딩이 아닐 때만
  useEffect(() => {
    if (showHome) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowHome(true);
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
  }, [showHome]);

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
    <Image src={logoImage} alt={companyName} width={200} height={48} className={`object-contain transition-all w-auto ${showHome ? "h-12" : "h-8"}`} />
  ) : (
    <span className={`font-light tracking-widest text-gold-500 transition-all ${showHome ? "text-3xl" : "text-xl"}`}>{companyName}</span>
  );

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars as React.CSSProperties}>
      {/* 헤더 */}
      <header className="border-b border-gray-100 bg-white">
        <div className={`max-w-6xl mx-auto px-4 flex items-center justify-center transition-all ${showHome ? "py-6" : "py-4"}`}>
          {slug ? <Link href={`/${slug}/admin`}>{logo}</Link> : logo}
        </div>
      </header>

      {/* 내비게이션: 랜딩일 때 숨김 */}
      {!showHome && (
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

            {/* 모든 상품 (ALL) */}
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
                모든 상품
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
      {!showHome && (isAll || isSeason) && (
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
      {showHome ? (
        /* 랜딩 페이지 */
        <div className="max-w-4xl mx-auto px-4 pt-14 pb-14 flex flex-col items-center gap-16">
          <div className="grid grid-cols-1 gap-4 w-full max-w-70 mx-auto md:max-w-none md:grid-cols-3 md:gap-6">
            {[
              { label: "추천/인기", image: homeFeaturedImage, onClick: () => { setFilter({ ...EMPTY_FILTER, featured: true }); setShowHome(false); } },
              { label: "모든 상품", image: homeAllImage, onClick: () => { setFilter(EMPTY_FILTER); setShowHome(false); } },
              { label: "시즌", image: homeSeasonImage, onClick: () => { setFilter({ ...EMPTY_FILTER, isSeason: true }); setShowHome(false); } },
            ].map(({ label, image, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`relative flex items-center justify-center overflow-hidden bg-beige-50 rounded-2xl aspect-square md:aspect-auto md:py-35 transition-all shadow-sm group ${image ? "border-0" : "border border-gray-200 hover:border-gold-400"}`}
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

          {/* 채널 링크 버튼 */}
          {(naverTalkUrl || kakaoChannelUrl || instagramUrl || youtubeUrl) && (
            <div className="flex flex-row gap-8 justify-center">
              {naverTalkUrl && (
                <a
                  href={naverTalkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#03C75A" }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                      <path d="M13.554 12.627 10.256 7H7v10h3.446l-.001-5.627L13.744 17H17V7h-3.446z"/>
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">네이버 예약</span>
                </a>
              )}
              {kakaoChannelUrl && (
                <a
                  href={kakaoChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#FEE500" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#191919">
                      <path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z"/>
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">카카오 채널</span>
                </a>
              )}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">인스타그램</span>
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#FF0000" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">유튜브</span>
                </a>
              )}
            </div>
          )}
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
