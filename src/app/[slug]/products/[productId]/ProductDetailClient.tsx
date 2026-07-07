"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP, BADGE_COLORS } from "@/lib/constants";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";

interface ProductDetailClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  product: Product;
  consultEnabled: boolean;
}

export default function ProductDetailClient({
  slug,
  companyName,
  logoImage,
  themeVars,
  product,
  consultEnabled,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [noticeOpen, setNoticeOpen] = useState(false);

  const logo = logoImage ? (
    <Image src={logoImage} alt={companyName} width={200} height={40} className="object-contain h-9 w-auto" />
  ) : (
    <span className="font-light tracking-widest text-gold-500 text-xl">{companyName}</span>
  );

  return (
    <div className="min-h-screen bg-beige-100" style={themeVars}>
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            뒤로
          </button>
          <Link href={`/${slug}`}>{logo}</Link>
          <div className="w-12" />
        </div>
      </header>

      {/* 상품 상세 */}
      <div className="max-w-xl mx-auto bg-white min-h-screen">
        {/* 이미지 */}
        <div className="relative aspect-[3/4] bg-beige-200">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-beige-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}

          {/* 뱃지 */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.is_popular && (
              <span className="text-white text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: BADGE_COLORS.popular.bg }}>
                {BADGE_COLORS.popular.label}
              </span>
            )}
            {product.is_recommended && (
              <span className="text-white text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: BADGE_COLORS.recommended.bg }}>
                {BADGE_COLORS.recommended.label}
              </span>
            )}
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gold-500 font-medium">{product.product_type}</p>
            <h1 className="font-semibold text-gray-900 text-lg mt-1">{product.name}</h1>
            <p className="text-xl font-bold text-gray-900 mt-2">
              {product.price ? `${product.price.toLocaleString()}원` : "가격 문의"}
            </p>
          </div>

          {(product.flower_colors.length > 0 || product.wrapping_color || product.seasons.length > 0) && (
            <div className="space-y-2 pt-4 border-t border-gray-100">
              {product.flower_colors.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12 shrink-0">꽃 색상</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {product.flower_colors.map((color) => (
                      <span
                        key={color}
                        className="w-5 h-5 rounded-full border border-gray-200 inline-block shrink-0"
                        style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
              {product.wrapping_color && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12 shrink-0">포장지</span>
                  <span className="text-sm text-gray-600">{product.wrapping_color}</span>
                </div>
              )}
              {product.seasons.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12 shrink-0">시즌</span>
                  <div className="flex gap-1 flex-wrap">
                    {product.seasons.map((s) => (
                      <span key={s} className="text-xs bg-beige-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {consultEnabled && (
            <div className="pt-2">
              <button
                onClick={() => setNoticeOpen(true)}
                className="w-full bg-gold-500 text-white text-center py-3.5 rounded-xl font-medium text-sm hover:bg-gold-600 transition-colors"
              >
                이 상품으로 예약하기
              </button>
            </div>
          )}
        </div>
      </div>

      {noticeOpen && (
        <FlowerNoticeModal
          onConfirm={() => router.push(`/${slug}/consult?productId=${product.id}`)}
          onClose={() => setNoticeOpen(false)}
        />
      )}
    </div>
  );
}
