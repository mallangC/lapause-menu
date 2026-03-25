"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AddReservationModal from "./AddReservationModal";
import { Reservation, SortKey } from "./reservations/types";
import { STATUS_ROW_BG, STATUS_LEGEND, PAGE_SIZE } from "./reservations/constants";
import ReservationCalendar from "./reservations/ReservationCalendar";
import ReservationDetail from "./reservations/ReservationDetail";
import CustomerProfileModal from "./reservations/CustomerProfileModal";

interface Props {
  companyId: string;
}

export default function ReservationsTab({ companyId }: Props) {
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("desired_date");
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [profileModal, setProfileModal] = useState<{ profileId: string; name: string; phone: string } | null>(null);
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState(0);
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = (lightboxUrl || showAddModal || !!profileModal) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxUrl, showAddModal, profileModal]);

  useEffect(() => { setPage(1); }, [selectedDay]);

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
      .from("companies")
      .select("message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price")
      .eq("id", companyId)
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
    const update: Record<string, unknown> = { status };
    if (status === "취소" && cancelReason) update.cancel_reason = cancelReason;
    await supabase.from("reservations").update(update).eq("id", id);
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
    const newFinalPrice = (r.final_price ?? r.product_price) - oldFee + newFee;
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

  // 클라이언트 사이드 필터 / 정렬 / 페이지네이션
  const filtered = selectedDay
    ? allReservations.filter((r) => r.desired_date === selectedDay)
    : allReservations;

  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "취소" && b.status !== "취소") return 1;
    if (a.status !== "취소" && b.status === "취소") return -1;
    if (a.status === "미확인" && b.status !== "미확인") return -1;
    if (a.status !== "미확인" && b.status === "미확인") return 1;
    if (sortKey === "desired_date") {
      const aVal = `${a.desired_date} ${a.desired_time ?? ""}`;
      const bVal = `${b.desired_date} ${b.desired_time ?? ""}`;
      return bVal.localeCompare(aVal);
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

  const dayCounts = allReservations.reduce<Record<string, number>>((acc, r) => {
    if (r.desired_date && r.status !== "취소") {
      acc[r.desired_date] = (acc[r.desired_date] ?? 0) + 1;
    }
    return acc;
  }, {});

  const unconfirmedDays = allReservations.reduce<Set<string>>((acc, r) => {
    if (r.desired_date && r.status === "미확인") acc.add(r.desired_date);
    return acc;
  }, new Set());

  const handlePrevMonth = () => {
    if (calendarMonth === 0) { setCalendarYear((y) => y - 1); setCalendarMonth(11); }
    else setCalendarMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calendarMonth === 11) { setCalendarYear((y) => y + 1); setCalendarMonth(0); }
    else setCalendarMonth((m) => m + 1);
  };

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

      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-900">
            예약 관리 <span className="text-sm text-gray-400 font-normal ml-1">({total}건)</span>
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
          >
            + 예약 추가
          </button>
        </div>

        {/* 달력 */}
        <ReservationCalendar
          year={calendarYear}
          month={calendarMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          dayCounts={dayCounts}
          unconfirmedDays={unconfirmedDays}
        />

        {/* 테이블 */}
        {/* 상태 범례 */}
        <div className="flex items-center gap-3 justify-end">
          {STATUS_LEGEND.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
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
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">수령방법</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">채널</th>
                  <th className="pb-2 pr-3 whitespace-nowrap">
                    <button
                      onClick={() => { setSortKey("desired_date"); setPage(1); }}
                      className={`font-medium transition-colors ${sortKey === "desired_date" ? "text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      픽업/배송 희망{sortKey === "desired_date" && <span className="ml-1 text-xs">↓</span>}
                    </button>
                  </th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">예약자</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400">상품명</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">결제</th>
                  <th className="pb-2 pr-3 font-medium text-gray-400 whitespace-nowrap">메시지카드</th>
                  <th className="pb-2 font-medium text-gray-400 w-6" />
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const expanded = expandedId === r.id;
                  const rowBg = STATUS_ROW_BG[r.status] ?? "bg-white";

                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        className={`${rowBg} border-b border-gray-100 cursor-pointer hover:brightness-95 transition-all ${r.status === "취소" ? "line-through text-gray-400" : ""}`}
                      >
                        <td className="py-3 pr-3 whitespace-nowrap text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.delivery_type === "배송" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                            {r.delivery_type}
                          </span>
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap text-center">
                          {r.channel === "네이버" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#03C75A] text-white">네이버</span>}
                          {r.channel === "카카오" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEE500] text-gray-800">카카오</span>}
                          {r.channel === "워크인" && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-400 text-white">워크인</span>}
                        </td>
                        <td className="py-3 pr-3 text-xs text-gray-600 whitespace-nowrap text-center">
                          {r.desired_date.slice(5)}{r.desired_time ? ` ${r.desired_time}` : ""}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {r.customer_profile_id && visitCounts[r.customer_profile_id] === 1 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gold-500 text-white leading-none">NEW</span>
                            )}
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
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-gray-600 max-w-40 truncate text-center">{r.product_name}</td>
                        <td className="py-3 pr-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePaid(r.id, !r.paid); }}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors whitespace-nowrap ${r.paid ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                          >
                            {r.paid ? "결제완료" : "미결제"}
                          </button>
                        </td>
                        <td className="py-3 pr-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${r.message_card === "있음" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                            {r.message_card}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 inline-block transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={8} className="px-4 pb-4 pt-3 border-b border-gray-100">
                            <ReservationDetail
                              key={r.id}
                              r={r}
                              onUpdateStatus={updateStatus}
                              onOpenLightbox={setLightboxUrl}
                              onSaveDeliveryFee={saveDeliveryFee}
                              onSaveMemo={saveMemo}
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
