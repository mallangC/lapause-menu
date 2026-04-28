"use client";

import { useState, useEffect, useCallback } from "react";

interface Application {
  company_id: string;
  business_number: string | null;
  business_verified_at: string | null;
  business_status: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  bank_account_image_url: string | null;
  consult_apply_status: "pending" | "approved" | "rejected";
  consult_reject_reason: string | null;
  companies: { name: string; created_at: string } | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function VerificationTab() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [rejectModal, setRejectModal] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/operator/consult-verify");
    if (res.ok) setApplications(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleApprove = async (app: Application) => {
    setActionLoading(app.company_id);
    const res = await fetch(`/api/operator/consult-verify/${app.company_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    if (res.ok) fetchApplications();
    else alert("승인 처리에 실패했습니다.");
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.company_id);
    const res = await fetch(`/api/operator/consult-verify/${rejectModal.company_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason: rejectReason }),
    });
    const data = await res.json();
    if (res.ok) {
      setRejectModal(null);
      setRejectReason("");
      fetchApplications();
    } else {
      alert(data.error ?? "반려 처리에 실패했습니다.");
    }
    setActionLoading(null);
  };

  const handleViewBankDoc = async (companyId: string) => {
    const res = await fetch(`/api/company/bank-doc?company_id=${companyId}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    } else {
      alert("통장사본을 불러올 수 없습니다.");
    }
  };

  const filtered = applications.filter(a =>
    statusFilter === "all" || a.consult_apply_status === statusFilter
  );

  const pendingCount = applications.filter(a => a.consult_apply_status === "pending").length;

  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("ko-KR") : "—";

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "pending") return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-600 whitespace-nowrap">검토 중</span>;
    if (status === "approved") return <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-600 whitespace-nowrap">승인</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-500 whitespace-nowrap">반려</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-900">맞춤 주문 검증 관리</h2>
          {pendingCount > 0 && (
            <p className="text-xs text-yellow-600 mt-0.5">검토 대기 {pendingCount}건</p>
          )}
        </div>
      </div>

      {/* 필터 */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs w-fit">
        {(["pending", "all", "approved", "rejected"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 transition-colors ${statusFilter === s ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            {s === "all" ? "전체" : s === "pending" ? "검토 중" : s === "approved" ? "승인" : "반려"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-6 py-3 font-medium">매장</th>
                <th className="text-left px-6 py-3 font-medium">사업자번호</th>
                <th className="text-left px-6 py-3 font-medium">인증</th>
                <th className="text-left px-6 py-3 font-medium">계좌 정보</th>
                <th className="text-left px-6 py-3 font-medium">통장사본</th>
                <th className="text-left px-6 py-3 font-medium">상태</th>
                <th className="text-left px-6 py-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-300 text-sm">불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-300 text-sm">신청 내역이 없습니다.</td></tr>
              ) : filtered.map(app => (
                <tr key={app.company_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-gray-900 whitespace-nowrap">
                      {app.companies?.name ?? "—"}
                    </div>
                    <div className="text-xs text-gray-400">가입 {fmt(app.companies?.created_at ?? null)}</div>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-700">
                    {app.business_number ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    {app.business_verified_at ? (
                      <div className="text-xs">
                        <div className="text-green-600 font-medium">{app.business_status}</div>
                        <div className="text-gray-400">{fmt(app.business_verified_at)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-red-400">미인증</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-600">
                    {app.bank_name || app.bank_account ? (
                      <>
                        <div>{app.bank_name}</div>
                        <div className="font-mono">{app.bank_account}</div>
                        <div className="text-gray-400">{app.bank_holder}</div>
                      </>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    {app.bank_account_image_url ? (
                      <button
                        onClick={() => handleViewBankDoc(app.company_id)}
                        className="text-xs text-blue-500 hover:underline whitespace-nowrap"
                      >
                        보기
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">미첨부</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={app.consult_apply_status} />
                    {app.consult_apply_status === "rejected" && app.consult_reject_reason && (
                      <div className="text-xs text-gray-400 mt-1 max-w-[140px] truncate" title={app.consult_reject_reason}>
                        {app.consult_reject_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      {app.consult_apply_status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={actionLoading === app.company_id}
                            className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap disabled:opacity-40"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => { setRejectModal(app); setRejectReason(""); }}
                            disabled={actionLoading === app.company_id}
                            className="px-2.5 py-1 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap disabled:opacity-40"
                          >
                            반려
                          </button>
                        </>
                      )}
                      {app.consult_apply_status === "approved" && (
                        <button
                          onClick={() => { setRejectModal(app); setRejectReason(""); }}
                          className="px-2.5 py-1 text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
                        >
                          반려로 변경
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 반려 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">반려 처리</h3>
            <p className="text-xs text-gray-400 mb-4">{rejectModal.companies?.name}</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">반려 사유 *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="매장에게 전달될 반려 사유를 입력하세요."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.company_id}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {actionLoading === rejectModal.company_id ? "처리 중..." : "반려"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
