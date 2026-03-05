"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/types";
import { BADGE_COLORS } from "@/lib/constants";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = [...products].sort((a, b) => sortDir === "asc" ? a.price - b.price : b.price - a.price);

  const toggleSort = () => setSortDir((prev) => prev === "asc" ? "desc" : "asc");
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>등록된 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-12 md:w-20" />
          <col />
          <col className="hidden md:table-column" />
          <col className="hidden md:table-column" />
          <col />
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 text-center">
            <th className="pb-2 font-medium text-gray-400">이미지</th>
            <th className="pb-2 font-medium text-gray-400">상품명</th>
            <th className="pb-2 font-medium text-gray-400 hidden md:table-cell">뱃지</th>
            <th className="pb-2 font-medium text-gray-400 hidden md:table-cell">유형</th>
            <th className="pb-2 font-medium text-gray-400">
              <div className="flex items-center justify-center gap-1">
                가격
                <button onClick={toggleSort} className="text-xs leading-none text-gray-900 hover:text-gray-500">
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </th>
            <th className="pb-2 font-medium text-gray-400">관리</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-center"
            >
              <td className="py-3">
                <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              </td>
              <td className="py-3 px-2 font-medium break-keep">{product.name}</td>
              <td className="py-3 px-2 hidden md:table-cell">
                <div className="flex gap-1 flex-wrap justify-center">
                  {product.is_popular && (
                    <span className="text-white text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: BADGE_COLORS.popular.bg }}>
                      {BADGE_COLORS.popular.label}
                    </span>
                  )}
                  {product.is_recommended && (
                    <span className="text-white text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: BADGE_COLORS.recommended.bg }}>
                      {BADGE_COLORS.recommended.label}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-2 text-gray-700 hidden md:table-cell whitespace-nowrap">{product.product_type}</td>
              <td className="py-3 px-2 whitespace-nowrap">{product.price.toLocaleString()}원</td>
              <td className="py-3 px-2">
                <div className="flex gap-1.5 justify-center">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
