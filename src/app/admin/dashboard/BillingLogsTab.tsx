"use client";

import { useState } from "react";

export interface BillingLog {
  id: string;
  created_at: string;
  company_id: string;
  company_name: string | null;
  operator_id: string | null;
  type: "charge" | "refund";
  plan: string | null;
  amount: number | null;
  success: boolean;
  reason: string | null;
  error_message: string | null;
}

interface Props {
  logs: BillingLog[];
}

type TypeFilter = "all" | "charge" | "refund";
type StatusFilter = "all" | "success" | "fail";

export default function BillingLogsTab({ logs }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = logs.filter((log) => {
    if (typeFilter !== "all" && log.type !== typeFilter) return false;
    if (statusFilter === "success" && !log.success) return false;
    if (statusFilter === "fail" && log.success) return false;
    if (search.trim() && !(log.company_name ?? "").includes(search.trim())) return false;
    return true;
  });

  const totalCharged = logs.filter(l => l.type === "charge" && l.success).reduce((s, l) => s + (l.amount ?? 0), 0);
  const totalRefunded = logs.filter(l => l.type === "refund" && l.success).reduce((s, l) => s + (l.amount ?? 0), 0);

  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatAmount = (n: number | null) =>
    n != null ? `₩${n.toLocaleString()}` : "—";

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">전체 결제 건수</p>
          <p className="text-2xl font-semibold text-gray-900">{logs.filter(l => l.type === "charge" && l.success).length}</p>
          <p className="text-xs text-gray-400 mt-1">성공 기준</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">누적 결제액</p>
          <p className="text-2xl font-semibold text-gray-900">₩{totalCharged.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">구독 결제 합계</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">누적 환불액</p>
          <p className="text-2xl font-semibold text-red-500">₩{totalRefunded.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">환불 합계</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 매장 검색 */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="매장명 검색"
            className="w-full text-sm outline-none placeholder-gray-300"
          />
        </div>

        {/* 유형 필터 */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
          {(["all", "charge", "refund"] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 transition-colors ${typeFilter === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t === "all" ? "전체" : t === "charge" ? "결제" : "환불"}
            </button>
          ))}
        </div>

        {/* 성공여부 필터 */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
          {(["all", "success", "fail"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 transition-colors ${statusFilter === s ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {s === "all" ? "전체" : s === "success" ? "성공" : "실패"}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 ml-auto">{filtered.length}건</p>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">일시</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">매장명</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">유형</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">플랜</th>
                <th className="text-right px-5 py-3 font-medium whitespace-nowrap">금액</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">결과</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">사유 / 오류</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-300 text-sm">이력이 없습니다.</td>
                </tr>
              )}
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                    {log.company_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.type === "charge" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-500"
                    }`}>
                      {log.type === "charge" ? "결제" : "환불"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {log.plan ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.plan === "pro" ? "bg-gold-100 text-gold-600" : "bg-gray-100 text-gray-500"
                      }`}>
                        {log.plan === "pro" ? "Pro" : "Starter"}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatAmount(log.amount)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.success ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                    }`}>
                      {log.success ? "성공" : "실패"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[200px] truncate">
                    {log.reason ?? log.error_message ?? <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
