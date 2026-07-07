"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Product, FilterState } from "@/types";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import { SEASONS, PRODUCT_TYPES } from "@/lib/constants";
import MainNav from "@/components/main/MainNav";
import FilterPanel from "@/components/main/FilterPanel";
import MobileFilter from "@/components/main/MobileFilter";
import ProductGrid from "@/components/main/ProductGrid";
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
  const userClosedFilter = useRef(false);
  const [openDropdown, setOpenDropdown] = useState<"all" | "season" | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const logo = logoImage ? (
    <Image src={logoImage} alt={companyName} width={200} height={40} className="object-contain h-9 w-auto" />
  ) : (
    <span className="font-light tracking-widest text-gold-500 text-xl">{companyName}</span>
  );

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars}>
      {/* 헤더 + 서브탭 */}
      <div className="sticky top-0 z-40">
        <header className="border-b border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center">
            <Link href={`/${slug}`}>{logo}</Link>
          </div>
        </header>

        {/* 서브탭 + 필터 드롭다운 (데스크톱) */}
        <nav className="border-b border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-2 flex justify-center gap-0">

            {/* 전체 탭 + 호버 드롭다운 */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
                setOpenDropdown("all");
              }}
              onMouseLeave={() => {
                dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 150);
              }}
            >
              <Link
                href={`/${slug}/products`}
                className={`block px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "all" ? "border-gold-500 text-gold-500" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                전체
              </Link>
              {openDropdown === "all" && (
                <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-80">
                    <FilterPanel
                      filter={filter}
                      setFilter={setFilter}
                      hiddenProductTypes={hiddenProductTypes}
                      customProductTypes={customProductTypes}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 시즌 탭 + 호버 드롭다운 */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
                setOpenDropdown("season");
              }}
              onMouseLeave={() => {
                dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 150);
              }}
            >
              <Link
                href={`/${slug}/products?tab=season`}
                className={`block px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "season" ? "border-gold-500 text-gold-500" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                시즌
              </Link>
              {openDropdown === "season" && (
                <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-36">
                    <div className="flex flex-col gap-1">
                      {[...SEASONS.filter((s) => !hiddenSeasons.includes(s)), ...customSeasons].map((season) => (
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
                              : "border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-500"
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

            {consultEnabled && (
              <Link
                href={`/${slug}/consult`}
                className="my-auto ml-2 px-4 py-1.5 rounded-full bg-gold-500 text-white text-xs font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
              >
                맞춤주문
              </Link>
            )}
          </div>
        </nav>

        {/* 모바일 필터 */}
        <MobileFilter
          filter={filter}
          setFilter={setFilter}
          isOpen={mobileFilterOpen}
          onToggle={() => {
            if (mobileFilterOpen) userClosedFilter.current = true;
            setMobileFilterOpen((v) => !v);
          }}
          hiddenProductTypes={hiddenProductTypes}
          hiddenSeasons={hiddenSeasons}
          customProductTypes={customProductTypes}
          customSeasons={customSeasons}
        />
      </div>

      {/* 상품 목록 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />
      </div>

      <div className="pb-8">
        <FloAideFooter />
      </div>
    </div>
  );
}
