"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, FilterState } from "@/types";
import { INACTIVITY_TIMEOUT_MS } from "@/lib/constants";
import { EMPTY_FILTER, applyFilter } from "@/lib/filter";
import ProductGrid from "./ProductGrid";
import MainNav from "./MainNav";
import MobileFilter from "./MobileFilter";
import HomeScreen from "./HomeScreen";

interface MainLayoutProps {
  products: Product[];
  companyName?: string;
  logoImage?: string | null;
  themeVars?: Record<string, string>;
  slug?: string;
  homeFeaturedImage?: string | null;
  homeAllImage?: string | null;
  homeSeasonImage?: string | null;
  homeConsultImage?: string | null;
  locationUrl?: string | null;
  kakaoChannelUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  hiddenProductTypes?: string[];
  hiddenSeasons?: string[];
  consultEnabled?: boolean;
}

export default function MainLayout({
  products,
  companyName = "Lapause Fleur",
  logoImage,
  themeVars,
  slug,
  homeFeaturedImage,
  homeAllImage,
  homeSeasonImage,
  homeConsultImage,
  locationUrl,
  kakaoChannelUrl,
  instagramUrl,
  youtubeUrl,
  hiddenProductTypes = [],
  hiddenSeasons = [],
  consultEnabled = false,
}: MainLayoutProps) {
  const [showHome, setShowHome] = useState(true);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isAll = !filter.featured && !filter.isSeason;
  const isSeason = filter.isSeason;
  const filteredProducts = applyFilter(products, filter).filter((p) => {
    if (!filter.isSeason && hiddenProductTypes.includes(p.product_type)) return false;
    if (p.seasons.length > 0 && p.seasons.every((s) => hiddenSeasons.includes(s))) return false;
    return true;
  });

  const logo = logoImage ? (
    <Image
      src={logoImage}
      alt={companyName}
      width={200}
      height={48}
      className={`object-contain transition-all w-auto ${showHome ? "h-12" : "h-8"}`}
    />
  ) : (
    <span className={`font-light tracking-widest text-gold-500 transition-all ${showHome ? "text-3xl" : "text-xl"}`}>
      {companyName}
    </span>
  );

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars}>
      <header className="border-b border-gray-100 bg-white">
        <div className={`max-w-6xl mx-auto px-4 flex items-center justify-center transition-all ${showHome ? "py-6" : "py-4"}`}>
          {slug ? <Link href={`/${slug}/admin`}>{logo}</Link> : logo}
        </div>
      </header>

      {!showHome && (
        <MainNav
          filter={filter}
          setFilter={setFilter}
          setMobileFilterOpen={setMobileFilterOpen}
          hiddenProductTypes={hiddenProductTypes}
          hiddenSeasons={hiddenSeasons}
          consultEnabled={consultEnabled}
          slug={slug}
        />
      )}

      {!showHome && (isAll || isSeason) && (
        <MobileFilter
          filter={filter}
          setFilter={setFilter}
          isOpen={mobileFilterOpen}
          onToggle={() => setMobileFilterOpen((v) => !v)}
          hiddenProductTypes={hiddenProductTypes}
          hiddenSeasons={hiddenSeasons}
        />
      )}

      {showHome ? (
        <HomeScreen
          homeFeaturedImage={homeFeaturedImage}
          homeAllImage={homeAllImage}
          homeSeasonImage={homeSeasonImage}
          homeConsultImage={homeConsultImage}
          locationUrl={locationUrl}
          kakaoChannelUrl={kakaoChannelUrl}
          instagramUrl={instagramUrl}
          youtubeUrl={youtubeUrl}
          slug={slug}
          consultEnabled={consultEnabled}
          onSelectFeatured={() => { setFilter({ ...EMPTY_FILTER, featured: true }); setShowHome(false); }}
          onSelectAll={() => { setFilter(EMPTY_FILTER); setShowHome(false); setMobileFilterOpen(true); }}
          onSelectSeason={() => { setFilter({ ...EMPTY_FILTER, isSeason: true }); setShowHome(false); }}
        />
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <main>
            <ProductGrid products={filteredProducts} consultEnabled={consultEnabled} slug={slug} />
          </main>
        </div>
      )}
    </div>
  );
}
