"use client";

import { useState } from "react";
import type { Reservation } from "@/app/[slug]/admin/dashboard/reservations/types";

interface ReservationSummary {
  id: string;
  desired_date: string;
  desired_time: string | null;
  items: Array<{ type: string; name: string }> | null;
  final_price: number | null;
}

interface Props {
  profileId: string;
  ordererName: string;
  ordererPhone: string;
  onClose: () => void;
  /** 미리보기 — 목업 예약 전체 (이 손님의 주문만 골라 센다) */
  reservations: Reservation[];
  initialMemo: string;
  onSaveMemo: (memo: string) => void;
}

// 미리보기 손님 정보 — 실제 CustomerProfileModal 복사본. 주문 내역은 목업 예약에서 세고, 메모는 화면 안에서만 저장된다
export default function PreviewCustomerProfileModal({ profileId, ordererName, ordererPhone, onClose, reservations, initialMemo, onSaveMemo }: Props) {
  const [memo, setMemo] = useState(initialMemo);
  const memoSaving = false;
  const [memoSaved, setMemoSaved] = useState(false);
  const loading = false;
  // 실제 화면과 같이 접수 순 최근 3건, 전체 건수
  const mine = reservations
    .filter((r) => r.customer_profile_id === profileId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const totalCount = mine.length;
  const recentReservations: ReservationSummary[] = mine.slice(0, 3);

  const handleMemoSave = () => {
    onSaveMemo(memo.trim());
    setMemoSaved(true);
  };

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" data-coach="rv-profile-modal">
        {/* 헤더 */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-base">{ordererName}</h3>
              {!loading && (
                <span className="text-xs text-gray-400">
                  총 {totalCount}회 방문
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{ordererPhone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* 주문 내역 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">최근 주문 내역</p>
            {loading ? (
              <p className="text-xs text-gray-400">불러오는 중...</p>
            ) : recentReservations.length === 0 ? (
              <p className="text-xs text-gray-400">주문 내역이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentReservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-800">
                        {r.items?.length
                          ? r.items.map((i) => i.name || i.type).join(", ")
                          : "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.desired_date ? r.desired_date.slice(5).replace("-", ".") : "—"}
                        {r.desired_time ? ` ${r.desired_time}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-700 shrink-0">
                      {r.final_price != null ? `${r.final_price.toLocaleString()}원` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">메모</p>
            <textarea
              value={memo}
              onChange={(e) => { setMemo(e.target.value); setMemoSaved(false); }}
              rows={3}
              placeholder="고객 관련 메모를 남기세요 (예: 빨간색 불호, 카드 항상 원함)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none text-gray-700 placeholder:text-gray-300"
            />
            <button
              onClick={handleMemoSave}
              disabled={memoSaving}
              className="mt-2 w-full py-2 rounded-lg bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
            >
              {memoSaving ? "저장 중..." : memoSaved ? "저장됨 ✓" : "메모 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
