"use client";

import { useState } from "react";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerUserId: string | null;
  isSuspended: boolean;
  suspendReason: string | null;
  plan: string | null;
  billingKey: string | null;
  planExpiresAt: string | null;
  trialEndsAt: string | null;
  subscriptionPlan: string | null;
}

interface Props {
  stores: StoreRow[];
}

const ROWS = 20;

export default function StoreManagementTab({ stores }: Props) {
  const [search, setSearch] = useState("");
  const [refundTarget, setRefundTarget] = useState<StoreRow | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<StoreRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [localStores, setLocalStores] = useState<StoreRow[]>(stores);

  const filtered = search.trim()
    ? localStores.filter(s =>
        s.name.includes(search) ||
        s.slug.includes(search) ||
        (s.ownerName ?? "").includes(search) ||
        (s.ownerPhone ?? "").includes(search)
      )
    : localStores;

  const rows: (StoreRow | null)[] = [
    ...filtered,
    ...Array(Math.max(0, ROWS - filtered.length)).fill(null),
  ].slice(0, ROWS);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const getPaymentDate = (store: StoreRow) => {
    if (store.planExpiresAt) {
      const d = new Date(store.planExpiresAt);
      d.setDate(d.getDate() - 30);
      return formatDate(d.toISOString());
    }
    return null;
  };

  const getExpiryDate = (store: StoreRow) => {
    return formatDate(store.planExpiresAt) ?? formatDate(store.trialEndsAt);
  };

  const handleRefund = async () => {
    if (!refundTarget || !refundReason.trim()) return;
    setRefunding(true);
    setRefundError(null);
    setRefundSuccess(null);

    try {
      const res = await fetch("/api/billing/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: refundTarget.id, reason: refundReason.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRefundError(data.error ?? "환불 처리 중 오류가 발생했습니다.");
      } else {
        setRefundSuccess(data.refunded ? "환불 완료" : data.message ?? "처리 완료");
        setLocalStores(prev =>
          prev.map(s =>
            s.id === refundTarget.id
              ? { ...s, plan: "none", billingKey: null, planExpiresAt: null, trialEndsAt: null, subscriptionPlan: null }
              : s
          )
        );
      }
    } catch {
      setRefundError("네트워크 오류가 발생했습니다.");
    } finally {
      setRefunding(false);
    }
  };

  const closeModal = () => {
    setRefundTarget(null);
    setRefundReason("");
    setRefundError(null);
    setRefundSuccess(null);
  };

  const handleSuspend = async () => {
    if (!suspendTarget?.ownerUserId) return;
    const isSuspending = !suspendTarget.isSuspended;
    if (isSuspending && !suspendReason.trim()) return;

    setSuspending(true);
    setSuspendError(null);

    try {
      const res = await fetch("/api/operator/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: suspendTarget.ownerUserId,
          suspend: isSuspending,
          reason: isSuspending ? suspendReason.trim() : null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSuspendError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev =>
          prev.map(s =>
            s.id === suspendTarget.id
              ? { ...s, isSuspended: isSuspending, suspendReason: isSuspending ? suspendReason.trim() : null }
              : s
          )
        );
        setSuspendTarget(null);
        setSuspendReason("");
      }
    } catch {
      setSuspendError("네트워크 오류가 발생했습니다.");
    } finally {
      setSuspending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="매장명, slug, 담당자 이름·번호로 검색"
          className="w-full text-sm text-gray-700 outline-none placeholder-gray-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500 shrink-0">
            ✕
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">매장명</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">slug</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">담당자</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">플랜</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">결제일</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">만료일</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((store, i) =>
                store ? (
                  <tr key={store.id} className={`hover:bg-gray-50 transition-colors ${store.isSuspended ? "bg-orange-50/50" : ""}`}>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span className="font-medium text-gray-900">{store.name}</span>
                      {store.isSuspended && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">정지</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs">
                      <a href={`/${store.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 hover:underline">
                        /{store.slug}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-500 whitespace-nowrap">
                      <div>{store.ownerName ?? <span className="text-gray-300">—</span>}</div>
                      {store.ownerPhone && (
                        <div className="text-xs text-gray-400 mt-0.5">{store.ownerPhone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        store.plan === "annual" ? "bg-gold-100 text-gold-600" :
                        store.plan === "monthly" ? "bg-blue-50 text-blue-600" :
                        store.plan === "free" ? "bg-green-50 text-green-600" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {store.subscriptionPlan === "annual" ? "연간" : store.subscriptionPlan === "monthly" ? "월간" : store.plan === "free" ? "Free" : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-900 whitespace-nowrap">
                      {getPaymentDate(store) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-900 whitespace-nowrap">
                      {getExpiryDate(store) ? (
                        <>
                          {getExpiryDate(store)}
                          {store.trialEndsAt && !store.planExpiresAt && (
                            <span className="ml-1 text-xs text-gray-900">(체험)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === store.id ? null : store.id)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                        </svg>
                      </button>
                      {openMenuId === store.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-4 top-10 z-20 w-32 bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                            {store.billingKey && (
                              <button
                                onClick={() => { setOpenMenuId(null); setRefundTarget(store); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                              >
                                환불
                              </button>
                            )}
                            {store.ownerUserId && (
                              <button
                                onClick={() => { setOpenMenuId(null); setSuspendTarget(store); setSuspendReason(""); setSuspendError(null); }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                  store.isSuspended ? "text-gray-600 hover:bg-gray-50" : "text-orange-500 hover:bg-orange-50"
                                }`}
                              >
                                {store.isSuspended ? "정지 해제" : "정지"}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr key={`empty-${i}`} className="h-[52px]">
                    <td colSpan={7} />
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 정지 모달 */}
      {suspendTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {suspendTarget.isSuspended ? "정지 해제" : "계정 정지"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{suspendTarget.name}</span>
                {suspendTarget.isSuspended
                  ? "의 계정 정지를 해제합니다."
                  : "의 계정을 정지합니다. 해당 계정으로 로그인이 불가합니다."}
              </p>
            </div>

            {!suspendTarget.isSuspended && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">정지 사유</label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="사유를 입력하세요 (로그인 시 사용자에게 표시됩니다)"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 resize-none placeholder-gray-300"
                />
              </div>
            )}

            {suspendTarget.isSuspended && suspendTarget.suspendReason && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-0.5">현재 정지 사유</p>
                <p className="text-sm text-gray-700">{suspendTarget.suspendReason}</p>
              </div>
            )}

            {suspendError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{suspendError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSuspendTarget(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSuspend}
                disabled={suspending || (!suspendTarget.isSuspended && !suspendReason.trim())}
                className={`flex-1 text-sm px-4 py-2.5 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  suspendTarget.isSuspended ? "bg-gray-700 hover:bg-gray-800" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                {suspending ? "처리 중…" : suspendTarget.isSuspended ? "정지 해제" : "정지 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 환불 모달 */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">환불 처리</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{refundTarget.name}</span>의 최근 결제를 환불하고 구독을 해지합니다.
              </p>
            </div>

            {!refundSuccess && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">환불 사유</label>
                  <textarea
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    placeholder="환불 사유를 입력하세요"
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 resize-none placeholder-gray-300"
                  />
                </div>

                {refundError && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{refundError}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={closeModal}
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleRefund}
                    disabled={refunding || !refundReason.trim()}
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refunding ? "처리 중…" : "환불 확인"}
                  </button>
                </div>
              </>
            )}

            {refundSuccess && (
              <>
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">✓</div>
                  <p className="text-sm text-gray-700 font-medium">{refundSuccess}</p>
                  <p className="text-xs text-gray-400 mt-1">구독이 해지되고 빌링키가 삭제되었습니다.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
