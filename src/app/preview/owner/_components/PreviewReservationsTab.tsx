"use client";

import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import type { Reservation, SortKey } from "@/app/[slug]/admin/dashboard/reservations/types";
import { STATUS_ROW_BG, STATUS_LEGEND, PAGE_SIZE } from "@/app/[slug]/admin/dashboard/reservations/constants";
import { formatDateHeader, formatTimeOnly } from "@/app/[slug]/admin/dashboard/reservations/utils";
import Pagination from "@/components/admin/Pagination";
import PreviewReservationDetail from "./PreviewReservationDetail";
import PreviewAddReservationModal from "./PreviewAddReservationModal";
import PreviewCustomerProfileModal from "./PreviewCustomerProfileModal";
import { RV_ADD_EVENT, RV_CLOSE_EVENT, RV_OPEN_EVENT, RV_PROFILE_EVENT, RV_RESET_EVENT } from "../ReservationsCoach";
import { MOCK_CUSTOMER_MEMOS, MOCK_MESSAGE_CARD_PRICE, MOCK_SHOPPING_BAG_PRICE, PREVIEW_TODAY } from "../_mockReservations";

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
  allReservations: Reservation[];
  setAllReservations: Dispatch<SetStateAction<Reservation[]>>;
  initialStatusFilter?: string;
  onClearStatusFilter?: () => void;
  /** 미리보기에서 막아 둔 기능을 눌렀을 때 안내 */
  onNotice: (message: string) => void;
}

// 미리보기 예약 관리 — 실제 ReservationsTab 복사본. 예약은 목업 데이터(9~12월)를 쓰고,
// 상태 변경·메모·삭제는 화면 안에서만 바뀐다 (DB·서버 호출 없음). 오늘은 2026-11-10으로 고정
export default function PreviewReservationsTab({ allReservations, setAllReservations, initialStatusFilter, onClearStatusFilter, onNotice }: Props) {
  const loading = false;
  const [page, setPage] = useState(1);
  const sortKey: SortKey = "desired_date";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  // 예약자 이름을 누르면 나오는 손님 정보 (주문 횟수·메모) — 메모는 화면 안에서만 저장
  const [profileModal, setProfileModal] = useState<{ profileId: string; name: string; phone: string } | null>(null);
  const [customerMemos, setCustomerMemos] = useState<Record<string, string>>(MOCK_CUSTOMER_MEMOS);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => PREVIEW_TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => PREVIEW_TODAY.getMonth() + 1);
  const [showPast, setShowPast] = useState(() => !!initialStatusFilter);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatusFilter);
  const [itemStatusPopover, setItemStatusPopover] = useState<{ reservationId: string; itemIdx: number; x: number; y: number } | null>(null);
  const messageCardPrice = MOCK_MESSAGE_CARD_PRICE;
  const shoppingBagPrice = MOCK_SHOPPING_BAG_PRICE;
  const preservativePrice = 0;

  // ── 예약자 검색 (이름·전화번호, 전체 기간) ──
  // 돋보기를 누르면 입력칸이 펼쳐지고, 검색 결과는 allReservations에 합쳐 넣어 수정·삭제·상태 변경이 그대로 동작하게 한다.
  // (월 보기는 해당 달 예약만 걸러 보여주므로 다른 달 검색 결과가 섞이지 않는다)
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIds, setSearchIds] = useState<string[] | null>(null); // null = 검색 중 아님
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRequestId = useRef(0);


  // 검색어 판별: 숫자·하이픈·공백만이면 전화번호(숫자 4자리 이상), 아니면 이름(2글자 이상)
  const parseSearch = (q: string): { kind: "phone" | "name"; value: string } | null => {
    const t = q.trim();
    if (/^[\d\s-]+$/.test(t)) {
      const digits = t.replace(/\D/g, "");
      return digits.length >= 4 ? { kind: "phone", value: digits } : null;
    }
    return t.length >= 2 ? { kind: "name", value: t } : null;
  };

  // 미리보기 — DB 대신 목업 예약 전체(9~12월)에서 찾는다
  const runSearch = (q: string) => {
    const parsed = parseSearch(q);
    searchRequestId.current++;
    if (!parsed) {
      setSearchIds(null);
      setSearching(false);
      return;
    }
    const rows = allReservations.filter((r) =>
      parsed.kind === "phone" ? r.orderer_phone.replace(/\D/g, "").includes(parsed.value) : r.orderer_name.includes(parsed.value)
    );
    setSearchIds(rows.map((r) => r.id));
    setSearching(false);
    setPage(1);
  };

  // 입력이 멈추고 0.3초 뒤 검색
  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQuery), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const openSearch = () => {
    setSearchOpen(true);
    // 펼쳐지는 애니메이션과 함께 바로 입력할 수 있게 포커스 (모바일은 키보드가 올라옴)
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const closeSearch = () => {
    setSearchQuery("");
    setSearchIds(null);
    setSearchOpen(false);
    searchRequestId.current++;
    setPage(1);
  };

  useEffect(() => {
    document.body.style.overflow = (lightboxUrl || showAddModal || !!profileModal || !!mobileDetailId) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxUrl, showAddModal, profileModal, mobileDetailId]);

  // 미리보기 — 상태 변경·배송비·상품 상태·삭제는 화면 안에서만 바뀐다 (알림톡·DB 반영 없음)
  const updateStatus = (id: string, status: string, cancelReason?: string) => {
    setAllReservations((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: status as Reservation["status"], ...(cancelReason ? { cancel_reason: cancelReason } : {}) } : r
    ));
  };

  const saveDeliveryFee = (r: Reservation, feeInput: string) => {
    const newFee = Number(feeInput) || 0;
    const oldFee = r.delivery_fee ?? 0;
    const newFinalPrice = (r.final_price ?? 0) - oldFee + newFee;
    setAllReservations((prev) => prev.map((item) =>
      item.id === r.id ? { ...item, delivery_fee: newFee, final_price: newFinalPrice } : item
    ));
  };

  const updateItemStatus = (reservationId: string, itemIdx: number, status: string) => {
    setAllReservations((prev) => prev.map((r) =>
      r.id === reservationId ? { ...r, items: r.items.map((item, i) => (i === itemIdx ? { ...item, status } : item)) } : r
    ));
    setItemStatusPopover(null);
  };

  const handleDeleteReservation = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setAllReservations((prev) => prev.filter((r) => r.id !== id));
    setExpandedId(null);
    setMobileDetailId(null);
  };

  // 예약 수정은 미리보기에서 막아 두고 안내만 띄운다 (예약 추가는 화면 목록에만 더해진다)
  const blockEdit = () => onNotice("미리보기에서는 예약 수정을 할 수 없어요.");

  // 코치마크가 보내는 화면 조작 — 오늘 예약 중 해당 시간 예약을 펼치기 / 모바일 상세 닫기
  useEffect(() => {
    const isMobile = () => window.innerWidth < 768;
    const onOpen = (e: Event) => {
      const time = (e as CustomEvent<string>).detail;
      const target = allReservations.find((r) => r.desired_date === today && r.desired_time === time);
      if (!target) return;
      if (isMobile()) setMobileDetailId(target.id);
      else setExpandedId(target.id);
    };
    const onClose = () => setMobileDetailId(null);
    const onAdd = (e: Event) => {
      const open = (e as CustomEvent<boolean>).detail;
      if (open) setMobileDetailId(null);
      setShowAddModal(open);
    };
    // detail: 오늘 예약 시간 (예: "18:00") — 그 예약자의 손님 정보 창을 연다 / null이면 닫는다
    const onProfile = (e: Event) => {
      const time = (e as CustomEvent<string | null>).detail;
      const target = time ? allReservations.find((r) => r.desired_date === today && r.desired_time === time) : null;
      setProfileModal(target?.customer_profile_id ? { profileId: target.customer_profile_id, name: target.orderer_name, phone: target.orderer_phone } : null);
    };
    // 설명 시작 — 상태 필터·검색을 풀고 이번 달(오늘 이후) 보기로 되돌린다
    const onReset = () => {
      setStatusFilter(undefined);
      setShowPast(false);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchIds(null);
      setViewYear(PREVIEW_TODAY.getFullYear());
      setViewMonth(PREVIEW_TODAY.getMonth() + 1);
    };
    window.addEventListener(RV_RESET_EVENT, onReset);
    window.addEventListener(RV_OPEN_EVENT, onOpen);
    window.addEventListener(RV_CLOSE_EVENT, onClose);
    window.addEventListener(RV_ADD_EVENT, onAdd);
    window.addEventListener(RV_PROFILE_EVENT, onProfile);
    return () => {
      window.removeEventListener(RV_RESET_EVENT, onReset);
      window.removeEventListener(RV_OPEN_EVENT, onOpen);
      window.removeEventListener(RV_CLOSE_EVENT, onClose);
      window.removeEventListener(RV_ADD_EVENT, onAdd);
      window.removeEventListener(RV_PROFILE_EVENT, onProfile);
    };
  });

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
  // 미리보기의 오늘은 2026-11-10 고정
  const today = "2026-11-10";
  const nowYear = PREVIEW_TODAY.getFullYear();
  const nowMonth = PREVIEW_TODAY.getMonth() + 1;
  const isCurrentMonth = viewYear === nowYear && viewMonth === nowMonth;

  const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  const searchActive = searchIds !== null;
  const searchIdSet = new Set(searchIds ?? []);
  const filtered = allReservations.filter((r) => {
    if (searchActive) return searchIdSet.has(r.id) && (!statusFilter || r.status === statusFilter);
    if (!r.desired_date.startsWith(monthPrefix)) return false;
    if (isCurrentMonth && !showPast && r.desired_date < today) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // 검색 결과는 최근 수령일 순 (가장 최근 방문이 위로)
    if (searchActive) return `${b.desired_date} ${b.desired_time ?? ""}`.localeCompare(`${a.desired_date} ${a.desired_time ?? ""}`);
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

      {/* 손님 정보 모달 */}
      {profileModal && (
        <PreviewCustomerProfileModal
          key={profileModal.profileId}
          profileId={profileModal.profileId}
          ordererName={profileModal.name}
          ordererPhone={profileModal.phone}
          onClose={() => setProfileModal(null)}
          reservations={allReservations}
          initialMemo={customerMemos[profileModal.profileId] ?? ""}
          onSaveMemo={(memo) => setCustomerMemos((prev) => ({ ...prev, [profileModal.profileId]: memo }))}
        />
      )}

      {/* 예약 추가 모달 — 미리보기는 저장 대신 화면 목록에 더한다 */}
      {showAddModal && (
        <PreviewAddReservationModal
          onClose={() => setShowAddModal(false)}
          onSaved={(added) => {
            // 직접 추가한 예약도 손님 정보(메모)를 쓸 수 있게 손님을 묶는다 — 같은 전화번호의 손님이 있으면 그 손님, 없으면 새 손님
            setAllReservations((prev) => {
              const same = prev.find((r) => r.orderer_phone && r.orderer_phone === added.orderer_phone && r.customer_profile_id);
              const profileId = same?.customer_profile_id ?? `cp-new-${added.orderer_phone || added.id}`;
              return [{ ...added, customer_profile_id: profileId }, ...prev];
            });
            setShowAddModal(false);
            onNotice("예약이 목록에 추가됐어요.\n미리보기라 실제로 저장되지는 않아요.");
          }}
          messageCardEnabled
          messageCardPrice={messageCardPrice}
          shoppingBagEnabled
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
                {/* 예약자 이름 — 단골 손님이면 눌러서 손님 정보(주문 횟수·메모)를 연다 (PC 표의 이름 버튼과 같은 기능) */}
                {mobileDetailReservation.customer_profile_id ? (
                  <button
                    type="button"
                    onClick={() => setProfileModal({ profileId: mobileDetailReservation.customer_profile_id!, name: mobileDetailReservation.orderer_name, phone: mobileDetailReservation.orderer_phone })}
                    data-coach="rv-profile-name-m"
                    // 버튼처럼 테두리를 둘러 누를 수 있다는 걸 보여준다
                    className="px-2.5 py-0.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-900 active:bg-gray-100 transition-colors"
                  >
                    {mobileDetailReservation.orderer_name}
                  </button>
                ) : (
                  <span className="text-sm font-semibold text-gray-900">{mobileDetailReservation.orderer_name}</span>
                )}
                <span className="text-xs text-gray-400">{formatDateHeader(mobileDetailReservation.desired_date)}</span>
                {/* 수령 방법 배지 — 목록 카드와 같은 모양 (상세 본문에서는 뺐다) */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mobileDetailReservation.delivery_type === "배송" ? "border border-blue-400 text-blue-500" : "border border-gray-400 text-gray-500"}`}>
                  {mobileDetailReservation.delivery_type}
                </span>
              </div>
              <button onClick={() => setMobileDetailId(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <PreviewReservationDetail
                key={mobileDetailReservation.id}
                r={mobileDetailReservation}
                onUpdateStatus={updateStatus}
                onOpenLightbox={setLightboxUrl}
                onSaveDeliveryFee={saveDeliveryFee}
                onEdit={() => { setMobileDetailId(null); blockEdit(); }}
                onDelete={(id) => { setMobileDetailId(null); handleDeleteReservation(id); }}
                messageCardPrice={messageCardPrice}
                shoppingBagPrice={shoppingBagPrice}
                preservativePrice={preservativePrice}
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-900">예약 관리</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNotice("미리보기라 새로 불러올 예약이 없어요.")}
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
              data-coach="rv-add"
              className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
            >
              + 예약 추가
            </button>
          </div>
        </div>

        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-4">
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
          <div className="flex items-center gap-1 h-9">
            {/* 월 이동 — 검색 결과를 보는 중이거나, 모바일에서 검색창을 펼쳤을 땐 숨김 */}
            {!searchActive && (
              <div data-coach="rv-month" className={`items-center gap-1 min-w-0 ${searchOpen ? "hidden md:flex" : "flex"}`}>
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
            )}
            {searchActive && (
              <p className={`text-xs text-gray-500 whitespace-nowrap ${searchOpen ? "hidden md:block" : ""}`}>
                검색 결과 <span className="font-semibold text-gray-800">{total}건</span> · 전체 기간
              </p>
            )}

            {/* 예약자 검색 — 평소엔 돋보기만, 누르면 입력칸이 펼쳐짐 (모바일은 이 줄 전체를 차지) */}
            <div
              className={`ml-auto flex items-center h-9 rounded-lg border transition-all duration-200 ease-out overflow-hidden ${
                searchOpen
                  ? "flex-1 md:flex-none md:w-72 border-gray-300 bg-white"
                  : "w-9 border-transparent"
              }`}
            >
              <button
                type="button"
                onClick={() => (searchOpen ? searchInputRef.current?.focus() : openSearch())}
                className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-colors ${searchOpen ? "text-gray-400" : "text-gray-500 hover:bg-gray-100"}`}
                title="예약자 이름·전화번호 검색"
                aria-label="예약자 검색"
                data-coach="rv-search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.05 6.05a7.5 7.5 0 0 0 10.6 10.6Z" />
                </svg>
              </button>
              {searchOpen && (
                <>
                  <input
                    ref={searchInputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
                    // 비어 있을 때만 바깥을 누르면 접힘 (결과를 보다가 실수로 닫히지 않게)
                    onBlur={() => { if (!searchQuery.trim()) setTimeout(() => setSearchOpen((open) => (searchInputRef.current === document.activeElement ? open : false)), 150); }}
                    placeholder="예약자 이름 또는 전화번호"
                    // 모바일 사파리는 16px 미만 입력칸에 포커스하면 화면을 확대하므로 모바일은 text-base
                    className="flex-1 min-w-0 h-full bg-transparent text-base md:text-sm text-gray-800 placeholder:text-gray-300 outline-none [&::-webkit-search-cancel-button]:hidden"
                  />
                  {searching && (
                    <span className="w-4 h-4 mr-1 shrink-0 rounded-full border-2 border-gray-200 border-t-gold-500 animate-spin" />
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={closeSearch}
                    className="w-9 h-9 shrink-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="검색 닫기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 검색 안내 / 모바일에서 검색창을 펼친 동안의 결과 건수 */}
          {searchOpen && searchActive && (
            <p className="md:hidden text-xs text-gray-500 -mt-1">
              검색 결과 <span className="font-semibold text-gray-800">{total}건</span> · 전체 기간
            </p>
          )}
          {searchOpen && !searchActive && searchQuery.trim() && !searching && (
            <p className="text-xs text-gray-400 -mt-1 md:text-right">이름은 2글자, 전화번호는 숫자 4자리 이상 입력해주세요</p>
          )}
          <div data-coach="rv-legend" className="flex items-center flex-nowrap gap-2 sm:gap-3 justify-center sm:justify-end overflow-x-auto no-scrollbar">
            {STATUS_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : total === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {searchActive ? "검색된 예약이 없습니다." : "접수된 예약이 없습니다."}
          </div>
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
                  onEdit={blockEdit}
                  onDelete={() => handleDeleteReservation(r.id)}
                >
                  <div
                    data-coach={r.status === "미확인" ? "rv-unconfirmed" : undefined}
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
                        data-coach={r.status === "미확인" ? "rv-unconfirmed" : undefined}
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
                              data-coach="rv-profile-name"
                              data-rv-time={r.desired_time}
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
                            <PreviewReservationDetail
                              key={r.id}
                              r={r}
                              onUpdateStatus={updateStatus}
                              onOpenLightbox={setLightboxUrl}
                              onSaveDeliveryFee={saveDeliveryFee}
                              onEdit={blockEdit}
                              onDelete={handleDeleteReservation}
                              messageCardPrice={messageCardPrice}
                              shoppingBagPrice={shoppingBagPrice}
                              preservativePrice={preservativePrice}
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
        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="pt-2" />
        </div>
      </div>
    </>
  );
}
