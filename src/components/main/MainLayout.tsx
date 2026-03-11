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
  naverTalkUrl?: string | null;
  kakaoChannelUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  hiddenProductTypes?: string[];
  hiddenSeasons?: string[];
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
  naverTalkUrl,
  kakaoChannelUrl,
  instagramUrl,
  youtubeUrl,
  hiddenProductTypes = [],
  hiddenSeasons = [],
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
  const filteredProducts = applyFilter(products, filter);

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
          naverTalkUrl={naverTalkUrl}
          kakaoChannelUrl={kakaoChannelUrl}
          instagramUrl={instagramUrl}
          youtubeUrl={youtubeUrl}
          onSelectFeatured={() => { setFilter({ ...EMPTY_FILTER, featured: true }); setShowHome(false); }}
          onSelectAll={() => { setFilter(EMPTY_FILTER); setShowHome(false); setMobileFilterOpen(true); }}
          onSelectSeason={() => { setFilter({ ...EMPTY_FILTER, isSeason: true }); setShowHome(false); }}
        />
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
