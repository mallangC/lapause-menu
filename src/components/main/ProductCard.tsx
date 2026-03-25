"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP, BADGE_COLORS } from "@/lib/constants";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";

interface ProductCardProps {
  product: Product;
  consultEnabled?: boolean;
  slug?: string;
}

export default function ProductCard({ product, consultEnabled, slug }: ProductCardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = (modalOpen || noticeOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen, noticeOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  return (
    <>
      <div
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setModalOpen(true)}
      >
        <div className="relative aspect-square bg-beige-200">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-beige-400">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          )}

          {/* 뱃지 */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
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

        <div className="p-3 flex justify-between gap-2">
          {/* 왼쪽: 유형, 이름, 가격 */}
          <div className="flex flex-col justify-between min-w-0">
            <div>
              <p className="text-xs text-gold-500 font-medium mb-0.5">
                {product.product_type}
              </p>
              <h3 className="font-medium text-sm text-foreground leading-tight">
                {product.name}
              </h3>
            </div>
            <p className="text-sm font-semibold text-foreground mt-2">
              {product.price.toLocaleString()}원
            </p>
          </div>

          {/* 오른쪽: 색상 도트, 포장 계열 */}
          <div className="flex flex-col items-end justify-end gap-1 shrink-0">
            {product.flower_colors.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {product.flower_colors.map((color) => (
                  <span
                    key={color}
                    className="w-4 h-4 rounded-full border border-gray-300 inline-block shrink-0"
                    style={{
                      backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e",
                    }}
                    title={color}
                  />
                ))}
              </div>
            )}
            <span className="text-xs text-foreground/60">{product.wrapping_color}</span>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setModalOpen(false)}
        >
          {consultEnabled ? (
            /* 상품 상세 + 예약 버튼 모달 */
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 이미지 */}
              <div className="relative aspect-square bg-beige-200">
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-beige-400 text-5xl">🌸</div>
                )}
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
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-3 right-3 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/60 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>

              {/* 상품 정보 */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gold-500 font-medium">{product.product_type}</p>
                  <h3 className="font-semibold text-gray-900 text-base mt-0.5">{product.name}</h3>
                  <p className="text-lg font-bold text-gray-900 mt-2">{product.price.toLocaleString()}원</p>
                </div>

                {(product.flower_colors.length > 0 || product.wrapping_color) && (
                  <div className="space-y-1.5 pt-3 border-t border-gray-100">
                    {product.flower_colors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">꽃 색상</span>
                        <span className="text-xs text-gray-300 px-2">—</span>
                        <div className="flex gap-1 flex-wrap">
                          {product.flower_colors.map((color) => (
                            <span
                              key={color}
                              className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                              style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {product.wrapping_color && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">포장지</span>
                        <span className="text-xs text-gray-300 pr-2 pl-2.5">—</span>
                        <span className="text-xs text-gray-600">{product.wrapping_color}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setNoticeOpen(true)}
                  className="block w-full bg-gold-500 text-white text-center py-3 rounded-xl font-medium text-sm hover:bg-gold-600 transition-colors"
                >
                  이 상품으로 예약하기
                </button>

              </div>
            </div>
          ) : (
            /* 기존 이미지 확대 모달 */
            product.image_url && (
              <div
                className="relative max-w-[90vw] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={900}
                  height={900}
                  className="rounded-xl object-contain max-h-[90vh] w-auto"
                  style={{ maxWidth: "90vw" }}
                />
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}

      {noticeOpen && (
        <FlowerNoticeModal
          onConfirm={() => router.push(`/${slug}/consult?productId=${product.id}`)}
          onClose={() => setNoticeOpen(false)}
        />
      )}
    </>
  );
}
