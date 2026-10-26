"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORM_FEE_RATE, PLATFORM_FEE_PERCENT_LABEL } from "@/lib/constants";

interface Props {
  companyId: string;
}

interface Settlement {
  id: string;
  period_start: string;
  period_end: string;
  year_month: string;
  total_amount: number;
  status: "pending" | "completed" | "cancelled";
  transferred_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "정산 대기",
  completed: "정산 완료",
  cancelled: "취소됨",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  completed: "bg-green-50 text-green-600",
  cancelled: "bg-gray-100 text-gray-400",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 md:p-5 shadow-sm flex items-center justify-between md:block">
      <p className="text-xs text-gray-400 md:mb-1">{label}</p>
      <div className="text-right md:text-left">
        <p className="text-base md:text-2xl font-semibold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function formatMoney(n: number) {
  return `${n.toLocaleString()}원`;
}

export default function SettlementTab({ companyId }: Props) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pendingGross, setPendingGross] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const [{ data: settlementRows }, { data: unsettled }] = await Promise.all([
        supabase
          .from("settlements")
          .select("id, period_start, period_end, year_month, total_amount, status, transferred_at")
          .eq("company_id", companyId)
          .order("period_end", { ascending: false }),
        supabase
          .from("reservations")
          .select("final_price")
          .eq("company_id", companyId)
          .eq("paid", true)
          .not("payment_id", "is", null)
          .eq("status", "픽업/배송완료")
          .is("settlement_id", null)
          .is("deleted_at", null),
      ]);
      setSettlements((settlementRows as Settlement[]) ?? []);
      setPendingGross((unsettled ?? []).reduce((s, r) => s + (r.final_price || 0), 0));
      setPendingCount((unsettled ?? []).length);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const pendingNet = Math.round(pendingGross * (1 - PLATFORM_FEE_RATE));

  const completedTotal = useMemo(
    () => settlements.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.total_amount, 0),
    [settlements]
  );

  const thisMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCompleted = useMemo(
    () => settlements.filter((s) => s.status === "completed" && s.year_month === thisMonthKey).reduce((sum, s) => sum + s.total_amount, 0),
    [settlements, thisMonthKey]
  );

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">정산</h2>
        <p className="text-xs text-gray-400 mt-1">결제 수수료 {PLATFORM_FEE_PERCENT_LABEL}를 제외한 실 입금 예정/완료 금액입니다.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard label="정산 예정 금액" value={formatMoney(pendingNet)} sub={`${pendingCount}건 · 미정산`} />
        <StatCard label="이번 달 정산 완료" value={formatMoney(thisMonthCompleted)} />
        <StatCard label="누적 정산 완료" value={formatMoney(completedTotal)} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 leading-relaxed space-y-1">
        <p className="font-semibold">정산 안내</p>
        <p>· 정산은 매주 수요일에 진행됩니다. (수요일이 공휴일인 경우 다음 영업일로 순연)</p>
        <p>· 정산 대상: 결제일로부터 영업일 기준 4일이 지나고, 예약 상태가 &lsquo;픽업/배송완료&rsquo;인 예약 건</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-5 py-3 font-medium">정산 기간</th>
                <th className="text-right px-5 py-3 font-medium">정산 금액</th>
                <th className="text-center px-5 py-3 font-medium">상태</th>
                <th className="text-right px-5 py-3 font-medium">입금일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">정산 내역이 없습니다.</td>
                </tr>
              ) : (
                settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-gray-700">{s.period_start} ~ {s.period_end}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatMoney(s.total_amount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {s.transferred_at ? new Date(s.transferred_at).toLocaleDateString("ko-KR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
