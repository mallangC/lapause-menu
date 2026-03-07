"use client";

import { useState } from "react";
import Image from "next/image";
import { Product, ProductStatus } from "@/types";
import { BADGE_COLORS, PRODUCT_TYPES } from "@/lib/constants";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProductStatus) => void;
}

const STATUS_CYCLE: ProductStatus[] = ["active", "inactive", "soldout"];
const STATUS_LABELS: Record<ProductStatus, string> = { active: "활성", inactive: "비활성", soldout: "품절" };
const STATUS_STYLES: Record<ProductStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactive: "bg-gray-100 text-gray-500 border border-gray-200",
  soldout: "bg-red-100 text-red-500 border border-red-200",
};

const PAGE_SIZE = 10;

const selectCls = "border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer";

export default function ProductTable({ products, onEdit, onDelete, onStatusChange }: ProductTableProps) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState("");
  const [filterBadge, setFilterBadge] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const toggleSort = () => setSortDir((prev) => prev === "asc" ? "desc" : "asc");

  const resetPage = () => setPage(1);

  const filtered = [...products]
    .filter((p) => {
      if (filterType && p.product_type !== filterType) return false;
      if (filterBadge === "popular" && !p.is_popular) return false;
      if (filterBadge === "recommended" && !p.is_recommended) return false;
      if (filterBadge === "none" && (p.is_popular || p.is_recommended)) return false;
      if (filterStatus && (p.status ?? "active") !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => sortDir === "asc" ? a.price - b.price : b.price - a.price);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilter = filterType || filterBadge || filterStatus;

  const clearFilters = () => {
    setFilterType("");
    setFilterBadge("");
    setFilterStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); resetPage(); }}
          className={selectCls}
        >
          <option value="">유형 전체</option>
          {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterBadge}
          onChange={(e) => { setFilterBadge(e.target.value); resetPage(); }}
          className={selectCls}
        >
          <option value="">뱃지 전체</option>
          <option value="popular">인기</option>
          <option value="recommended">추천</option>
          <option value="none">없음</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }}
          className={selectCls}
        >
          <option value="">상태 전체</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
          <option value="soldout">품절</option>
        </select>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
          >
            필터 해제
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {hasFilter ? `${filtered.length}개 / 전체 ${products.length}개` : `전체 ${products.length}개`}
        </span>
      </div>

      {/* 테이블 */}
      {paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {hasFilter ? "필터 조건에 맞는 상품이 없습니다." : "등록된 상품이 없습니다."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-12 md:w-20" />
              <col />
              <col className="hidden md:table-column" />
              <col className="hidden md:table-column" />
              <col />
              <col className="w-20" />
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
                <th className="pb-2 font-medium text-gray-400">상태</th>
                <th className="pb-2 font-medium text-gray-400">관리</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((product) => (
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
                    <button
                      onClick={() => {
                        const cur = product.status ?? "active";
                        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
                        onStatusChange(product.id, next);
                      }}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-opacity hover:opacity-70 whitespace-nowrap ${STATUS_STYLES[product.status ?? "active"]}`}
                    >
                      {STATUS_LABELS[product.status ?? "active"]}
                    </button>
                  </td>
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
              {Array.from({ length: PAGE_SIZE - paginated.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-gray-100">
                  <td className="py-3"><div className="w-10 h-10 md:w-16 md:h-16 mx-auto" /></td>
                  <td /><td className="hidden md:table-cell" /><td className="hidden md:table-cell" />
                  <td /><td /><td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이징 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← 이전
          </button>
          <span className="text-xs text-gray-500">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
