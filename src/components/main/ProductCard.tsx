"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP, BADGE_COLORS } from "@/lib/constants";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  product: Product;
  consultEnabled?: boolean;
  slug?: string;
}

export default function ProductCard({ product, slug }: ProductCardProps) {
  const router = useRouter();
  const { addItem, removeItem, items } = useCart(slug ?? "");
  const inCart = items.some((i) => i.productId === product.id);

  const handleToggleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) {
      removeItem(product.id);
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        product_type: product.product_type,
        bag_included: product.bag_included,
      });
    }
  };

  return (
    <div
      className="cursor-pointer group bg-white"
      onClick={() => router.push(`/${slug}/products/${product.id}`)}
    >
      {/* 이미지 */}
      <div className="relative aspect-square bg-white overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-beige-300">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* 뱃지 */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
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

        {/* 담기 버튼 */}
        {product.price > 0 && (
          <button
            onClick={handleToggleCart}
            className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
              inCart ? "bg-gold-500 text-white" : "bg-white text-gray-600 hover:bg-gold-500 hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* 정보 */}
      <div className="px-3 pt-5 pb-8 flex gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{product.product_type}</p>
          <p className="text-sm text-gray-900 leading-snug">{product.name}</p>
        </div>
        <div className="flex flex-col items-end justify-between shrink-0">
          {product.flower_colors.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end">
              {product.flower_colors.map((color) => (
                <span
                  key={color}
                  className="w-3 h-3 rounded-full border border-gray-200 inline-block shrink-0"
                  style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                  title={color}
                />
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-gray-900">
            {product.price ? `${product.price.toLocaleString()}원` : "가격 문의"}
          </p>
        </div>
      </div>
    </div>
  );
}
