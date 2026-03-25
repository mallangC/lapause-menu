"use client";

import { useState } from "react";
import { Reservation } from "./types";
import { STATUS_OPTIONS } from "./constants";
import { formatDateTime, formatPhone } from "./utils";
import CopyButton from "./CopyButton";

interface Props {
  r: Reservation;
  onUpdateStatus: (id: string, status: string, cancelReason?: string) => void;
  onOpenLightbox: (url: string) => void;
  onSaveDeliveryFee: (r: Reservation, fee: string) => void;
  onSaveMemo: (id: string, memo: string) => void;
}

export default function ReservationDetail({
  r,
  onUpdateStatus,
  onOpenLightbox,
  onSaveDeliveryFee,
  onSaveMemo,
}: Props) {
  const [editingDeliveryFee, setEditingDeliveryFee] = useState(false);
  const [deliveryFeeInput, setDeliveryFeeInput] = useState(r.delivery_fee != null ? String(r.delivery_fee) : "");
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoInput, setMemoInput] = useState(r.admin_memo ?? "");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleStatusChange = (status: string) => {
    if (status === "취소") {
      setCancelReason("");
      setShowCancelModal(true);
    } else {
      onUpdateStatus(r.id, status);
    }
  };

  const handleCancelConfirm = () => {
    if (!cancelReason.trim()) return;
    onUpdateStatus(r.id, "취소", cancelReason.trim());
    setShowCancelModal(false);
  };

  return (
    <>
    {showCancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelModal(false)}>
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">취소 사유 입력</h3>
            <p className="text-xs text-gray-400">사유는 내부 기록으로 저장되며, 고객 안내 시 활용할 수 있습니다.</p>
          </div>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="예) 재료 수급 불가, 고객 요청으로 취소 등"
            rows={3}
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim()}
              className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              취소 확정
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(false)}
              className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-xl text-sm hover:border-gray-400 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="flex gap-4">
      {/* 왼쪽: 상품 이미지 */}
      {r.product_image_url && (
        <div className="shrink-0">
          <img
            src={r.product_image_url}
            alt={r.product_name}
            onClick={() => onOpenLightbox(r.product_image_url!)}
            className="w-44 h-44 object-cover rounded-xl border border-white/50 cursor-zoom-in"
          />
        </div>
      )}

      {/* 오른쪽: 상태 변경 + 상세 정보 */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* 상태 변경 + 예약 일시 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">상태 변경</span>
          <select
            value={r.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-gray-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-400">{formatDateTime(r.created_at)}</span>
        </div>

        {/* 상세 정보 그리드 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">예약자 연락처</span>
            <span className="text-gray-700 flex items-center">
              {formatPhone(r.orderer_phone)}
              <CopyButton text={r.orderer_phone} />
            </span>
          </div>

          {[
            ["최종 가격", `${(r.final_price ?? r.product_price).toLocaleString()}원`],
            ["상품", [r.budget, r.product_type, r.mood, r.purpose].filter(Boolean).join(" · ")],
            ["받는 분", [r.recipient_gender, r.recipient_age, r.relationship].filter(Boolean).join(" · ")],
          ].map(([label, value]) => value && (
            <div key={label} className="flex gap-2">
              <span className="text-gray-400 shrink-0">{label}</span>
              <span className="text-gray-700">{value}</span>
            </div>
          ))}

          <div className="flex gap-2">
            <span className="text-gray-400 shrink-0">메시지 카드</span>
            <span className="text-gray-700 flex items-center gap-0.5">
              {r.message_card === "있음" && r.message_card_content
                ? <><span>{r.message_card_content}</span><CopyButton text={r.message_card_content} /></>
                : r.message_card === "있음" ? "있음" : "없음"
              }
            </span>
          </div>

          {[["쇼핑백", r.shopping_bag]].map(([label, value]) => value && (
            <div key={label} className="flex gap-2">
              <span className="text-gray-400 shrink-0">{label}</span>
              <span className="text-gray-700">{value}</span>
            </div>
          ))}

          {r.delivery_type === "배송" && (
            <>
              <div className="col-span-2 flex gap-2">
                <span className="text-gray-400 shrink-0">받는 분</span>
                <span className="text-gray-700 flex items-center">
                  {r.recipient_name} / {formatPhone(r.recipient_phone ?? "")}
                  <CopyButton text={r.recipient_phone ?? ""} />
                </span>
              </div>
              <div className="col-span-2 flex gap-2">
                <span className="text-gray-400 shrink-0">배송 주소</span>
                <span className="text-gray-700 flex items-center">
                  {r.address} {r.address_detail}
                  <CopyButton text={`${r.address} ${r.address_detail ?? ""}`.trim()} />
                </span>
              </div>
            </>
          )}

          {r.requests && (
            <div className="col-span-2 flex gap-2">
              <span className="text-gray-400 shrink-0">요청 사항</span>
              <span className="text-gray-700">{r.requests}</span>
            </div>
          )}

          {r.status === "취소" && r.cancel_reason && (
            <div className="col-span-2 flex gap-2">
              <span className="text-gray-400 shrink-0">취소 사유</span>
              <span className="text-red-500">{r.cancel_reason}</span>
            </div>
          )}
        </div>

        {/* 배송비 편집 */}
        {r.delivery_type === "배송" && (
          <div className="pt-2 border-t border-gray-100">
            {editingDeliveryFee ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">배송비</span>
                <input
                  type="number"
                  value={deliveryFeeInput}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="0"
                  className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-gold-400"
                  autoFocus
                />
                <span className="text-xs text-gray-400">원</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSaveDeliveryFee(r, deliveryFeeInput); setEditingDeliveryFee(false); }}
                  className="text-xs px-2.5 py-1 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
                >저장</button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingDeliveryFee(false); }}
                  className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                >취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">배송비</span>
                {r.delivery_fee != null && (
                  <span className="text-xs text-gray-700">{r.delivery_fee.toLocaleString()}원</span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeliveryFeeInput(r.delivery_fee != null ? String(r.delivery_fee) : ""); setEditingDeliveryFee(true); }}
                  className="text-xs px-2 py-0.5 border border-gray-200 text-gray-400 rounded-md hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  {r.delivery_fee != null ? "수정" : "+ 배송비 추가"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 관리자 메모 */}
        <div className="pt-2 border-t border-gray-100">
          {editingMemo ? (
            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-gray-500">메모</span>
              <textarea
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="제작 참고 메모를 입력하세요"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gold-400 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { onSaveMemo(r.id, memoInput); setEditingMemo(false); }}
                  className="text-xs px-2.5 py-1 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
                >저장</button>
                <button
                  type="button"
                  onClick={() => setEditingMemo(false)}
                  className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
                >취소</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">메모</span>
              {r.admin_memo && (
                <span className="text-xs text-gray-700 flex-1 whitespace-pre-wrap">{r.admin_memo}</span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMemoInput(r.admin_memo ?? ""); setEditingMemo(true); }}
                className="text-xs px-2 py-0.5 border border-gray-200 text-gray-400 rounded-md hover:border-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                {r.admin_memo ? "수정" : "+ 메모 추가"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
