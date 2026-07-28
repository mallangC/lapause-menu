"use client";

import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import AddReservationModal from "./AddReservationModal";
import { Reservation, SortKey } from "./reservations/types";
import { STATUS_ROW_BG, STATUS_LEGEND, PAGE_SIZE } from "./reservations/constants";
import ReservationDetail from "./reservations/ReservationDetail";
import CustomerProfileModal from "./reservations/CustomerProfileModal";
import { formatDateHeader, formatTimeOnly } from "./reservations/utils";

const ACTION_WIDTH = 116;

function SwipeableReservationCard({
  children,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const liveOffset = useRef(0);
  const isDragging = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startOffset.current = liveOffset.current;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.max(-ACTION_WIDTH, Math.min(0, startOffset.current + dx));
    liveOffset.current = next;
    setOffset(next);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const snap = liveOffset.current < -(ACTION_WIDTH / 2) ? -ACTION_WIDTH : 0;
    liveOffset.current = snap;
    setOffset(snap);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 액션 버튼 — 카드 뒤에 위치, 스와이프 시 드러남 */}
      <div className="absolute inset-y-0 right-0 flex items-stretch" style={{ width: ACTION_WIDTH }}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOffset(0); liveOffset.current = 0; onEdit(); }}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500 text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOffset(0); liveOffset.current = 0; onDelete(); }}
          className="flex-1 flex items-center justify-center bg-red-500 text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
      {/* 카드 본체 — z-10으로 버튼 위에 올라가 있다가 슬라이드로 버튼을 드러냄 */}
      <div
        ref={cardRef}
        style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? "none" : "transform 0.2s ease" }}
        className="relative z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

interface Props {
  companyId: string;
  allReservations: Reservation[];
  setAllReservations: Dispatch<SetStateAction<Reservation[]>>;
  loading: boolean;
  onRefresh: () => void;
  initialStatusFilter?: string;
  onClearStatusFilter?: () => void;
}

export default function ReservationsTab({ companyId, allReservations, setAllReservations, loading, onRefresh, initialStatusFilter, onClearStatusFilter }: Props) {
  const [page, setPage] = useState(1);
  const sortKey: SortKey = "desired_date";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [showPast, setShowPast] = useState(() => !!initialStatusFilter);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatusFilter);
  const [profileModal, setProfileModal] = useState<{ profileId: string; name: string; phone: string } | null>(null);
  const [itemStatusPopover, setItemStatusPopover] = useState<{ reservationId: string; itemIdx: number; x: number; y: number } | null>(null);
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState(0);
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = (lightboxUrl || showAddModal || !!profileModal || !!editingReservation || !!mobileDetailId) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxUrl, showAddModal, profileModal, editingReservation, mobileDetailId]);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price")
      .eq("company_id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setMessageCardEnabled(data.message_card_enabled ?? false);
        setMessageCardPrice(data.message_card_price ?? 0);
        setShoppingBagEnabled(data.shopping_bag_enabled ?? false);
        setShoppingBagPrice(data.shopping_bag_price ?? 0);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const updateStatus = async (id: string, status: string, cancelReason?: string) => {
    const previousStatus = allReservations.find((r) => r.id === id)?.status ?? "";
    await fetch(`/api/reservation/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, previousStatus, cancelReason }),
    });
    setAllReservations((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: status as Reservation["status"], ...(cancelReason ? { cancel_reason: cancelReason } : {}) } : r
    ));
  };

  const togglePaid = async (id: string, paid: boolean) => {
    await supabase.from("reservations").update({ paid }).eq("id", id);
    setAllReservations((prev) => prev.map((r) => r.id === id ? { ...r, paid } : r));
  };

  const saveDeliveryFee = async (r: Reservation, feeInput: string) => {
    const newFee = Number(feeInput) || 0;
    const oldFee = r.delivery_fee ?? 0;
    const newFinalPrice = (r.final_price ?? 0) - oldFee + newFee;
    await supabase.from("reservations").update({ delivery_fee: newFee, final_price: newFinalPrice }).eq("id", r.id);
    setAllReservations((prev) => prev.map((item) =>
      item.id === r.id ? { ...item, delivery_fee: newFee, final_price: newFinalPrice } : item
    ));
  };

  const saveMemo = async (id: string, memo: string) => {
    const trimmed = memo.trim() || null;
    await supabase.from("reservations").update({ admin_memo: trimmed }).eq("id", id);
    setAllReservations((prev) => prev.map((r) => r.id === id ? { ...r, admin_memo: trimmed } : r));
  };

  const updateItemStatus = async (reservationId: string, itemIdx: number, status: string) => {
    const r = allReservations.find((r) => r.id === reservationId);
    if (!r) return;
    const newItems = r.items.map((item, i) => i === itemIdx ? { ...item, status } : item);
    await supabase.from("reservations").update({ items: newItems }).eq("id", reservationId);
    setAllReservations((prev) => prev.map((r) => r.id === reservationId ? { ...r, items: newItems } : r));
    setItemStatusPopover(null);
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/reservation/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setAllReservations((prev) => prev.filter((r) => r.id !== id));
    setExpandedId(null);
    setMobileDetailId(null);
  };

  const mobileDetailReservation = mobileDetailId
    ? allReservations.find((r) => r.id === mobileDetailId) ?? null
    : null;

  const STATUS_DOT: Record<string, string> = {
    미확인: "bg-red-400",
    준비중: "bg-gray-400",
    제작완료: "bg-yellow-400",
    "픽업/배송완료": "bg-blue-400",
    취소: "bg-gray-300",
  };

  // 클라이언트 사이드 정렬 / 페이지네이션
  const today = new Date().toISOString().slice(0, 10);
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const isCurrentMonth = viewYear === nowYear && viewMonth === nowMonth;

  const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  const filtered = allReservations.filter((r) => {
    if (!r.desired_date.startsWith(monthPrefix)) return false;
    if (isCurrentMonth && !showPast && r.desired_date < today) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "취소" && b.status !== "취소") return 1;
    if (a.status !== "취소" && b.status === "취소") return -1;
    if (a.status === "미확인" && b.status !== "미확인") return -1;
    if (a.status !== "미확인" && b.status === "미확인") return 1;
    if (sortKey === "desired_date") {
      const aVal = `${a.desired_date} ${a.desired_time ?? ""}`;
      const bVal = `${b.desired_date} ${b.desired_time ?? ""}`;
      return aVal.localeCompare(bVal);
    }
    return 0;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // customer_profile_id 기준 방문 횟수 (NEW 뱃지용)
  const visitCounts = allReservations.reduce<Record<string, number>>((acc, r) => {
    const key = r.customer_profile_id;
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* 라이트박스 */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrl(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md text-gray-600 hover:text-gray-900 transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* 상품 상태 모달 */}
      {itemStatusPopover && (() => {
        const r = allReservations.find((r) => r.id === itemStatusPopover.reservationId);
        const item = r?.items[itemStatusPopover.itemIdx];
        if (!item) return null;
        return (
          <div className="fixed inset-0 z-50" onClick={() => setItemStatusPopover(null)}>
            <div
              className="absolute bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px]"
              style={{ top: itemStatusPopover.y, left: itemStatusPopover.x }}
              onClick={(e) => e.stopPropagation()}
            >
              {["준비중", "제작완료"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateItemStatus(itemStatusPopover.reservationId, itemStatusPopover.itemIdx, s)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${item.status === s ? "font-semibold text-gray-900" : "text-gray-600"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s === "제작완료" ? "bg-yellow-400" : "bg-gray-300"}`} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 고객 프로필 모달 */}
      {profileModal && (
        <CustomerProfileModal
          profileId={profileModal.profileId}
          ordererName={profileModal.name}
          ordererPhone={profileModal.phone}
          onClose={() => setProfileModal(null)}
        />
      )}

      {/* 예약 추가 모달 */}
      {showAddModal && (
        <AddReservationModal
          companyId={companyId}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); onRefresh(); }}
          messageCardEnabled={messageCardEnabled}
          messageCardPrice={messageCardPrice}
          shoppingBagEnabled={shoppingBagEnabled}
          shoppingBagPrice={shoppingBagPrice}
        />
      )}

      {/* 모바일 상세 모달 */}
      {mobileDetailReservation && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="flex-1" onClick={() => setMobileDetailId(null)} />
          <div className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[mobileDetailReservation.status] ?? "bg-gray-300"}`} />
                <span className="text-sm font-semibold text-gray-900">{mobileDetailReservation.orderer_name}</span>
                <span className="text-xs text-gray-400">{formatDateHeader(mobileDetailReservation.desired_date)}</span>
              </div>
              <button onClick={() => setMobileDetailId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <ReservationDetail
                key={mobileDetailReservation.id}
                r={mobileDetailReservation}
                onUpdateStatus={updateStatus}
                onOpenLightbox={setLightboxUrl}
                onSaveDeliveryFee={saveDeliveryFee}
                onTogglePaid={togglePaid}
                onEdit={(r) => { setMobileDetailId(null); setEditingReservation(r); }}
                onDelete={(id) => { setMobileDetailId(null); handleDeleteReservation(id); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 예약 수정 모달 */}
      {editingReservation && (
        <AddReservationModal
          companyId={companyId}
          initialData={editingReservation}
          reservationId={editingReservation.id}
          onClose={() => setEditingReservation(null)}
          onSaved={() => { setEditingReservation(null); onRefresh(); }}
          messageCardEnabled={messageCardEnabled}
          messageCardPrice={messageCardPrice}
          shoppingBagEnabled={shoppingBagEnabled}
          shoppingBagPrice={shoppingBagPrice}
        />
      )}

      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-900">예약 관리</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
              title="새로고침"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
            >
              + 예약 추가
            </button>
          </div>
        </div>

        {/* 상태 필터 배지 */}
        {statusFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">필터:</span>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gold-50 text-gold-600 border border-gold-200 font-medium">
              {statusFilter === "픽업/배송완료" ? "완료" : statusFilter}
              <button
                onClick={() => {
                  setStatusFilter(undefined);
                  setShowPast(false);
                  onClearStatusFilter?.();
                }}
                className="hover:text-gold-800 transition-colors"
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {/* 월 네비게이션 + 상태 범례 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 h-8">
            <button
              type="button"
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 2);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth() + 1);
                setShowPast(false); setPage(1);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-base"
            >‹</button>
            <span className="text-sm font-medium text-gray-700 w-20 text-center whitespace-nowrap">
              {viewYear}년 {viewMonth}월
            </span>
            <button
              type="button"
              onClick={() => {
                const d = new Date(viewYear, viewMonth);
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth() + 1);
                setShowPast(false); setPage(1);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-base"
            >›</button>
            {/* 건수 + 지난 예약 보기 */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-gray-400">({total}건)</span>
              {isCurrentMonth && (
                <button
                  onClick={() => { setShowPast((p) => !p); setPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${showPast ? "border-gray-400 text-gray-600 bg-gray-50" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  {showPast ? "지난 예약 숨기기" : "지난 예약 보기"}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            {STATUS_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : total === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">접수된 예약이 없습니다.</div>
        ) : (
          <>
          {/* 모바일 카드 목록 */}
          <div className="flex flex-col md:hidden">
            {paginated.map((r) => {
              const isCancelled = r.status === "취소";
              const productSummary = r.items?.length > 1
                ? `${r.items[0]?.name || r.items[0]?.type || "상품"} 외 ${r.items.length - 1}건`
                : r.items?.[0]?.name || r.items?.[0]?.type || "—";
              return (
                <SwipeableReservationCard
                  key={r.id}
                  onEdit={() => setEditingReservation(r)}
                  onDelete={() => handleDeleteReservation(r.id)}
                >
                  <div
                    onClick={() => setMobileDetailId(r.id)}
                    className={`border-b border-gray-200 p-3.5 cursor-pointer active:brightness-95 transition-all ${isCancelled ? "bg-gray-100" : (STATUS_ROW_BG[r.status] ?? "bg-white")}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${isCancelled ? "text-gray-400" : "text-gray-700"}`}>{formatDateHeader(r.desired_date)}</span>
                        {r.desired_time && <span className="text-xs text-gray-400">{formatTimeOnly(r.desired_time)}</span>}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCancelled ? "border border-gray-300 text-gray-400" : r.delivery_type === "배송" ? "border border-blue-400 text-blue-500" : "border border-gray-400 text-gray-500"}`}>
                        {r.delivery_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isCancelled ? "text-gray-400" : "text-gray-900"}`}>{r.orderer_name}</span>
                      <span className="text-xs text-gray-400 truncate max-w-[150px]">{productSummary}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-sm font-medium ${isCancelled ? "text-gray-400" : "text-gray-800"}`}>
                        {r.final_price ? `${r.final_price.toLocaleString()}원` : "—"}
                      </span>
                      <div className="flex items-center gap-2">
                        {!isCancelled && r.items?.some((item) => item.shopping_bag && item.shopping_bag !== "없음") && (
                          <span style={{ color: "#22c55e" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                            </svg>
                          </span>
                        )}
                        {!isCancelled && r.items?.some((item) => item.message_card && item.message_card !== "없음") && (
                          <span style={{ color: "#22c55e" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SwipeableReservationCard>
              );
            })}
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-center">
                  <th className="pb-2 font-medium text-gray-400 whitespace-nowrap"></th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">픽업/배송 희망</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">예약자</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">수령방법</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400">상품명</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">쇼핑백</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">메시지카드</th>
                  <th className="pb-2 font-medium text-gray-400 w-6" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, idx) => {
                  const expanded = expandedId === r.id;
                  const rowBg = STATUS_ROW_BG[r.status] ?? "bg-white";
                  const prevDate = idx > 0 ? paginated[idx - 1].desired_date : null;
                  const nextDate = idx < paginated.length - 1 ? paginated[idx + 1].desired_date : null;
                  const isNewDate = r.desired_date !== prevDate;
                  const isLastOfDate = r.desired_date !== nextDate;
                  const time = formatTimeOnly(r.desired_time);
                  const isMultiItem = (r.items?.length ?? 0) > 1;
                  const groupBorder = !expanded && isLastOfDate && nextDate ? "border-b border-gray-300" : "border-b border-gray-100";
                  const cancelCls = r.status === "취소" ? "line-through text-gray-400" : "";

                  return (
                    <React.Fragment key={r.id}>
                      {/* 예약 헤더 행 */}
                      <tr
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        className={`${rowBg} ${isMultiItem ? "border-b border-gray-50" : expanded ? "" : groupBorder} cursor-pointer hover:brightness-95 transition-all ${cancelCls}`}
                      >
                        <td className="py-3 pl-2 md:pl-0 text-xs whitespace-nowrap text-center font-medium text-gray-700">
                          {isNewDate ? formatDateHeader(r.desired_date) : ""}
                        </td>
                        <td className="py-3 pr-3 text-xs whitespace-nowrap text-center text-gray-800">
                          {time || "—"}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap text-center">
                          {r.customer_profile_id ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileModal({ profileId: r.customer_profile_id!, name: r.orderer_name, phone: r.orderer_phone });
                              }}
                              className="font-medium text-gray-800 hover:text-gold-600 hover:underline transition-colors"
                            >
                              {r.orderer_name}
                            </button>
                          ) : (
                            <span className="font-medium text-gray-800">{r.orderer_name}</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.delivery_type === "배송" ? "border border-blue-400 text-blue-500" : "border border-gray-500 text-gray-500"}`}>
                            {r.delivery_type}
                          </span>
                        </td>
                        {/* 단일 상품: 상품명·옵션 표시 / 복수 상품: 헤더는 비움 */}
                        {isMultiItem ? (
                          <>
                            <td className="py-3 pr-3 text-center">
                              <span className="text-xs text-gray-400">{r.items.length}개 상품</span>
                            </td>
                            <td className="py-3 pr-3 text-center" />
                            <td className="py-3 pr-3 text-center" />
                          </>
                        ) : (
                          <>
                            <td className="py-3 pr-3 text-gray-600 max-w-40 truncate text-center text-sm">
                              {r.items?.[0]?.name || r.items?.[0]?.type || "—"}
                            </td>
                            <td className="py-3 pr-3 text-center">
                              {(() => {
                                const val = r.items?.[0]?.shopping_bag;
                                return val && val !== "없음" ? (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${val === "추가" ? "border border-green-500 text-green-600" : "border border-purple-400 text-purple-500"}`}>{val}</span>
                                ) : <span className="text-xs text-gray-300">없음</span>;
                              })()}
                            </td>
                            <td className="py-3 pr-3 text-center">
                              {(() => {
                                const val = r.items?.[0]?.message_card;
                                return val && val !== "없음" ? (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${val === "추가" ? "border border-green-500 text-green-600" : "border border-purple-400 text-purple-500"}`}>{val}</span>
                                ) : <span className="text-xs text-gray-300">없음</span>;
                              })()}
                            </td>
                          </>
                        )}
                        <td className="py-3 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 inline-block transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </td>
                      </tr>

                      {/* 복수 상품 아이템 행 */}
                      {isMultiItem && r.items.map((item, itemIdx) => {
                        const isLastItem = itemIdx === r.items.length - 1;
                        const itemDone = item.status === "제작완료";
                        const itemBg = itemDone ? "bg-yellow-50" : item.status === "준비중" ? "bg-white" : rowBg;
                        return (
                          <tr
                            key={`${r.id}-item-${itemIdx}`}
                            onClick={(e) => { e.stopPropagation(); setItemStatusPopover({ reservationId: r.id, itemIdx, x: e.clientX, y: e.clientY }); }}
                            className={`${itemBg} brightness-[0.98] cursor-pointer hover:brightness-95 transition-all ${cancelCls} ${
                              isLastItem ? (expanded ? "" : groupBorder) : "border-b border-gray-100"
                            }`}
                          >
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2 pr-3 text-center">
                              <span className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                                <span className={`w-1 h-1 rounded-full shrink-0 inline-block ${itemDone ? "bg-yellow-400" : "bg-gray-300"}`} />
                                {item.name || item.type || "—"}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-center">
                              {item.shopping_bag !== "없음" ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${item.shopping_bag === "추가" ? "border border-green-500 text-green-600" : "border border-purple-400 text-purple-500"}`}>
                                  {item.shopping_bag}
                                </span>
                              ) : <span className="text-xs text-gray-300">없음</span>}
                            </td>
                            <td className="py-2 pr-3 text-center">
                              {item.message_card !== "없음" ? (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${item.message_card === "추가" ? "border border-green-500 text-green-600" : "border border-purple-400 text-purple-500"}`}>
                                  {item.message_card}
                                </span>
                              ) : <span className="text-xs text-gray-300">없음</span>}
                            </td>
                            <td className="py-2" />
                          </tr>
                        );
                      })}

                      {expanded && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={8} className="px-4 pb-4 pt-3 border-b border-gray-100">
                            <ReservationDetail
                              key={r.id}
                              r={r}
                              onUpdateStatus={updateStatus}
                              onOpenLightbox={setLightboxUrl}
                              onSaveDeliveryFee={saveDeliveryFee}
                              onTogglePaid={togglePaid}
                              onEdit={setEditingReservation}
                              onDelete={handleDeleteReservation}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 pt-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? "bg-gold-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
