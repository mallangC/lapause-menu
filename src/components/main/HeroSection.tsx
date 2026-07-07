"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const CATEGORY_ICONS: Record<string, string> = {
  다발: "💐",
  바구니: "🧺",
  센터피스: "🌺",
  화병꽂이: "🏺",
  식물: "🌿",
  조화: "🌹",
};

const DISPLAY_NAMES: Record<string, string> = {
  다발: "꽃다발",
  바구니: "꽃바구니",
};

interface HeroSectionProps {
  slug: string;
  types: string[];
  typeImages: Record<string, string | null>;
}

export default function HeroSection({ slug, types, typeImages }: HeroSectionProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  if (types.length === 0) return <div className="w-full aspect-[4/3] bg-beige-200" />;

  const currentType = types[current];
  const currentImage = typeImages[currentType] ?? null;
  const displayName = DISPLAY_NAMES[currentType] ?? currentType;

  const prev = () => setCurrent((i) => (i - 1 + types.length) % types.length);
  const next = () => setCurrent((i) => (i + 1) % types.length);

  return (
    <div className="bg-beige-100">
      {/* 히어로 이미지 */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/7] bg-beige-200 overflow-hidden">
        {currentImage ? (
          <Image
            src={currentImage}
            alt={displayName}
            fill
            className="object-cover transition-opacity duration-300"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-beige-200" />
        )}

        {/* 하단 그라데이션 + 유형 이름 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        <p className="absolute bottom-4 left-5 text-white text-lg font-semibold drop-shadow-sm">
          {displayName}
        </p>

        {/* 좌우 화살표 */}
        {types.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
              aria-label="이전"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
              aria-label="다음"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* 카테고리 아이콘 */}
      <div className="flex gap-4 overflow-x-auto px-4 py-5 no-scrollbar justify-center">
        {types.map((type, i) => {
          const isSelected = i === current;
          return (
            <button
              key={type}
              onClick={() => {
                setCurrent(i);
                router.push(`/${slug}/products?type=${encodeURIComponent(type)}`);
              }}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <span
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                  isSelected
                    ? "border-gold-500 bg-gold-50 shadow-sm scale-105"
                    : "border-gray-200 bg-white"
                }`}
              >
                {CATEGORY_ICONS[type] ?? "🌷"}
              </span>
              <span className={`text-xs font-medium whitespace-nowrap transition-colors ${isSelected ? "text-gold-500" : "text-gray-500"}`}>
                {DISPLAY_NAMES[type] ?? type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
