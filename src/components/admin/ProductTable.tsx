"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Product, ProductStatus } from "@/types";
import { BADGE_COLORS, PRODUCT_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ProductStatus) => void;
  companyId: string;
}

const STATUS_CYCLE: ProductStatus[] = ["active", "inactive", "soldout"];
const STATUS_LABELS: Record<ProductStatus, string> = { active: "노출", inactive: "숨김", soldout: "품절" };

function StatusToggle({ status, onClick }: { status: ProductStatus; onClick: () => void }) {
  const isActive = status === "active";
  const isSoldout = status === "soldout";

  const trackColor = isActive ? "bg-emerald-500" : isSoldout ? "bg-amber-400" : "bg-gray-300";
  const thumbX = isActive ? "translate-x-[18px]" : "translate-x-0.5";
  const labelColor = isActive ? "text-emerald-600" : isSoldout ? "text-amber-500" : "text-gray-400";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 group mx-auto"
      title={STATUS_LABELS[status]}
    >
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${trackColor} group-hover:opacity-80`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${thumbX}`} />
      </div>
    </button>
  );
}

const ACTION_WIDTH = 120;

function SwipeableCard({ children, onEdit, onDelete }: { children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const liveOffset = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    isDragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    const next = Math.max(-ACTION_WIDTH, Math.min(0, startOffset.current + diff));
    liveOffset.current = next;
    setOffset(next);
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    setOffset(liveOffset.current < -(ACTION_WIDTH / 2) ? -ACTION_WIDTH : 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 액션 버튼 — 오른쪽에 고정 */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: ACTION_WIDTH }}>
        <button
          onClick={() => { setOffset(0); onEdit(); }}
          className="flex-1 flex items-center justify-center text-white bg-blue-500 active:bg-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L8.5 18.81l-4 1 1-4 11.362-11.323z" />
          </svg>
        </button>
        <button
          onClick={() => { setOffset(0); onDelete(); }}
          className="flex-1 flex items-center justify-center text-white bg-red-500 active:bg-red-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>

      {/* 스와이프되는 카드 본체 */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (liveOffset.current < 0) setOffset(0); }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging.current ? "none" : "transform 0.2s ease-out",
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { key: "date_desc", label: "최신순" },
  { key: "date_asc", label: "오래된순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
] as const;

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function ProductTable({ products, onEdit, onDelete, onStatusChange, companyId }: ProductTableProps) {
  const [sortKey, setSortKey] = useState<"price_asc" | "price_desc" | "date_desc" | "date_asc">("date_desc");
  const [knownCustomTypes, setKnownCustomTypes] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("company_categories")
      .select("name, category_type")
      .eq("company_id", companyId)
      .eq("category_type", "product_type")
      .then(({ data }) => {
        if (data) setKnownCustomTypes(data.map((c) => c.name));
        setTypesLoading(false);
      });
  }, [companyId]);

  const isValidType = (type: string) =>
    (PRODUCT_TYPES as readonly string[]).includes(type) || knownCustomTypes.includes(type);
  const [filterType, setFilterType] = useState("");
  const [filterBadge, setFilterBadge] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const filtered = [...products]
    .filter((p) => {
      if (filterType && p.product_type !== filterType) return false;
      if (filterBadge === "popular" && !p.is_popular) return false;
      if (filterBadge === "recommended" && !p.is_recommended) return false;
      if (filterBadge === "none" && (p.is_popular || p.is_recommended)) return false;
      return !(filterStatus && (p.status ?? "active") !== filterStatus);
    })
    .sort((a, b) => {
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "price_desc") return b.price - a.price;
      if (sortKey === "date_asc") return a.created_at.localeCompare(b.created_at);
      return b.created_at.localeCompare(a.created_at);
    });

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

  const sortIdx = SORT_OPTIONS.findIndex((o) => o.key === sortKey);

  if (typesLoading) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">로딩 중...</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 필터 행 */}
      <div className="flex items-center gap-2">

        {/* 정렬 — 고정 */}
        <button
          onClick={() => { setSortKey(SORT_OPTIONS[(sortIdx + 1) % SORT_OPTIONS.length].key); resetPage(); }}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:border-gray-500 transition-colors whitespace-nowrap"
        >
          {SORT_OPTIONS[sortIdx].label}
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
          </svg>
        </button>

        <div className="h-4 w-px bg-gray-300 shrink-0" />

        {/* 필터 칩들 — 가로 스크롤 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[...PRODUCT_TYPES, ...knownCustomTypes].map((t) => (
            <Chip key={t} label={t} active={filterType === t} onClick={() => { setFilterType(filterType === t ? "" : t); resetPage(); }} />
          ))}

          <div className="h-4 w-px bg-gray-300 shrink-0 mx-0.5" />

          <Chip label="인기" active={filterBadge === "popular"} onClick={() => { setFilterBadge(filterBadge === "popular" ? "" : "popular"); resetPage(); }} />
          <Chip label="추천" active={filterBadge === "recommended"} onClick={() => { setFilterBadge(filterBadge === "recommended" ? "" : "recommended"); resetPage(); }} />
          <Chip label="노출" active={filterStatus === "active"} onClick={() => { setFilterStatus(filterStatus === "active" ? "" : "active"); resetPage(); }} />
          <Chip label="숨김" active={filterStatus === "inactive"} onClick={() => { setFilterStatus(filterStatus === "inactive" ? "" : "inactive"); resetPage(); }} />

          {hasFilter && (
            <>
              <div className="h-4 w-px bg-gray-300 shrink-0 mx-0.5" />
              <button onClick={clearFilters} className="shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap">
                초기화 ✕
              </button>
            </>
          )}

          <span className="shrink-0 ml-1 text-xs text-gray-400 whitespace-nowrap">
            {hasFilter ? `${filtered.length} / ${products.length}개` : `${products.length}개`}
          </span>
        </div>

      </div>

      {/* 상품 없음 */}
      {paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {hasFilter ? "필터 조건에 맞는 상품이 없습니다." : "등록된 상품이 없습니다."}
        </div>
      ) : (
        <>
          {/* 모바일 카드 목록 */}
          <div className="flex flex-col divide-y divide-gray-100 md:hidden">
            {paginated.map((product) => {
              const typeDeleted = !isValidType(product.product_type);
              const status = product.status ?? "active";
              return (
                <SwipeableCard
                  key={product.id}
                  onEdit={() => onEdit(product)}
                  onDelete={() => onDelete(product.id)}
                >
                  <div className={`flex items-center gap-3 py-3 ${typeDeleted ? "bg-red-50/50" : ""}`}>
                    {/* 이미지 */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} width={56} height={56} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {product.is_popular && (
                          <span className="text-white text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: BADGE_COLORS.popular.bg }}>
                            {BADGE_COLORS.popular.label}
                          </span>
                        )}
                        {product.is_recommended && (
                          <span className="text-white text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: BADGE_COLORS.recommended.bg }}>
                            {BADGE_COLORS.recommended.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {typeDeleted
                          ? <span className="text-red-400">{product.product_type} (삭제됨)</span>
                          : product.product_type
                        }
                        {" · "}{product.price.toLocaleString()}원
                      </p>
                    </div>

                    {/* 노출 토글 */}
                    <div className="shrink-0 pr-1">
                      <StatusToggle
                        status={status}
                        onClick={() => {
                          const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
                          onStatusChange(product.id, next);
                        }}
                      />
                    </div>
                  </div>
                </SwipeableCard>
              );
            })}
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-20" />
                <col />
                <col />
                <col />
                <col />
                <col className="w-20" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-center">
                  <th className="pb-2 font-medium text-gray-400">이미지</th>
                  <th className="pb-2 font-medium text-gray-400">상품명</th>
                  <th className="pb-2 font-medium text-gray-400">뱃지</th>
                  <th className="pb-2 font-medium text-gray-400">유형</th>
                  <th className="pb-2 font-medium text-gray-400">가격</th>
                  <th className="pb-2 font-medium text-gray-400 text-center">노출</th>
                  <th className="pb-2 font-medium text-gray-400">관리</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((product) => {
                  const typeDeleted = !isValidType(product.product_type);
                  return (
                    <tr
                      key={product.id}
                      className={`border-b transition-colors text-center text-sm ${typeDeleted ? "border-red-200 bg-red-50/50 hover:bg-red-50" : "border-gray-100 hover:bg-gray-50"}`}
                    >
                      <td className="py-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                          {product.image_url ? (
                            <Image src={product.image_url} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium break-keep">{product.name}</td>
                      <td className="py-3 px-2">
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
                      <td className="py-3 px-2 whitespace-nowrap">
                        {typeDeleted
                          ? <span className="text-red-500 font-medium">{product.product_type} (삭제됨)</span>
                          : <span className="text-gray-700">{product.product_type}</span>
                        }
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">{product.price.toLocaleString()}원</td>
                      <td className="py-3 px-2 text-center">
                        <StatusToggle
                          status={product.status ?? "active"}
                          onClick={() => {
                            const cur = product.status ?? "active";
                            const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
                            onStatusChange(product.id, next);
                          }}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 justify-center">
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 페이징 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`text-xs w-8 py-1.5 rounded-lg border transition-colors ${
                n === currentPage
                  ? "bg-gold-500 text-white border-gold-500 font-medium"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
