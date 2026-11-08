"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product, FilterState } from "@/types";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import { SEASONS, PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import MobileFilter from "@/components/main/MobileFilter";
import PreviewProductGrid from "./PreviewProductGrid";
import PreviewStoreHeader from "./PreviewStoreHeader";
import BusinessInfoFooter from "@/components/BusinessInfoFooter";

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
  /** 로고 이미지 대신 직접 그릴 로고 (미리보기용) */
  logoNode?: React.ReactNode;
}

type FilterKey = "flowerColors" | "wrappingColors" | "moods";

// 미리보기는 정책 페이지로 이동하지 않아 이름만 둔다
const POLICY_LINKS = [{ label: "이용 안내" }, { label: "환불 정책" }, { label: "이용약관" }];

// 미리보기 메뉴판 — 실제 ProductsClient 복사본 (실제 매장 코드와 분리)
export default function PreviewProductsClient({
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
  phone,
  representativeName,
  businessNumber,
  mailOrderNumber,
  address,
  logoNode,
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
  // 푸터 링크 버튼 안내 (미리보기는 외부로 이동하지 않는다)
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const linkNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // target은 조사까지 붙인 연결 대상 (예: "사장님이 등록한 인스타그램으로", "이용약관 페이지로")
  const showLinkNotice = (label: string) => {
    setLinkNotice(label);
    if (linkNoticeTimer.current) clearTimeout(linkNoticeTimer.current);
    linkNoticeTimer.current = setTimeout(() => setLinkNotice(null), 2500);
  };
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
        <PreviewStoreHeader
          slug={slug}
          companyName={companyName}
          logoImage={logoImage}
          productTypeList={productTypeList}
          seasonList={seasonList}
          consultEnabled={consultEnabled}
          logoNode={logoNode}
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
            return <PreviewProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />;
          }

          const featured = filteredProducts.filter((p) => p.is_recommended || p.is_popular);
          const rest = filteredProducts.filter((p) => !p.is_recommended && !p.is_popular);

          if (featured.length === 0) {
            return <PreviewProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />;
          }

          return (
            <>
              {/* 추천·인기 섹션 */}
              <div className="pt-6 pb-3 px-4 md:px-2">
                <p className="text-lg font-semibold text-gray-800">추천·인기 상품</p>
              </div>
              <PreviewProductGrid products={featured} consultEnabled={consultEnabled} slug={slug} />

              {/* 전체 상품 */}
              {rest.length > 0 && (
                <>
                  <div className="pt-8 pb-3 px-4 md:px-2">
                    <p className="text-lg font-semibold text-gray-800">전체 상품</p>
                  </div>
                  <PreviewProductGrid products={rest} consultEnabled={consultEnabled} slug={slug} />
                </>
              )}
            </>
          );
        })()}
        {/* 모바일 FAB (맞춤주문 + 필터) — 상품 목록 끝에 붙인 sticky 칸. 스크롤 중엔 화면 아래(24px)에 붙어 있다가
            목록이 끝나면(푸터가 올라오면) 목록 끝, 곧 푸터 바로 위에 멈춘다. 브라우저가 직접 처리해 스크롤과 같은 박자로 움직인다
            (높이 0인 칸이라 목록 길이는 그대로, 버튼은 그 칸 위로 띄운다) */}
        <div className="md:hidden sticky bottom-2 z-30 h-0 pointer-events-none">
          <div className="pointer-events-auto absolute right-5 bottom-4 flex flex-col items-center gap-3">
            {consultEnabled && (
              <Link
                href={`/${slug}/consult`}
                className="flex flex-col items-center gap-1"
                aria-label="맞춤주문"
              >
                {/* data-coach — 모바일 설명이 '맞춤주문' 글자 빼고 동그라미 버튼만 강조 */}
                <span data-coach="home-consult-circle" className="w-16 h-16 rounded-full bg-gold-500 shadow-lg flex items-center justify-center text-white">
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
              {/* data-coach — 모바일 설명이 '필터' 글자 빼고 동그라미 버튼만 강조 */}
              <span data-coach="home-filter-circle" className="relative w-16 h-16 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center">
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
      </div>

      {/* 푸터 — 아래에 미리보기 이동 바가 떠 있어서 사업자 정보가 가리지 않게 아래 여백을 더 둔다 */}
      <div className="bg-white border-t border-gray-100 pb-12">
        {/* w-fit — 내용 너비만큼만 차지해서 설명 하이라이트가 좌우로 길게 퍼지지 않는다 (가운데 정렬은 mx-auto로 그대로) */}
        <div data-coach="home-footer" className="w-fit max-w-4xl mx-auto px-4 py-8 flex flex-col items-center gap-8">
          {/* 미리보기 — 사장님이 링크를 등록했을 때처럼 네 버튼을 모두 보여주고, 누르면 이동 대신 안내만 띄운다 */}
          {(
            <div className="flex flex-row gap-8 justify-center">
              {(
                <button type="button" onClick={() => showLinkNotice("사장님이 등록한 매장 위치(지도)로")} className="flex flex-col items-center gap-2 group">
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#56C0E0" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">매장 위치</span>
                </button>
              )}
              {(
                <button type="button" onClick={() => showLinkNotice("사장님이 등록한 카카오 채널로")} className="flex flex-col items-center gap-2 group">
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#FEE500" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#191919">
                      <path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z" />
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">카카오 채널</span>
                </button>
              )}
              {(
                <button type="button" onClick={() => showLinkNotice("사장님이 등록한 인스타그램으로")} className="flex flex-col items-center gap-2 group">
                  <span className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">인스타그램</span>
                </button>
              )}
              {(
                <button type="button" onClick={() => showLinkNotice("사장님이 등록한 유튜브로")} className="flex flex-col items-center gap-2 group">
                  <span data-coach="home-footer-dot" className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm transition-opacity group-hover:opacity-80" style={{ backgroundColor: "#FF0000" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">유튜브</span>
                </button>
              )}
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
              {POLICY_LINKS.map(({ label }, i) => (
                <span key={label} className="flex items-center gap-4">
                  {i > 0 && <span className="text-gray-200">·</span>}
                  {/* 미리보기 — 정책 페이지로 이동하지 않고 안내만 띄운다 */}
                  <button type="button" onClick={() => showLinkNotice(`${label} 페이지로`)} className="hover:text-gray-600 transition-colors">{label}</button>
                </span>
              ))}
            </div>
            <BusinessInfoFooter
              store={{
                name: companyName,
                representativeName,
                businessNumber,
                mailOrderNumber,
                address,
                phone,
              }}
            />
          </div>
        </div>
      </div>

      {/* 푸터 링크 안내 토스트 — 이동 바(아래) 위에 띄운다 */}
      {linkNotice && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[47] w-[calc(100%-32px)] max-w-sm px-4 py-3 rounded-2xl text-center text-[13px] leading-relaxed text-white shadow-xl"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", background: "rgba(24,19,14,0.92)" }}
          role="status"
        >
          실제 메뉴판에서는 {linkNotice} 연결돼요.
          <br />
          <span className="text-white/60">미리보기라 이동하지 않아요.</span>
        </div>
      )}


    </div>
  );
}
