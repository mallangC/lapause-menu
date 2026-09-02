"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP, BADGE_COLORS, PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
import StoreHeader from "@/components/main/StoreHeader";
import { useCart } from "@/hooks/useCart";

interface ProductDetailClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  product: Product;
  allProducts: Product[];
  consultEnabled: boolean;
  hiddenProductTypes: string[];
  hiddenSeasons: string[];
  customProductTypes: string[];
  customSeasons: string[];
}

export default function ProductDetailClient({
  slug,
  companyName,
  logoImage,
  themeVars,
  product,
  allProducts,
  consultEnabled,
  hiddenProductTypes,
  hiddenSeasons,
  customProductTypes,
  customSeasons,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart(slug);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price ?? 0,
      image_url: product.image_url ?? null,
      product_type: product.product_type,
      bag_included: product.bag_included ?? false,
    }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const productTypeList = [...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)), ...customProductTypes];
  const seasonList = [...SEASONS.filter((s) => !hiddenSeasons.includes(s)), ...customSeasons];

  // 가격 비슷한 상품 2개 (±30%)
  const priceSimilar = product.price
    ? allProducts
        .filter((p) => p.price && Math.abs(p.price - product.price!) / product.price! < 0.3)
        .sort((a, b) => Math.abs((a.price ?? 0) - product.price!) - Math.abs((b.price ?? 0) - product.price!))
        .slice(0, 2)
    : [];

  // 색상 비슷한 상품 2개 (flower_colors 겹치는 것 우선)
  const colorSimilar = allProducts
    .filter((p) => !priceSimilar.find((s) => s.id === p.id))
    .map((p) => ({
      product: p,
      score: p.flower_colors.filter((c) => product.flower_colors.includes(c)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product)
    .slice(0, 2);

  const merged = [...priceSimilar, ...colorSimilar];
  const usedIds = new Set(merged.map((p) => p.id));

  // 전체 상품이 5개 초과이면 부족한 자리를 나머지 상품으로 채워 4개 보장
  const suggestedProducts =
    allProducts.length > 4
      ? [
          ...merged,
          ...allProducts.filter((p) => !usedIds.has(p.id)),
        ].slice(0, 4)
      : merged.slice(0, 4);

  return (
    <div className="min-h-screen bg-white" style={themeVars}>
      <StoreHeader
        slug={slug}
        companyName={companyName}
        logoImage={logoImage}
        productTypeList={productTypeList}
        seasonList={seasonList}
        consultEnabled={consultEnabled}
      />

      {/* 상품 상세 — 2단 레이아웃 */}
      <div className="flex flex-col md:flex-row">

          {/* 왼쪽: 이미지 */}
          <div className="md:w-1/2 shrink-0 w-full">
            <div className="relative aspect-square bg-beige-100 overflow-hidden">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" priority />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-beige-300">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
              {/* 뱃지 */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {product.is_popular && (
                  <span className="text-white text-xs px-2 py-0.5 font-medium" style={{ backgroundColor: BADGE_COLORS.popular.bg }}>
                    {BADGE_COLORS.popular.label}
                  </span>
                )}
                {product.is_recommended && (
                  <span className="text-white text-xs px-2 py-0.5 font-medium" style={{ backgroundColor: BADGE_COLORS.recommended.bg }}>
                    {BADGE_COLORS.recommended.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 정보 */}
          <div className="md:w-1/2 flex flex-col justify-between px-6 py-6 md:px-8 md:py-12">
            <div className="space-y-5 md:space-y-8">
              {/* 이름 & 가격 */}
              <div>
                <p className="text-xs text-gray-400 mb-2 tracking-wider uppercase">{product.product_type}</p>
                <h1 className="text-2xl font-medium text-gray-900 leading-snug mb-4">{product.name}</h1>
                <p className="text-2xl font-bold text-gray-900">
                  {product.price ? `${product.price.toLocaleString()}원` : "가격 문의"}
                </p>
              </div>

              {/* 상세 속성 */}
              {(product.flower_colors.length > 0 || product.wrapping_color || product.seasons.length > 0) && (
                <div className="space-y-4 pt-8 border-t border-gray-100">
                  {product.flower_colors.length > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-16 shrink-0">꽃 색상</span>
                      <div className="flex gap-2 flex-wrap">
                        {product.flower_colors.map((color) => (
                          <span
                            key={color}
                            className="w-6 h-6 rounded-full border border-gray-200 inline-block shrink-0"
                            style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {product.wrapping_color && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-16 shrink-0">포장지</span>
                      <span className="text-sm text-gray-700">{product.wrapping_color}</span>
                    </div>
                  )}
                  {product.seasons.length > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 w-16 shrink-0">시즌</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {product.seasons.map((s) => (
                          <span key={s} className="text-xs bg-beige-100 text-gray-600 px-3 py-1 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 수량 + 버튼 */}
            <div className="mt-6 md:mt-10 space-y-4">
              {/* 수량 선택 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">수량</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="text-base font-medium w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </button>
                </div>
                {product.price && (
                  <span className="ml-auto text-base font-bold text-gray-900">
                    {(product.price * quantity).toLocaleString()}원
                  </span>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 rounded-2xl border text-sm font-medium transition-colors ${
                    added
                      ? "border-gold-500 bg-gold-50 text-gold-600"
                      : "border-gray-200 text-gray-700 hover:border-gold-400 hover:text-gold-500"
                  }`}
                >
                  {added ? "담겼습니다 ✓" : "장바구니"}
                </button>
                {consultEnabled && (
                  <button
                    onClick={() => setNoticeOpen(true)}
                    className="flex-1 py-4 rounded-2xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
                  >
                    예약하기
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* 이런 상품은 어떠세요? */}
      {suggestedProducts.length > 0 && (
        <div className="py-12 border-t border-gray-100">
          <h2 className="text-base font-medium text-gray-900 mb-3 px-4">이런 상품은 어떠세요?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
            {suggestedProducts.map((p) => (
              <div
                key={p.id}
                className="cursor-pointer group bg-white"
                onClick={() => router.push(`/${slug}/products/${p.id}`)}
              >
                <div className="relative aspect-square bg-beige-100 overflow-hidden">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-beige-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="px-3 pt-3 pb-5">
                  <p className="text-xs text-gray-400 mb-0.5">{p.product_type}</p>
                  <p className="text-sm text-gray-900 leading-snug">{p.name}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1.5">
                    {p.price ? `${p.price.toLocaleString()}원` : "가격 문의"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {noticeOpen && (
        <FlowerNoticeModal
          onConfirm={() => router.push(`/${slug}/consult?productId=${product.id}&quantity=${quantity}`)}
          onClose={() => setNoticeOpen(false)}
        />
      )}
    </div>
  );
}
