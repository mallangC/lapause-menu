"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AddReservationModal from "./AddReservationModal";
import { Reservation, SortKey } from "./reservations/types";
import { STATUS_ROW_BG, STATUS_LEGEND, PAGE_SIZE } from "./reservations/constants";
import ReservationDetail from "./reservations/ReservationDetail";
import CustomerProfileModal from "./reservations/CustomerProfileModal";
import { formatDateHeader, formatTimeOnly } from "./reservations/utils";

interface Props {
  companyId: string;
}

export default function ReservationsTab({ companyId }: Props) {
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const sortKey: SortKey = "desired_date";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [showPast, setShowPast] = useState(false);
  const [profileModal, setProfileModal] = useState<{ profileId: string; name: string; phone: string } | null>(null);
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState(0);
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = (lightboxUrl || showAddModal || !!profileModal || !!editingReservation) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxUrl, showAddModal, profileModal, editingReservation]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setAllReservations((data as Reservation[]) ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

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

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/reservation/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setAllReservations((prev) => prev.filter((r) => r.id !== id));
    setExpandedId(null);
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
          onSaved={() => { setShowAddModal(false); fetchReservations(); }}
          messageCardEnabled={messageCardEnabled}
          messageCardPrice={messageCardPrice}
          shoppingBagEnabled={shoppingBagEnabled}
          shoppingBagPrice={shoppingBagPrice}
        />
      )}

      {/* 예약 수정 모달 */}
      {editingReservation && (
        <AddReservationModal
          companyId={companyId}
          initialData={editingReservation}
          reservationId={editingReservation.id}
          onClose={() => setEditingReservation(null)}
          onSaved={() => { setEditingReservation(null); fetchReservations(); }}
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
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
          >
            + 예약 추가
          </button>
        </div>

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
          <div className="overflow-x-auto">
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
                        return (
                          <tr
                            key={`${r.id}-item-${itemIdx}`}
                            onClick={() => setExpandedId(expanded ? null : r.id)}
                            className={`${rowBg} brightness-[0.98] cursor-pointer hover:brightness-95 transition-all ${cancelCls} ${
                              isLastItem ? (expanded ? "" : groupBorder) : "border-b border-gray-100"
                            }`}
                          >
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2" />
                            <td className="py-2 pr-3 text-center">
                              <span className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0 inline-block" />
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
