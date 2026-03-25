"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReservationSummary {
  id: string;
  desired_date: string;
  desired_time: string | null;
  product_name: string;
  final_price: number | null;
}

interface Props {
  profileId: string;
  ordererName: string;
  ordererPhone: string;
  onClose: () => void;
}

export default function CustomerProfileModal({ profileId, ordererName, ordererPhone, onClose }: Props) {
  const [memo, setMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [recentReservations, setRecentReservations] = useState<ReservationSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const [profileRes, reservationsRes] = await Promise.all([
        supabase.from("customer_profiles").select("memo").eq("id", profileId).single(),
        supabase
          .from("reservations")
          .select("id, desired_date, desired_time, product_name, final_price")
          .eq("customer_profile_id", profileId)
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.data?.memo) setMemo(profileRes.data.memo);
      if (reservationsRes.data) {
        setTotalCount(reservationsRes.data.length);
        setRecentReservations(reservationsRes.data.slice(0, 3) as ReservationSummary[]);
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const handleMemoSave = async () => {
    setMemoSaving(true);
    await supabase
      .from("customer_profiles")
      .update({ memo: memo.trim() || null })
      .eq("id", profileId);
    setMemoSaving(false);
    setMemoSaved(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
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
                      <p className="text-xs font-medium text-gray-800">{r.product_name || "—"}</p>
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
              placeholder="고객 관련 메모를 남기세요 (예: 빨간색 싫어함, 카드 항상 원함)"
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
