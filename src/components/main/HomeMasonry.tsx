"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types";

interface HomeMasonryProps {
  slug: string;
  products: Product[];
}

export default function HomeMasonry({ slug, products }: HomeMasonryProps) {
  const featured = products.filter((p) => p.is_recommended || p.is_popular);
  const display = (featured.length > 0 ? featured : products).filter((p) => p.image_url);

  if (display.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <span className="text-7xl mb-6">🌸</span>
        <p className="text-3xl font-semibold text-gray-700 mb-3">준비중입니다</p>
        <p className="text-base text-gray-400">곧 멋진 상품들을 선보일게요</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
      {display.map((product) => (
        <Link
          key={product.id}
          href={`/${slug}/products`}
          className="relative aspect-[4/5] overflow-hidden bg-beige-200 block"
        >
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            sizes="(min-width: 640px) 50vw, 100vw"
          />
        </Link>
      ))}
    </div>
  );
}
