"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Product } from "@/types";
import { PRODUCT_TYPES } from "@/lib/constants";
import { applyFilter, EMPTY_FILTER } from "@/lib/filter";
import MainNav from "@/components/main/MainNav";
import CategorySlider from "@/components/main/CategorySlider";
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
  consultEnabled,
}: ProductsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get("tab") as "featured" | "season" | null;
  const typeParam = searchParams.get("type");

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    typeParam ? [typeParam] : []
  );

  useEffect(() => {
    setSelectedTypes(typeParam ? [typeParam] : []);
  }, [typeParam]);

  const activeTab = tab === "featured" ? "featured" : tab === "season" ? "season" : "all";

  const baseFilter = {
    ...EMPTY_FILTER,
    featured: activeTab === "featured",
    isSeason: activeTab === "season",
    productTypes: activeTab === "all" ? selectedTypes : [],
  };

  const filteredProducts = applyFilter(products, baseFilter).filter((p) => {
    if (!baseFilter.isSeason && hiddenProductTypes.includes(p.product_type)) return false;
    if (p.seasons.length > 0 && p.seasons.every((s) => hiddenSeasons.includes(s))) return false;
    return true;
  });

  const visibleTypes = [
    ...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)),
    ...customProductTypes,
  ];

  const handleCategorySelect = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(next);
    const params = new URLSearchParams();
    if (next.length === 1) params.set("type", next[0]);
    else if (next.length > 1) next.forEach((t) => params.append("type", t));
    router.replace(`/${slug}/products${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

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
        <MainNav slug={slug} activeTab={activeTab} consultEnabled={consultEnabled} />
      </div>

      {/* 카테고리 슬라이더 (전체 탭일 때만) */}
      {activeTab === "all" && (
        <div className="max-w-6xl mx-auto">
          <CategorySlider
            types={visibleTypes}
            selectedTypes={selectedTypes}
            onSelect={handleCategorySelect}
          />
        </div>
      )}

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
