"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/types";


const ASPECTS = [
  "aspect-[3/4]",
  "aspect-[2/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[2/3]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[2/3]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[2/3]",
  "aspect-[3/4]",
  "aspect-square",
];

interface HomeMasonryProps {
  slug: string;
  products: Product[];
}

export default function HomeMasonry({ slug, products }: HomeMasonryProps) {
  const router = useRouter();

  const featured = products.filter((p) => p.is_recommended || p.is_popular);
  const rest = products.filter((p) => !p.is_recommended && !p.is_popular);
  const display = [...featured, ...rest].slice(0, 16);

  if (display.length === 0) return null;

  return (
    <div className="px-2 py-3 columns-2 gap-2">
      {/* 헤더 카드 — 왼쪽 상단 정사각형 */}
      <div className="break-inside-avoid mb-2">
        <div className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 px-4" style={{ background: "linear-gradient(135deg, #c8a96e 0%, #a07840 100%)" }}>
          <span className="text-4xl">💐</span>
          <p className="text-2xl font-bold text-white text-center leading-snug">인기 · 추천 상품</p>
          <p className="text-base text-white/70 text-center leading-relaxed">마음에 드는 상품을 클릭해보세요</p>
        </div>
      </div>

      {display.map((product, i) => (
        <div
          key={product.id}
          className="break-inside-avoid mb-2 cursor-pointer"
          onClick={() => router.push(`/${slug}/products/${product.id}`)}
        >
          <div className={`relative ${ASPECTS[i % ASPECTS.length]} rounded-xl overflow-hidden bg-beige-200`}>
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="50vw"
              />
            ) : (
              <div className="absolute inset-0 bg-beige-200 flex items-center justify-center text-beige-400 text-3xl">🌸</div>
            )}

            {/* 하단 블러 패널 */}
            <div className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-white/20 px-3 py-2.5">
              <p className="text-white text-base font-semibold leading-tight truncate drop-shadow-sm">{product.name}</p>
              <p className="text-white/90 text-base mt-0.5 drop-shadow-sm">
                {product.price ? `${product.price.toLocaleString()}원` : "가격 문의"}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* 맞춤 주문 카드 */}
      <div className="break-inside-avoid mb-2">
        <button
          onClick={() => router.push(`/${slug}/consult`)}
          className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-3 px-4 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #2c2416 0%, #4a3c28 100%)" }}
        >
          <span className="text-4xl">✨</span>
          <p className="text-xl font-bold text-white text-center leading-snug">맞춤 주문</p>
          <p className="text-sm text-white/70 text-center leading-relaxed">내가 원하는 상품을<br />찾아보세요</p>
        </button>
      </div>
    </div>
  );
}
