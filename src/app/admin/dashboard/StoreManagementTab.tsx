"use client";

import { useState } from "react";
import { describeDiscount, describePromoTerms, isBillingCycle, quoteCharge, type PromoCode } from "@/lib/billingPrice";

interface PromoOption extends PromoCode {
  description: string | null;
  active: boolean;
  operator_only: boolean;
}

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerUserId: string | null;
  isSuspended: boolean;
  suspendReason: string | null;
  operatorMemo: string | null;
  plan: string | null;
  billingKey: string | null;
  planExpiresAt: string | null;
  trialEndsAt: string | null;
  subscriptionPlan: string | null;
  promo: { code: string; summary: string; cyclesRemaining: number | null } | null;
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
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [suspendTarget, setSuspendTarget] = useState<StoreRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [localStores, setLocalStores] = useState<StoreRow[]>(stores);
  const [freePlanTarget, setFreePlanTarget] = useState<StoreRow | null>(null);
  const [settingFreePlan, setSettingFreePlan] = useState(false);
  const [freePlanError, setFreePlanError] = useState<string | null>(null);
  const [resetPlanTarget, setResetPlanTarget] = useState<StoreRow | null>(null);
  const [resettingPlan, setResettingPlan] = useState(false);
  const [resetPlanError, setResetPlanError] = useState<string | null>(null);
  const [extendTarget, setExtendTarget] = useState<StoreRow | null>(null);
  const [extendMonths, setExtendMonths] = useState("1");
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [promoTarget, setPromoTarget] = useState<StoreRow | null>(null);
  const [promoOptions, setPromoOptions] = useState<PromoOption[] | null>(null);
  const [selectedPromoId, setSelectedPromoId] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [removePromoTarget, setRemovePromoTarget] = useState<StoreRow | null>(null);
  const [memoTarget, setMemoTarget] = useState<StoreRow | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);

  const filtered = search.trim()
    ? localStores.filter(s =>
        s.name.includes(search) ||
        s.slug.includes(search) ||
        (s.ownerName ?? "").includes(search) ||
        (s.ownerPhone ?? "").includes(search) ||
        (s.promo?.code ?? "").includes(search.trim().toUpperCase())
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
        body: JSON.stringify({ companyId: refundTarget.id, reason: refundReason.trim(), refundType }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRefundError(data.error ?? "환불 처리 중 오류가 발생했습니다.");
      } else {
        setRefundSuccess(data.refunded
          ? (data.refundAmount != null ? `환불 완료 (₩${Number(data.refundAmount).toLocaleString()})` : "환불 완료")
          : data.message ?? "처리 완료");
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

  const handleSetFreePlan = async () => {
    if (!freePlanTarget) return;
    setSettingFreePlan(true);
    setFreePlanError(null);

    try {
      const res = await fetch("/api/operator/set-free-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: freePlanTarget.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFreePlanError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev =>
          prev.map(s =>
            s.id === freePlanTarget.id
              ? { ...s, plan: "free", billingKey: null, planExpiresAt: null, subscriptionPlan: null }
              : s
          )
        );
        setFreePlanTarget(null);
      }
    } catch {
      setFreePlanError("네트워크 오류가 발생했습니다.");
    } finally {
      setSettingFreePlan(false);
    }
  };

  const handleResetPlan = async () => {
    if (!resetPlanTarget) return;
    setResettingPlan(true);
    setResetPlanError(null);

    try {
      const res = await fetch("/api/operator/reset-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: resetPlanTarget.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResetPlanError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev =>
          prev.map(s =>
            s.id === resetPlanTarget.id
              ? { ...s, plan: "none", billingKey: null, planExpiresAt: null, subscriptionPlan: null }
              : s
          )
        );
        setResetPlanTarget(null);
      }
    } catch {
      setResetPlanError("네트워크 오류가 발생했습니다.");
    } finally {
      setResettingPlan(false);
    }
  };

  // 무료체험 중(만료일 없음)이면 체험 종료일을, 유료 구독 중이면 다음 결제일을 늘린다 (서버와 같은 기준)
  const isInTrialPeriod = (store: StoreRow) => !store.planExpiresAt && !!store.trialEndsAt;
  const canExtend = (store: StoreRow) => store.plan !== null && store.plan !== "none" && store.plan !== "free";

  const handleExtendPlan = async () => {
    if (!extendTarget) return;
    const months = Number(extendMonths);
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      setExtendError("1~24 사이의 개월 수를 입력해주세요.");
      return;
    }
    setExtending(true);
    setExtendError(null);

    try {
      const res = await fetch("/api/operator/extend-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: extendTarget.id, months }),
      });
      const data = await res.json();

      if (!res.ok) {
        setExtendError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev =>
          prev.map(s => s.id === extendTarget.id ? { ...s, planExpiresAt: data.planExpiresAt, trialEndsAt: data.trialEndsAt } : s)
        );
        setExtendTarget(null);
      }
    } catch {
      setExtendError("네트워크 오류가 발생했습니다.");
    } finally {
      setExtending(false);
    }
  };

  const openPromoModal = async (store: StoreRow) => {
    setOpenMenuId(null);
    setPromoTarget(store);
    setSelectedPromoId("");
    setPromoError(null);
    if (promoOptions) return;
    try {
      const res = await fetch("/api/operator/promo-codes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "할인 코드를 불러오지 못했습니다.");
      setPromoOptions(data as PromoOption[]);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "할인 코드를 불러오지 못했습니다.");
    }
  };

  const handleApplyPromo = async () => {
    if (!promoTarget || !selectedPromoId) return;
    setSavingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/operator/store-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: promoTarget.id, promoCodeId: selectedPromoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev => prev.map(s => s.id === promoTarget.id ? { ...s, promo: data.promo } : s));
        setPromoTarget(null);
      }
    } catch {
      setPromoError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingPromo(false);
    }
  };

  const handleRemovePromo = async () => {
    if (!removePromoTarget) return;
    setSavingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/operator/store-promo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: removePromoTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        setLocalStores(prev => prev.map(s => s.id === removePromoTarget.id ? { ...s, promo: null } : s));
        setRemovePromoTarget(null);
      }
    } catch {
      setPromoError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingPromo(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!memoTarget) return;
    setSavingMemo(true);
    setMemoError(null);

    try {
      const res = await fetch("/api/operator/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: memoTarget.id, memo: memoDraft }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMemoError(data.error ?? "처리 중 오류가 발생했습니다.");
      } else {
        const saved = memoDraft.trim() || null;
        setLocalStores(prev =>
          prev.map(s => s.id === memoTarget.id ? { ...s, operatorMemo: saved } : s)
        );
        setMemoTarget(null);
      }
    } catch {
      setMemoError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingMemo(false);
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
          placeholder="매장명, slug, 담당자 이름·번호, 할인 코드로 검색"
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
                      {store.promo && (
                        <div
                          className="mt-1 text-[11px] font-mono text-gold-600"
                          title={`${store.promo.summary}${store.promo.cyclesRemaining !== null ? ` (남은 할인 ${store.promo.cyclesRemaining}회)` : ""}`}
                        >
                          {store.promo.code}
                        </div>
                      )}
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
                          <div className="absolute right-4 top-10 z-20 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 overflow-hidden">
                            {canExtend(store) && (
                              <button
                                onClick={() => { setOpenMenuId(null); setExtendTarget(store); setExtendMonths("1"); setExtendError(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                {isInTrialPeriod(store) ? "무료체험 연장" : "기간 연장"}
                              </button>
                            )}
                            {store.plan !== "free" && (
                              <button
                                onClick={() => openPromoModal(store)}
                                className="w-full text-left px-4 py-2 text-sm text-gold-600 hover:bg-gold-50 transition-colors"
                              >
                                {store.promo ? "할인 변경" : "할인 적용"}
                              </button>
                            )}
                            {store.promo && (
                              <button
                                onClick={() => { setOpenMenuId(null); setRemovePromoTarget(store); setPromoError(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                할인 해제
                              </button>
                            )}
                            {store.plan !== "free" && (
                              <button
                                onClick={() => { setOpenMenuId(null); setFreePlanTarget(store); setFreePlanError(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                              >
                                Free 플랜으로 변경
                              </button>
                            )}
                            {store.plan !== "none" && store.plan !== null && (
                              <button
                                onClick={() => { setOpenMenuId(null); setResetPlanTarget(store); setResetPlanError(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                플랜 초기화
                              </button>
                            )}
                            <button
                              onClick={() => { setOpenMenuId(null); setMemoTarget(store); setMemoDraft(store.operatorMemo ?? ""); setMemoError(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              메모 {store.operatorMemo && <span className="text-gold-500">●</span>}
                            </button>
                            {store.billingKey && (
                              <button
                                onClick={() => { setOpenMenuId(null); setRefundTarget(store); setRefundType(store.subscriptionPlan === "annual" ? "partial" : "full"); }}
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

      {/* 기간 연장 모달 */}
      {extendTarget && (() => {
        const trial = isInTrialPeriod(extendTarget);
        const months = Number(extendMonths);
        const validMonths = Number.isInteger(months) && months >= 1 && months <= 24;
        // 미리보기는 서버와 같은 규칙: 이미 지난 날짜면 오늘부터, 아니면 기존 날짜부터 더한다
        const currentStr = trial ? extendTarget.trialEndsAt : extendTarget.planExpiresAt;
        const now = new Date();
        const current = currentStr ? new Date(currentStr) : null;
        const preview = new Date(current && current > now ? current : now);
        if (validMonths) preview.setDate(preview.getDate() + months * 30);
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{trial ? "무료체험 연장" : "구독 기간 연장"}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{extendTarget.name}</span>의 {trial ? "무료체험 종료일" : "다음 결제일"}을 늘립니다. 늘어난 기간만큼 결제 없이 이용할 수 있습니다. (1개월 = 30일)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={extendMonths}
                  onChange={e => setExtendMonths(e.target.value)}
                  className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-400"
                />
                <span className="text-sm text-gray-600">개월 ({validMonths ? months * 30 : "—"}일)</span>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                <p>현재 {trial ? "체험 종료일" : "다음 결제일"}: {formatDate(currentStr) ?? "없음"}</p>
                <p className="font-medium text-gray-700">연장 후: {validMonths ? formatDate(preview.toISOString()) : "—"}</p>
              </div>

              {extendError && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{extendError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setExtendTarget(null)}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleExtendPlan}
                  disabled={extending || !validMonths}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extending ? "처리 중…" : "연장 확인"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 할인 적용 모달 */}
      {promoTarget && (() => {
        const rawCycle = promoTarget.subscriptionPlan ?? promoTarget.plan;
        const cycle = isBillingCycle(rawCycle) ? rawCycle : null;
        const selected = promoOptions?.find(p => p.id === selectedPromoId) ?? null;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{promoTarget.promo ? "할인 변경" : "할인 적용"}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{promoTarget.name}</span>에 할인 코드를 직접 적용합니다. 사장님이 코드를 입력할 필요가 없고, <span className="font-medium text-gray-700">다음 결제부터</span> 할인된 금액으로 결제됩니다.
                </p>
                {promoTarget.promo && (
                  <p className="text-xs text-gray-500 mt-2">현재 적용: <span className="font-mono text-gold-600">{promoTarget.promo.code}</span> → 선택한 코드로 교체됩니다.</p>
                )}
              </div>

              {promoOptions === null && !promoError && <p className="text-sm text-gray-400">불러오는 중…</p>}
              {promoOptions?.length === 0 && <p className="text-sm text-gray-400">먼저 할인 코드 탭에서 코드를 만들어주세요.</p>}
              {!!promoOptions?.length && (
                <select
                  value={selectedPromoId}
                  onChange={e => setSelectedPromoId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 bg-white"
                >
                  <option value="">할인 코드 선택</option>
                  {promoOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {describeDiscount(p)} · {describePromoTerms(p)}{p.operator_only ? " · 운영자 전용" : ""}{p.description ? ` (${p.description})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {selected && cycle && (() => {
                const q = quoteCharge(cycle, selected, selected.duration_cycles);
                return (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                    <p>현재 플랜({cycle === "annual" ? "연간" : "월간"}) 기준 다음 결제 금액</p>
                    <p className="font-medium text-gray-900">
                      ₩{q.baseAmount.toLocaleString()} → ₩{q.amount.toLocaleString()}
                      {q.discountAmount === 0 && <span className="font-normal text-gray-400"> (이 플랜은 할인 대상 아님)</span>}
                    </p>
                  </div>
                );
              })()}

              {promoError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{promoError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPromoTarget(null)}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleApplyPromo}
                  disabled={savingPromo || !selectedPromoId}
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPromo ? "처리 중…" : "적용 확인"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 할인 해제 모달 */}
      {removePromoTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">할인 해제</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{removePromoTarget.name}</span>의 할인(<span className="font-mono text-gold-600">{removePromoTarget.promo?.code}</span>)을 해제합니다. <span className="font-medium text-gray-700">다음 결제부터 정가</span>로 결제됩니다.
              </p>
              <p className="text-xs text-orange-500 bg-orange-50 rounded-lg px-3 py-2 mt-3">
                사장님 입장에서는 결제 금액이 오르는 변경이에요. 해제 전에 사장님께 미리 안내해주세요.
              </p>
            </div>

            {promoError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{promoError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRemovePromoTarget(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRemovePromo}
                disabled={savingPromo}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPromo ? "처리 중…" : "해제 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free 플랜 전환 모달 */}
      {freePlanTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Free 플랜으로 변경</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{freePlanTarget.name}</span>의 구독을 Free 플랜으로 전환합니다. 빌링키가 제거되어 이후 자동 결제가 중단되고, 만료일 없이 무기한 이용할 수 있습니다.
              </p>
            </div>

            {freePlanError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{freePlanError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFreePlanTarget(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSetFreePlan}
                disabled={settingFreePlan}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingFreePlan ? "처리 중…" : "변경 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플랜 초기화 모달 */}
      {resetPlanTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">플랜 초기화</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{resetPlanTarget.name}</span>의 구독 상태를 플랜 없음으로 초기화합니다. 환불은 처리되지 않으며 구독 정보만 초기화됩니다.
              </p>
            </div>

            {resetPlanError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{resetPlanError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setResetPlanTarget(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResetPlan}
                disabled={resettingPlan}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-700 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingPlan ? "처리 중…" : "초기화 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 모달 */}
      {memoTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">매장 메모</h3>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{memoTarget.name}</span>에 대한 운영자 메모입니다. 손님·매장 담당자에게는 보이지 않습니다.
              </p>
            </div>

            <textarea
              value={memoDraft}
              onChange={e => setMemoDraft(e.target.value)}
              placeholder="메모를 입력하세요"
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 resize-none placeholder-gray-300"
            />

            {memoError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{memoError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMemoTarget(null)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveMemo}
                disabled={savingMemo}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingMemo ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {refundTarget.subscriptionPlan === "annual" && (
                  <div className="space-y-2">
                    <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm w-fit">
                      {(["partial", "full"] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setRefundType(t)}
                          className={`px-3 py-2 transition-colors ${refundType === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
                        >
                          {t === "partial" ? "부분환불" : "전액환불"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {refundType === "partial"
                        ? "실제 결제 금액 − 사용 개월수(올림) × 월간 정가로 계산해 환불하고, 사용한 기간까지는 이용할 수 있게 둡니다."
                        : "결제 금액 전체를 환불합니다. 환불 규정상 서비스 귀책·중복 결제 등에 한해 처리하세요."}
                    </p>
                  </div>
                )}
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
