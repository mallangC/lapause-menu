"use client";

import { useState, useRef, useEffect } from "react";
import { ORDER_PATH_LABEL, trafficSourceLabel, type OrderPath } from "@/lib/trafficSource";
import { Reservation } from "./types";
import { STATUS_OPTIONS } from "./constants";
import { formatDateTime, formatPhone } from "./utils";
import CopyButton from "./CopyButton";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP } from "@/lib/constants";

// 서버(api/reservation/[id]/status)의 ALLOWED_TRANSITIONS와 동일 — 허용 안 되는 전이는 요청 자체를 보내지 않는다.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  "미확인": ["준비중", "취소"],
  "준비중": ["제작완료", "픽업/배송완료", "취소"],
  "제작완료": ["픽업/배송완료", "취소"],
  "픽업/배송완료": ["취소"],
  "취소": [],
};

const STATUS_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  미확인:      { dot: "bg-red-400",    text: "text-red-600",    bg: "hover:bg-red-50" },
  준비중:      { dot: "bg-gray-300",   text: "text-gray-400",   bg: "hover:bg-gray-50" },
  제작완료:    { dot: "bg-yellow-400", text: "text-yellow-700", bg: "hover:bg-yellow-50" },
  "픽업/배송완료": { dot: "bg-blue-400",  text: "text-blue-600",   bg: "hover:bg-blue-50" },
  취소:        { dot: "bg-gray-400",   text: "text-gray-600",   bg: "hover:bg-gray-50" },
};

interface Props {
  r: Reservation;
  onUpdateStatus: (id: string, status: string, cancelReason?: string) => void;
  onOpenLightbox: (url: string) => void;
  onSaveDeliveryFee: (r: Reservation, fee: string) => void;
  onEdit: (r: Reservation) => void;
  onDelete: (id: string) => void;
  messageCardPrice?: number;
  shoppingBagPrice?: number;
  preservativePrice?: number;
}

function addonCount(value?: string | null) {
  if (!value) return 0;
  if (value === "추가") return 1;
  const m = value.match(/^(\d+)/);
  return m ? Number(m[1]) : 0;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-2">
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center sm:items-start gap-2 text-sm">
      <span className="w-16 shrink-0 text-gray-400">{label}</span>
      <span className="text-gray-800 flex-1 min-w-0">{children}</span>
    </div>
  );
}

export default function ReservationDetail({
  r,
  onUpdateStatus,
  onOpenLightbox,
  onSaveDeliveryFee,
  onEdit,
  onDelete,
  messageCardPrice = 0,
  shoppingBagPrice = 0,
  preservativePrice = 0,
}: Props) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [showPayLinkModal, setShowPayLinkModal] = useState(false);
  const [payLinkHours, setPayLinkHours] = useState("24");
  const [payLinkLoading, setPayLinkLoading] = useState(false);
  const [payLinkResult, setPayLinkResult] = useState<{ token: string; expiresAt: string } | null>(
    r.payment_token && r.payment_link_expires_at
      ? { token: r.payment_token, expiresAt: r.payment_link_expires_at }
      : null
  );
  const [payLinkCopied, setPayLinkCopied] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [extendHours, setExtendHours] = useState("24");

  const handleExtendPayLink = async () => {
    if (!payLinkResult) return;
    setPayLinkLoading(true);
    try {
      const res = await fetch("/api/pay-link/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: r.id, expiresInHours: Number(extendHours) }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setPayLinkResult({ token: payLinkResult.token, expiresAt: data.expiresAt });
      setIsExtending(false);
    } catch {
      alert("연장에 실패했습니다.");
    } finally {
      setPayLinkLoading(false);
    }
  };

  const handleGeneratePayLink = async () => {
    setPayLinkLoading(true);
    try {
      const res = await fetch("/api/pay-link/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: r.id, expiresInHours: Number(payLinkHours) }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setPayLinkResult(data);
    } catch {
      alert("링크 생성에 실패했습니다.");
    } finally {
      setPayLinkLoading(false);
    }
  };

  const slug = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";
  const payLinkUrl = payLinkResult
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${slug}/pay/${payLinkResult.token}`
    : null;

  const handleCopyPayLink = () => {
    if (!payLinkUrl) return;
    navigator.clipboard.writeText(payLinkUrl).then(() => {
      setPayLinkCopied(true);
      setTimeout(() => setPayLinkCopied(false), 2000);
    });
  };

  const [editingDeliveryFee, setEditingDeliveryFee] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(r.delivery_fee != null ? String(r.delivery_fee) : "");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [productDetail, setProductDetail] = useState<Product | null>(null);

  useEffect(() => {
    const productId = r.items?.[0]?.product_id;
    if (!productId) return;
    const supabase = createClient();
    supabase.from("products").select("*").eq("id", productId).single()
      .then(({ data }) => { if (data) setProductDetail(data as Product); });
  }, [r.items]);

  const handleStatusChange = (status: string) => {
    if (status === r.status) return;
    if (!ALLOWED_TRANSITIONS[r.status]?.includes(status)) {
      alert(`'${r.status}' 상태에서 '${status}'(으)로 바로 변경할 수 없습니다.`);
      return;
    }
    if (status === "취소") {
      setPendingStatus("취소");
      setShowConfirmModal(true);
    } else if (status === "준비중" && r.status === "미확인") {
      setPendingStatus("준비중");
      setShowConfirmModal(true);
    } else {
      onUpdateStatus(r.id, status);
    }
  };

  const handleConfirmYes = () => {
    setShowConfirmModal(false);
    if (pendingStatus === "취소") {
      setCancelReason("");
      setShowCancelModal(true);
    } else {
      onUpdateStatus(r.id, pendingStatus);
    }
  };

  const handleCancelConfirm = () => {
    if (!cancelReason.trim()) return;
    onUpdateStatus(r.id, "취소", cancelReason.trim());
    setShowCancelModal(false);
  };

  const refImages = r.reference_images?.filter(Boolean) ?? [];

  return (
    <>
      {showPayLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPayLinkModal(false); setIsExtending(false); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">결제 링크 생성</h3>
              <button type="button" onClick={() => { setShowPayLinkModal(false); setIsExtending(false); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!payLinkResult ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400">링크 만료 기간</p>
                  <div className="flex gap-2 flex-wrap">
                    {["1", "6", "12", "24", "48"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setPayLinkHours(h)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          payLinkHours === h
                            ? "bg-gold-500 text-white border-gold-500"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {h}시간
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">결제 금액</span>
                    <span className="font-medium text-gray-800">{r.final_price.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">만료</span>
                    <span className="text-gray-600">
                      {new Date(Date.now() + Number(payLinkHours) * 3600_000).toLocaleString("ko-KR", {
                        month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePayLink}
                  disabled={payLinkLoading}
                  className="w-full bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                >
                  {payLinkLoading ? "생성 중..." : "링크 생성"}
                </button>
              </>
            ) : isExtending ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400">현재 시간 기준으로 만료 연장</p>
                  <div className="flex gap-2 flex-wrap">
                    {["1", "6", "12", "24", "48"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setExtendHours(h)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          extendHours === h
                            ? "bg-gold-500 text-white border-gold-500"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {h}시간
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 pt-0.5">
                    새 만료: {new Date(Date.now() + Number(extendHours) * 3600_000).toLocaleString("ko-KR", {
                      month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExtendPayLink}
                    disabled={payLinkLoading}
                    className="flex-1 bg-gold-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                  >
                    {payLinkLoading ? "연장 중..." : "연장하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExtending(false)}
                    className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:border-gray-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">생성된 결제 링크</p>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <span className="text-xs text-gray-600 truncate block">{payLinkUrl}</span>
                  </div>
                  {payLinkResult.expiresAt && (
                    <p className="text-xs text-gray-400">
                      만료: {new Date(payLinkResult.expiresAt).toLocaleString("ko-KR", {
                        month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPayLink}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${payLinkCopied ? "bg-green-500 text-white" : "bg-gold-500 text-white hover:bg-gold-600"}`}
                  >
                    {payLinkCopied ? "복사됨!" : "링크 복사"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsExtending(true); setExtendHours("24"); }}
                    className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
                  >
                    만료 연장
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            {pendingStatus === "취소" && r.settlement_id ? (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-red-600">이미 정산된 예약입니다.</p>
                <p className="text-sm text-gray-600">정산이 끝난 건이라 취소해도 자동으로 환불되지 않습니다. 환불은 직접 처리해주세요.</p>
                <p className="text-sm text-gray-800 pt-1">그래도 취소 처리하시겠습니까?</p>
              </div>
            ) : (
              <p className="text-sm text-gray-800">
                {pendingStatus === "취소"
                  ? "주문이 취소됩니다. 변경하시겠습니까?"
                  : "예약이 확정됩니다. 변경하시겠습니까?"}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={handleConfirmYes} className="flex-1 bg-gold-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors">네</button>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:border-gray-400 transition-colors">아니요</button>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">취소 사유 입력</h3>
              <p className="text-xs text-gray-400">사유는 내부 기록으로 저장되며, 고객 안내 시 활용할 수 있습니다.</p>
            </div>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="예) 재료 수급 불가, 고객 요청으로 취소 등" rows={3} autoFocus className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={handleCancelConfirm} disabled={!cancelReason.trim()} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">취소 확정</button>
              <button type="button" onClick={() => setShowCancelModal(false)} className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:border-gray-400 transition-colors">돌아가기</button>
            </div>
          </div>
        </div>
      )}

      {/* 참고 이미지 라이트박스 */}
      {lightboxIndex !== null && refImages[lightboxIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxIndex(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxIndex(null)} className="absolute -top-3 -right-3 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-md text-gray-600 hover:text-gray-900 transition-colors z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
            {lightboxIndex > 0 && (
              <button onClick={() => setLightboxIndex(lightboxIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-700 hover:bg-white transition-colors z-10">‹</button>
            )}
            {lightboxIndex < refImages.length - 1 && (
              <button onClick={() => setLightboxIndex(lightboxIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center shadow text-gray-700 hover:bg-white transition-colors z-10">›</button>
            )}
            <img src={refImages[lightboxIndex]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* 상품 이미지 — 모바일: 상단 중앙, 데스크톱: 좌측 고정 */}
        {productDetail?.image_url && (
          <div
            className="relative w-40 mx-auto md:hidden rounded-xl overflow-hidden bg-gray-100"
            style={{ aspectRatio: "3/4" }}
          >
            <img
              src={productDetail.image_url}
              alt={productDetail.name}
              className="w-full h-full object-cover"
            />
            {/* 꽃색 + 포장지 색 오버레이 */}
            {(productDetail.flower_colors?.length > 0 || productDetail.wrapping_color) && (
              <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                {productDetail.flower_colors?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {productDetail.flower_colors.map((color) => (
                      <span
                        key={color}
                        className={`w-4 h-4 rounded-full shadow-sm shrink-0 border ${color === "흰색" ? "border-gray-300" : "border-white/60"}`}
                        style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#e5e7eb" }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
                {productDetail.wrapping_color && (
                  <span className="text-[10px] font-medium text-white bg-black/40 rounded-md px-1.5 py-0.5 w-fit backdrop-blur-sm">
                    {productDetail.wrapping_color}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 섹션 카드들 */}
        <div className="flex gap-3">

          {/* 상품 이미지 — 데스크톱 전용 좌측 컬럼 */}
          {productDetail && (
            <div className="hidden md:flex shrink-0 w-28 flex-col items-center gap-1.5">
              {productDetail.image_url && (
                <div
                  className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in"
                  onClick={() => onOpenLightbox(productDetail.image_url!)}
                >
                  <img
                    src={productDetail.image_url}
                    alt={productDetail.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {productDetail.flower_colors?.length > 0 && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {productDetail.flower_colors.map((color) => (
                    <span
                      key={color}
                      className={`w-4 h-4 rounded-full shrink-0 border ${color === "흰색" ? "border-gray-300 shadow-sm" : "border-gray-200"}`}
                      style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#e5e7eb" }}
                      title={color}
                    />
                  ))}
                </div>
              )}
              {productDetail.wrapping_color && (
                <p className="text-xs text-gray-400 text-center">{productDetail.wrapping_color}</p>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            {/* 주문 정보 */}
            <SectionCard>
              {r.channel && <Row label="채널">{r.channel}</Row>}
              <Row label="결제">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.paid ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                    {r.paid ? "결제완료" : "미결제"}
                  </span>
                  {!r.paid && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowPayLinkModal(true); }}
                      className="flex items-center justify-center gap-1.5 text-sm sm:text-xs font-medium px-7 py-2 sm:px-2.5 sm:py-1 rounded-lg bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-100 hover:border-gold-300 hover:shadow-sm active:bg-gold-100 transition-all"
                    >
                      <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      </svg>
                      결제 링크
                    </button>
                  )}
                </div>
              </Row>
              <Row label="최종 가격">{(r.final_price ?? 0).toLocaleString()}원</Row>
              <Row label="연락처">
                <span className="flex items-center gap-1">
                  {formatPhone(r.orderer_phone)}
                  <CopyButton text={r.orderer_phone} />
                </span>
              </Row>
              <Row label="주문 경로">{ORDER_PATH_LABEL[r.order_path as OrderPath] ?? "—"}</Row>
              <Row label="유입">{trafficSourceLabel(r.traffic_source)}</Row>
            </SectionCard>

            {/* 상품 목록 */}
            {r.items?.length > 0 && (
              <SectionCard>
                {r.items.map((item, i) => (
                  <div key={i} className={i > 0 ? "pt-2 border-t border-gray-50" : ""}>
                    <div className="flex gap-2 text-sm">
                      <span className="w-16 shrink-0 text-gray-400">{i === 0 ? "상품" : ""}</span>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-800">
                            {item.name || item.type}
                            {item.name && item.type && item.name !== item.type && (
                              <span className="text-gray-400 ml-1">({item.type})</span>
                            )}
                          </span>
                          {item.memo && <p className="text-xs text-gray-400 mt-0.5">{item.memo}</p>}
                          {(item.shopping_bag && item.shopping_bag !== "없음" && item.shopping_bag !== "미포함") && (
                            <p className="text-xs text-gray-400 mt-0.5">쇼핑백 {item.shopping_bag}</p>
                          )}
                          {(item.preservative && item.preservative !== "없음" && item.preservative !== "미포함") && (
                            <p className="text-xs text-gray-400 mt-0.5">생화 수명연장제 {item.preservative}</p>
                          )}
                          {(item.message_card && item.message_card !== "없음" && item.message_card !== "미포함") && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs text-gray-400">메시지카드 {item.message_card}</p>
                              {item.message_card_content && (
                                <p className="text-xs text-gray-500 flex items-start gap-1">
                                  <span className="whitespace-pre-wrap">{item.message_card_content}</span>
                                  <CopyButton text={item.message_card_content} />
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {(() => {
                          const addon = messageCardPrice * addonCount(item.message_card) + shoppingBagPrice * addonCount(item.shopping_bag) + preservativePrice * addonCount(item.preservative);
                          const total = item.price + addon;
                          return (
                            <div className="pt-1.5 border-t border-gray-100 sm:border-t-0 sm:pt-0 sm:text-right shrink-0">
                              <span className="font-medium text-gray-800">{total.toLocaleString()}원</span>
                              {addon > 0 && (
                                <p className="text-[11px] text-gray-400">상품 {item.price.toLocaleString()}원 + 추가 {addon.toLocaleString()}원</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
                {r.items.length > 1 && (
                  <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">총 상품 금액</span>
                    <span className="font-semibold text-gray-900">
                      {r.items.reduce((sum, item) => {
                        const addon = messageCardPrice * addonCount(item.message_card) + shoppingBagPrice * addonCount(item.shopping_bag) + preservativePrice * addonCount(item.preservative);
                        return sum + item.price + addon;
                      }, 0).toLocaleString()}원
                    </span>
                  </div>
                )}
              </SectionCard>
            )}

            {/* 선물 용도 */}
            {(r.recipient_gender || r.recipient_age || r.relationship || r.purpose || r.mood) && (
              <SectionCard>
                <Row label="선물 용도">
                  {[r.recipient_gender, r.recipient_age, r.relationship, r.purpose, r.mood].filter(Boolean).join(" · ")}
                </Row>
              </SectionCard>
            )}

            {/* 배송 정보 */}
            {r.delivery_type === "배송" && (
              <SectionCard>
                <Row label="받는 분">
                  <span className="flex items-center gap-1">
                    {r.recipient_name} / {formatPhone(r.recipient_phone ?? "")}
                    <CopyButton text={r.recipient_phone ?? ""} />
                  </span>
                </Row>
                <Row label="배송 주소">
                  <span className="flex items-center gap-1 flex-wrap">
                    {r.address} {r.address_detail}
                    <CopyButton text={`${r.address} ${r.address_detail ?? ""}`.trim()} />
                  </span>
                </Row>
                <Row label="배송비">
                  {editingDeliveryFee ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={deliveryFeeInput}
                        onChange={(e) => setDeliveryFeeInput(e.target.value.replace(/\D/g, ""))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0"
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-gold-400"
                        autoFocus
                      />
                      <span className="text-xs text-gray-400">원</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onSaveDeliveryFee(r, deliveryFeeInput); setEditingDeliveryFee(false); }} className="text-xs px-2.5 py-1 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors">저장</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingDeliveryFee(false); }} className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors">취소</button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {r.delivery_fee != null ? `${r.delivery_fee.toLocaleString()}원` : ""}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setDeliveryFeeInput(r.delivery_fee != null ? String(r.delivery_fee) : ""); setEditingDeliveryFee(true); }} className="text-xs px-2 py-0.5 border border-gray-200 text-gray-400 rounded-md hover:border-gray-400 hover:text-gray-600 transition-colors">
                        {r.delivery_fee != null ? "수정" : "+ 추가"}
                      </button>
                    </span>
                  )}
                </Row>
              </SectionCard>
            )}

            {/* 요청 사항 */}
            {r.requests && (
              <SectionCard>
                <Row label="요청 사항"><span className="whitespace-pre-wrap">{r.requests}</span></Row>
              </SectionCard>
            )}

            {/* 취소 사유 */}
            {r.status === "취소" && r.cancel_reason && (
              <SectionCard>
                <Row label="취소 사유"><span className="text-red-500">{r.cancel_reason}</span></Row>
              </SectionCard>
            )}
          </div>
        </div>

        {/* 참고 이미지 */}
        {refImages.length > 0 && (
          <div className="flex gap-2 pt-1">
            {refImages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`참고 이미지 ${i + 1}`}
                onClick={() => setLightboxIndex(i)}
                className="w-20 h-20 object-cover rounded-xl border border-gray-100 cursor-zoom-in hover:opacity-90 transition-opacity"
              />
            ))}
          </div>
        )}

        {/* 하단: 상태 변경(또는 미확인일 때 확정/취소 버튼) + 수정/삭제 */}
        <div className="flex items-center gap-2 pt-1">
          {r.status === "미확인" ? (
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleStatusChange("준비중"); }}
                className="flex-1 bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
              >
                예약 확정
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleStatusChange("취소"); }}
                className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
              >
                예약 취소
              </button>
            </div>
          ) : (
            <>
              <span className="text-xs text-gray-500 shrink-0">상태 변경</span>
              <div ref={statusDropdownRef} className="relative">
                <button
                  type="button"
                  disabled={r.status === "취소"}
                  onClick={(e) => { e.stopPropagation(); setStatusDropdownOpen((v) => !v); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-200 hover:border-gray-400 ${STATUS_STYLE[r.status]?.text ?? "text-gray-600"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_STYLE[r.status]?.dot ?? "bg-gray-400"}`} />
                  {r.status}
                  <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {statusDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setStatusDropdownOpen(false); handleStatusChange(s); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${s === r.status ? "font-semibold" : ""} ${STATUS_STYLE[s]?.text ?? "text-gray-600"} ${STATUS_STYLE[s]?.bg ?? ""}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_STYLE[s]?.dot ?? "bg-gray-400"}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <div className="ml-auto hidden md:flex gap-1.5 items-center">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(r); }}
              aria-label="수정"
              title="수정"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
              aria-label="삭제"
              title="삭제"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
