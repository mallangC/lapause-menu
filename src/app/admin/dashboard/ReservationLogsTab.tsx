"use client";

import { useState } from "react";

export interface ReservationLog {
  id: string;
  created_at: string;
  reservation_id: string;
  company_id: string;
  company_name: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  action: "status_change" | "field_update" | "delete";
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
}

interface Props {
  logs: ReservationLog[];
}

type ActionFilter = "all" | "status_change" | "field_update" | "delete";

const ACTION_LABEL: Record<ReservationLog["action"], string> = {
  status_change: "상태 변경",
  field_update: "금액/결제 수정",
  delete: "삭제",
};

const ACTION_STYLE: Record<ReservationLog["action"], string> = {
  status_change: "bg-blue-50 text-blue-600",
  field_update: "bg-orange-50 text-orange-500",
  delete: "bg-red-50 text-red-500",
};

export default function ReservationLogsTab({ logs }: Props) {
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (search.trim() && !(log.company_name ?? "").includes(search.trim())) return false;
    return true;
  });

  const formatDate = (str: string) => {
    const d = new Date(str);
    return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
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

        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm">
          {(["all", "status_change", "field_update", "delete"] as ActionFilter[]).map(a => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-2 transition-colors whitespace-nowrap ${actionFilter === a ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              {a === "all" ? "전체" : ACTION_LABEL[a]}
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
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">종류</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">필드</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">변경 내용</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">사유</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">예약 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-300 text-sm">기록이 없습니다.</td>
                </tr>
              )}
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                    {log.company_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLE[log.action]}`}>
                      {ACTION_LABEL[log.action]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{log.field ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                    {log.old_value ?? "—"} <span className="text-gray-300">→</span> {log.new_value ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[220px] truncate">
                    {log.reason ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-300 font-mono whitespace-nowrap">{log.reservation_id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
