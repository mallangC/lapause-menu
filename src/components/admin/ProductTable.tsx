"use client";

import { DEFAULT_INSTANT_MENU_NAME } from "@/lib/afterHours";
import RowActionMenu from "@/components/admin/RowActionMenu";
import PriceTag from "@/components/PriceTag";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import StoreImage from "@/components/StoreImage";
import { Product, ProductStatus } from "@/types";
import { BADGE_COLORS, MOODS, PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import { sortByOrder } from "@/lib/productTypes";
import { useCategoryOrder } from "@/hooks/useCategoryOrder";
import { createClient } from "@/lib/supabase/client";
import Pagination from "@/components/admin/Pagination";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  /** 복제 — 같은 내용으로 새 상품 추가 창을 연다 */
  onDuplicate?: (product: Product) => void;
  onStatusChange: (id: string, status: ProductStatus) => void;
  companyId: string;
  /** 필터를 걸었을 때 걸러진 개수 (필터가 없으면 null) — 제목 옆 개수 표시용 */
  onFilteredCountChange?: (count: number | null) => void;
  /** 지금 삭제 중인 상품 — 끝날 때까지 로딩 */
  deletingId?: string | null;
}

const STATUS_CYCLE: ProductStatus[] = ["active", "inactive", "soldout"];
const STATUS_LABELS: Record<ProductStatus, string> = { active: "활성화", inactive: "비활성화", soldout: "품절" };
// 누를 때마다 활성화 → 비활성화 → 품절 — 예전 켜기/끄기 스위치 모양에 칸을 하나 더 (비활성화 왼쪽·회색 / 품절 가운데·노랑 / 활성화 오른쪽·초록)
const STATUS_TRACK: Record<ProductStatus, string> = { active: "bg-emerald-500", inactive: "bg-gray-300", soldout: "bg-amber-400" };
const STATUS_THUMB: Record<ProductStatus, string> = { inactive: "translate-x-0.5", soldout: "translate-x-[14px]", active: "translate-x-[26px]" };
const STATUS_TEXT: Record<ProductStatus, string> = { active: "text-emerald-600", inactive: "text-gray-400", soldout: "text-amber-600" };

/** 다음 상태 — 재고 관리 중인데 재고가 0개면 활성화를 건너뛴다 (재고를 채워야 팔 수 있다) */
function nextStatus(p: { status?: ProductStatus | null; stock_enabled?: boolean; stock?: number | null }): ProductStatus {
  const cur = p.status ?? "active";
  let next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
  if (next === "active" && p.stock_enabled && (p.stock ?? 0) <= 0) {
    alert("재고가 0개라 활성화할 수 없어요. 상품 수정에서 재고를 채워 주세요.");
    next = cur === "inactive" ? "soldout" : "inactive";
  }
  return next;
}

function StatusToggle({ status, onClick }: { status: ProductStatus; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`상태: ${STATUS_LABELS[status]} (누르면 바뀜)`}
      title="누르면 활성화 → 비활성화 → 품절 순서로 바뀌어요"
      className="flex flex-col items-center gap-0.5 group mx-auto"
    >
      <div className={`relative w-11 h-5 rounded-full transition-colors duration-200 ${STATUS_TRACK[status]} group-hover:opacity-80`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${STATUS_THUMB[status]}`} />
      </div>
      <span className={`text-[10px] leading-none ${STATUS_TEXT[status]}`}>{STATUS_LABELS[status]}</span>
    </button>
  );
}

const ACTION_WIDTH = 180;

function SwipeableCard({ children, onEdit, onDuplicate, onDelete, deleting }: { children: React.ReactNode; onEdit: () => void; onDuplicate?: () => void; onDelete: () => void; deleting?: boolean }) {
  const [offset, setOffset] = useState(0);
  // 버튼 수만큼 (수정·복제·삭제 = 60px 씩)
  const actionWidth = onDuplicate ? ACTION_WIDTH : (ACTION_WIDTH * 2) / 3;
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
    const next = Math.max(-actionWidth, Math.min(0, startOffset.current + diff));
    liveOffset.current = next;
    setOffset(next);
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    setOffset(liveOffset.current < -(actionWidth / 2) ? -actionWidth : 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 액션 버튼 — 오른쪽에 고정 */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: actionWidth }}>
        <button
          onClick={() => { setOffset(0); onEdit(); }}
          className="flex-1 flex items-center justify-center text-white bg-blue-500 active:bg-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L8.5 18.81l-4 1 1-4 11.362-11.323z" />
          </svg>
        </button>
        {onDuplicate && (
          <button
            onClick={() => { setOffset(0); onDuplicate(); }}
            aria-label="복사"
            className="flex-1 flex items-center justify-center text-white bg-gray-500 active:bg-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
          </button>
        )}
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
      {/* 삭제 중 — 카드를 덮어 로딩을 보여주고 다른 동작을 막는다 */}
      {deleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-white/75 text-sm text-gray-600">
          <span className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
          삭제하는 중...
        </div>
      )}
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

interface FilterSection {
  /** 묶음 안 작은 제목 (표시: 뱃지 / 상태) */
  title?: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

/**
 * 필터 버튼 하나 — 누르면 바로 아래로 선택지가 펼쳐진다 (고르면 닫힘, 같은 걸 다시 고르면 해제)
 * 고른 게 있으면 버튼이 진하게 바뀌고 고른 이름이 보인다 · ✕로 바로 해제
 * 창은 화면 맨 위층에 띄운다 (목록 상자에 잘리지 않게) — 스크롤·화면 크기가 바뀌면 닫는다
 */
function FilterMenu({ title, sections }: { title: string; sections: FilterSection[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const picked = sections.flatMap((s) => s.options.filter((o) => o.value && o.value === s.selected).map((o) => o.label));
  const active = picked.length > 0;

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const open = (el: HTMLElement) => {
    if (pos) return setPos(null);
    const r = el.getBoundingClientRect();
    const width = 208;
    setPos({ top: r.bottom + 6, left: Math.max(16, Math.min(r.left, window.innerWidth - 16 - width)) });
  };

  return (
    <>
      <span
        className={`shrink-0 inline-flex items-center rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
          active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
        }`}
      >
        <button type="button" onClick={(e) => open(e.currentTarget.parentElement as HTMLElement)} className={`flex items-center gap-1 py-1.5 ${active ? "pl-3 pr-1" : "px-3"}`}>
          {active ? picked.join(" · ") : title}
          {!active && (
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        {active && (
          <button
            type="button"
            aria-label={`${title} 필터 해제`}
            onClick={() => sections.forEach((s) => s.selected && s.onSelect(""))}
            className="pr-2.5 pl-1 py-1.5 text-white/70 hover:text-white"
          >
            ✕
          </button>
        )}
      </span>
      {pos && typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setPos(null)} />
            <div style={{ top: pos.top, left: pos.left }} className="fixed z-[61] w-52 max-h-[60vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 animate-[bell-pop_.12s_ease-out] origin-top-left">
              {sections.map((s, i) => (
                <div key={i} className={i > 0 ? "border-t border-gray-100 mt-1.5 pt-1.5" : ""}>
                  {s.title && <p className="px-3 pt-1 pb-0.5 text-[11px] text-gray-400">{s.title}</p>}
                  {s.options.map((o) => {
                    const on = s.selected === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => { s.onSelect(on ? "" : o.value); setPos(null); }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${on ? "text-gray-900 font-medium bg-gray-50" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        <span className="truncate">{o.label}</span>
                        {on && <span className="text-gold-500 text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

export default function ProductTable({ products, onEdit, onDelete, onDuplicate, onStatusChange, companyId, onFilteredCountChange, deletingId = null }: ProductTableProps) {
  const [sortKey, setSortKey] = useState<"price_asc" | "price_desc" | "date_desc" | "date_asc">("date_desc");
  const [knownCustomTypes, setKnownCustomTypes] = useState<string[]>([]);
  // 매장 시즌 — 추가한 시즌 + 지우지 않은 기본 시즌
  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const supabase = createClient();
  // 사장님이 메뉴 설정에서 정한 유형 순서 (필터 칩 순서)
  const categoryOrder = useCategoryOrder(companyId);

  useEffect(() => {
    supabase
      .from("company_categories")
      .select("name, category_type")
      .eq("company_id", companyId)
      .then(({ data }) => {
        if (data) {
          setKnownCustomTypes(data.filter((c) => c.category_type === "product_type").map((c) => c.name));
          setCustomSeasons(data.filter((c) => c.category_type === "season").map((c) => c.name));
        }
        setTypesLoading(false);
      });
    supabase
      .from("company_settings")
      .select("hidden_seasons, instant_menu_name")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        setHiddenSeasons((data?.hidden_seasons as string[] | null) ?? []);
        setInstantName((data?.instant_menu_name as string | null)?.trim() || DEFAULT_INSTANT_MENU_NAME);
      });
  }, [companyId]);

  const isValidType = (type: string) =>
    (PRODUCT_TYPES as readonly string[]).includes(type) || knownCustomTypes.includes(type);
  const [filterType, setFilterType] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [instantName, setInstantName] = useState<string>(DEFAULT_INSTANT_MENU_NAME);
  // 분위기 — '' 전체 / 분위기 이름 / '__none' 분위기를 안 정한 상품
  const [filterMood, setFilterMood] = useState("");
  const [filterBadge, setFilterBadge] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const resetPage = () => setPage(1);

  const filtered = [...products]
    .filter((p) => {
      if (filterType && p.product_type !== filterType) return false;
      // '__instant' — 바로 구매 메뉴 상품
      if (filterSeason === "__instant" ? !p.instant : filterSeason && !(p.seasons ?? []).includes(filterSeason)) return false;
      if (filterMood === "__none" ? !!p.mood : filterMood && p.mood !== filterMood) return false;
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

  const hasFilter = filterType || filterSeason || filterMood || filterBadge || filterStatus;

  // 개수는 '상품 목록' 제목 옆에 고정해서 보여준다 (필터 칩 줄 끝에 두면 가로 스크롤 뒤로 밀려 안 보인다)
  const shownCount = hasFilter ? filtered.length : null;
  useEffect(() => { onFilteredCountChange?.(shownCount); }, [shownCount]);

  // 시즌 필터 칩 — 매장 시즌(메뉴 설정 순서대로) + 시즌을 지웠어도 아직 그 시즌이 붙은 상품이 있으면 함께
  const usedSeasons = new Set(products.flatMap((p) => p.seasons ?? []));
  const seasonChips = sortByOrder(
    [
      ...SEASONS.filter((x) => !hiddenSeasons.includes(x) || usedSeasons.has(x)),
      ...customSeasons.filter((x) => !(SEASONS as readonly string[]).includes(x)),
      ...[...usedSeasons].filter((x) => !(SEASONS as readonly string[]).includes(x) && !customSeasons.includes(x)),
    ],
    categoryOrder.seasons,
  );

  const clearFilters = () => {
    setFilterType("");
    setFilterSeason("");
    setFilterMood("");
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

        {/* 묶음별 필터 — 유형·시즌이 늘어도 버튼 수는 그대로 (누르면 아래로 펼쳐 고른다) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterMenu
            title="유형"
            sections={[{ options: sortByOrder([...PRODUCT_TYPES, ...knownCustomTypes], categoryOrder.productTypes).map((t) => ({ value: t, label: t })), selected: filterType, onSelect: (v) => { setFilterType(v); resetPage(); } }]}
          />
          {(seasonChips.length > 0 || products.some((p) => p.instant)) && (
            <FilterMenu
              title="메뉴"
              sections={[{
                options: [
                  // 바로 구매 메뉴에 넣은 상품
                  ...(products.some((p) => p.instant) ? [{ value: "__instant", label: instantName }] : []),
                  ...seasonChips.map((x) => ({ value: x, label: x })),
                ],
                selected: filterSeason,
                onSelect: (v) => { setFilterSeason(v); resetPage(); },
              }]}
            />
          )}
          {/* 분위기 — 상품마다 분위기를 다시 고를 때 묶어 보기 좋게 ('분위기 없음'은 아직 안 정한 상품) */}
          <FilterMenu
            title="분위기"
            sections={[{ options: [...MOODS, "__none"].map((m) => ({ value: m, label: m === "__none" ? "분위기 없음" : m })), selected: filterMood, onSelect: (v) => { setFilterMood(v); resetPage(); } }]}
          />
          <FilterMenu
            title="표시"
            sections={[
              { title: "뱃지", options: [{ value: "popular", label: "인기" }, { value: "recommended", label: "추천" }], selected: filterBadge, onSelect: (v) => { setFilterBadge(v); resetPage(); } },
              { title: "상태", options: [{ value: "active", label: "활성화" }, { value: "inactive", label: "비활성화" }, { value: "soldout", label: "품절" }], selected: filterStatus, onSelect: (v) => { setFilterStatus(v); resetPage(); } },
            ]}
          />
          {hasFilter && (
            <button onClick={clearFilters} className="shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap px-1">
              초기화 ✕
            </button>
          )}
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
                  onDuplicate={onDuplicate ? () => onDuplicate(product) : undefined}
                  onDelete={() => onDelete(product.id)}
                  deleting={deletingId === product.id}
                >
                  <div className={`flex items-center gap-3 py-3 ${typeDeleted ? "bg-red-50/50" : ""}`}>
                    {/* 이미지 */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {product.image_url ? (
                        <StoreImage thumb src={product.image_url} alt={product.name} width={56} height={56} className="w-full h-full object-cover" />
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
                      {product.stock_enabled && <p className={`text-xs ${(product.stock ?? 0) > 0 ? "text-gray-400" : "text-amber-600"}`}>재고 {product.stock ?? 0}개</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {typeDeleted
                          ? <span className="text-red-400">{product.product_type} (삭제됨)</span>
                          : product.product_type
                        }
                        {" · "}<PriceTag price={product.price} original={product.original_price} size="xs" className="!font-normal" />
                      </p>
                    </div>

                    {/* 상태 — 누를 때마다 활성화 → 비활성화 → 품절 */}
                    <div className="shrink-0 pr-1">
                      <StatusToggle
                        status={status}
                        onClick={() => {
                          const next = nextStatus(product);
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
                  <th className="pb-2 font-medium text-gray-400 text-center">상태</th>
                  <th className="pb-2 font-medium text-gray-400">관리</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((product) => {
                  const typeDeleted = !isValidType(product.product_type);
                  return (
                    <tr
                      key={product.id}
                      className={`border-b transition-colors text-center text-sm ${typeDeleted ? "border-red-200 bg-red-50/50 hover:bg-red-50" : "border-gray-100 hover:bg-gray-50"} ${deletingId === product.id ? "opacity-50" : ""}`}
                    >
                      <td className="py-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 mx-auto">
                          {product.image_url ? (
                            <StoreImage thumb src={product.image_url} alt={product.name} width={64} height={64} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium break-keep">
                        {product.name}
                        {/* 재고 관리 중이면 남은 개수 */}
                        {product.stock_enabled && <span className={`block text-xs font-normal ${(product.stock ?? 0) > 0 ? "text-gray-400" : "text-amber-600"}`}>재고 {product.stock ?? 0}개</span>}
                      </td>
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
                      <td className="py-3 px-2 whitespace-nowrap"><PriceTag price={product.price} original={product.original_price} size="sm" empty="0원" /></td>
                      <td className="py-3 px-2 text-center">
                        <StatusToggle
                          status={product.status ?? "active"}
                          onClick={() => {
                            const next = nextStatus(product);
                            onStatusChange(product.id, next);
                          }}
                        />
                      </td>
                      <td className="py-3 px-2">
                        {/* 수정·복제·삭제 — '⋯' 를 누르면 작은 메뉴로 */}
                        <div className="flex justify-center">
                          <RowActionMenu
                            busy={deletingId === product.id}
                            actions={[
                              { label: "수정", onClick: () => onEdit(product) },
                              ...(onDuplicate ? [{ label: "복사", onClick: () => onDuplicate(product) }] : []),
                              { label: "삭제", danger: true, onClick: () => onDelete(product.id) },
                            ]}
                          />
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
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} className="pt-2" />
    </div>
  );
}
