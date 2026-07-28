"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BillingKeyFlow from "@/components/BillingKeyFlow";
import { PLAN_PRICES, PLAN_FEATURES } from "@/lib/constants";

interface Props {
  companyId: string;
  customerName: string;
  plan: "monthly" | "annual" | "none" | "free";
  subscriptionPlan: "monthly" | "annual" | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  hasBillingKey: boolean;
}

const CHECK_ICON = (
  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PlanTab({ companyId, customerName, plan, subscriptionPlan, cancelAtPeriodEnd, trialEndsAt, planExpiresAt, hasBillingKey }: Props) {
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annual">(
    plan === "monthly" || plan === "annual" ? plan : "annual"
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000))
    : null;
  const isInTrial = trialEndsAt !== null && trialDaysLeft !== null && trialDaysLeft > 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const planLabel = (p: string | null) => {
    if (p === "annual") return "연간";
    if (p === "monthly") return "월간";
    return "—";
  };

  const nextAmount = subscriptionPlan === "annual"
    ? PLAN_PRICES.annualTotal
    : subscriptionPlan === "monthly"
    ? PLAN_PRICES.monthly
    : null;

  const hasPendingChange = plan !== "none" && subscriptionPlan !== null && plan !== subscriptionPlan;
  const expiryDate = isInTrial ? trialEndsAt : planExpiresAt;

  const handleChangePlan = async (newPlan: "monthly" | "annual") => {
    setLoading(true);
    setSuccess(null);
    const res = await fetch("/api/billing/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, newPlan }),
    });
    const data = res.ok ? await res.json() : null;
    setLoading(false);
    if (res.ok) {
      if (data?.undone) {
        setSuccess(`${planLabel(plan)} 플랜을 유지합니다.`);
      } else {
        setSuccess(`현재 기간 종료 후 ${planLabel(newPlan)}으로 전환됩니다.`);
      }
      setTimeout(() => router.refresh(), 1000);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    await supabase
      .from("company_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("company_id", companyId);
    setLoading(false);
    setShowCancelModal(false);
    router.refresh();
  };

  const handleUndoCancel = async () => {
    setLoading(true);
    await supabase
      .from("company_subscriptions")
      .update({ cancel_at_period_end: false })
      .eq("company_id", companyId);
    setLoading(false);
    router.refresh();
  };

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    setRefunding(true);
    setRefundError(null);
    try {
      const res = await fetch("/api/billing/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, reason: refundReason.trim(), refundType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRefundError(data.error ?? "환불 처리 중 오류가 발생했습니다.");
      } else {
        setShowRefundModal(false);
        setRefundReason("");
        setSuccess(data.refunded ? "환불이 처리되었습니다." : data.message ?? "처리 완료");
        setTimeout(() => router.refresh(), 1000);
      }
    } catch {
      setRefundError("네트워크 오류가 발생했습니다.");
    } finally {
      setRefunding(false);
    }
  };

  // ── 프리 플랜 ──
  if (plan === "free") {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">요금제</h2>
        <div className="p-5 rounded-2xl bg-beige-50 border border-beige-200">
          <p className="text-sm font-semibold text-gray-700 mb-1">프리 플랜 이용 중입니다.</p>
          <p className="text-xs text-gray-400 leading-relaxed">모든 기능을 편하게 이용하세요. 궁금한 점이 있으시면 언제든지 문의해 주세요.</p>
        </div>
      </div>
    );
  }

  // ── 구독 없음 ──
  if (plan === "none") {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">요금제</h2>
        <p className="text-sm text-gray-500 mb-5">현재 활성 구독이 없습니다. 아래에서 플랜을 선택하세요.</p>
        <PlanCard
          selectedCycle={selectedCycle}
          onCycleChange={setSelectedCycle}
          actionSlot={
            <BillingKeyFlow
              companyId={companyId}
              customerName={customerName}
              subscriptionPlan={selectedCycle}
              onSuccess={() => { setSuccess(`${planLabel(selectedCycle)} 구독이 시작되었습니다.`); setTimeout(() => router.refresh(), 1000); }}
              buttonLabel={selectedCycle === "annual" ? "연간 구독 시작" : "월간 구독 시작"}
            />
          }
        />
      </div>
    );
  }

  // ── 활성 구독 ──
  const isCurrent = plan === selectedCycle;
  const isPendingToSelected = subscriptionPlan === selectedCycle && subscriptionPlan !== plan;
  const canUndo = hasPendingChange && subscriptionPlan === selectedCycle && plan !== selectedCycle;

  let actionSlot: React.ReactNode;

  if (isCurrent) {
    actionSlot = (
      <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-beige-200 text-gray-300 cursor-default">
        현재 플랜
      </div>
    );
  } else if (isPendingToSelected) {
    actionSlot = (
      <div className="space-y-1">
        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-beige-200 text-gray-400 cursor-default">
          {expiryDate ? `${formatDate(expiryDate)} 이후 전환 예정` : "다음 결제부터 적용"}
        </div>
        <button
          onClick={() => handleChangePlan(plan as "monthly" | "annual")}
          disabled={loading}
          className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          전환 취소 ({planLabel(plan)} 유지)
        </button>
      </div>
    );
  } else if (canUndo) {
    actionSlot = (
      <div className="space-y-1">
        <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-beige-200 text-gray-300 cursor-default">
          현재 플랜
        </div>
        <button
          onClick={() => handleChangePlan(selectedCycle)}
          disabled={loading}
          className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          {loading ? "처리 중..." : `${planLabel(selectedCycle)}으로 전환 취소`}
        </button>
      </div>
    );
  } else if (!hasBillingKey) {
    actionSlot = (
      <BillingKeyFlow
        companyId={companyId}
        customerName={customerName}
        subscriptionPlan={selectedCycle}
        onSuccess={() => { setSuccess(`${planLabel(selectedCycle)} 구독이 시작되었습니다.`); setTimeout(() => router.refresh(), 1000); }}
        buttonLabel={selectedCycle === "annual" ? "연간으로 변경" : "월간으로 변경"}
      />
    );
  } else {
    actionSlot = (
      <div className="space-y-1.5">
        <button
          onClick={() => handleChangePlan(selectedCycle)}
          disabled={loading || cancelAtPeriodEnd}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? "처리 중..." : `${planLabel(selectedCycle)}으로 변경`}
        </button>
        <p className="text-[10px] text-gray-400 text-center">
          {expiryDate ? `${formatDate(expiryDate)} 이후 적용` : "다음 결제부터 적용"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">요금제</h2>

      {/* ── 상태 배너 ── */}
      {isInTrial && !cancelAtPeriodEnd && (
        <div className="mb-5 p-4 rounded-xl bg-gold-500/10 border border-gold-400/30 space-y-1">
          <p className="text-sm font-semibold text-gold-600">무료 체험 중 · D-{trialDaysLeft}</p>
          <p className="text-xs text-gray-500">
            {formatDate(trialEndsAt!)} 체험 종료 후{" "}
            <span className="font-medium text-gray-700">
              {subscriptionPlan === "annual"
                ? `연간 (₩${PLAN_PRICES.annualTotal.toLocaleString()}/년)`
                : `월간 (₩${PLAN_PRICES.monthly.toLocaleString()}/월)`}
            </span>
            이 자동 결제됩니다.
          </p>
        </div>
      )}
      {isInTrial && cancelAtPeriodEnd && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
          <p className="text-sm font-semibold text-red-500">해지 예정</p>
          <p className="text-xs text-gray-500">{formatDate(trialEndsAt!)} 무료 체험 종료 후 플랜이 해지됩니다.</p>
        </div>
      )}
      {!isInTrial && planExpiresAt && !cancelAtPeriodEnd && (
        <div className="mb-5 p-4 rounded-xl bg-beige-50 border border-beige-200 space-y-0.5">
          <p className="text-xs text-gray-400">다음 결제일</p>
          <p className="text-sm font-medium text-gray-800">{formatDate(planExpiresAt)}</p>
          {nextAmount != null && (
            <p className="text-xs text-gray-500">
              {subscriptionPlan === "annual" ? `₩${nextAmount.toLocaleString()} (연간)` : `₩${nextAmount.toLocaleString()}/월`}
            </p>
          )}
        </div>
      )}
      {!isInTrial && planExpiresAt && cancelAtPeriodEnd && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 space-y-1">
          <p className="text-sm font-semibold text-red-500">해지 예정</p>
          <p className="text-xs text-gray-500">{formatDate(planExpiresAt)} 이후 플랜이 해지됩니다.</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* ── 플랜 카드 ── */}
      <PlanCard
        selectedCycle={selectedCycle}
        onCycleChange={setSelectedCycle}
        currentPlan={plan as "monthly" | "annual"}
        actionSlot={actionSlot}
      />

      {/* ── 구독 정책 안내 ── */}
      <div className="mt-4">
        <button
          onClick={() => setShowPolicy((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="font-semibold uppercase tracking-wide">구독 정책 안내</span>
          <svg className={`w-3 h-3 transition-transform ${showPolicy ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showPolicy && (
          <ul className="mt-2 text-[11px] text-gray-400 space-y-1.5">
            <li>· 월간 플랜은 매월 ₩{PLAN_PRICES.monthly.toLocaleString()}이 자동 결제됩니다.</li>
            <li>· 연간 플랜은 연 1회 ₩{PLAN_PRICES.annualTotal.toLocaleString()}이 결제됩니다. (월 환산 ₩{PLAN_PRICES.annual.toLocaleString()})</li>
            <li>· 결제 실패 시 24시간 간격으로 최대 3회 재시도되며, 모두 실패하면 구독이 자동 해지됩니다.</li>
            <li>· 플랜 전환은 현재 결제 기간이 끝난 후 적용됩니다.</li>
            <li>· 구독 해지 시 현재 기간 종료 후 자동 결제가 중단되며, 잔여 기간은 정상 이용 가능합니다.</li>
          </ul>
        )}
      </div>

      {/* ── 환불 버튼 ── */}
      {subscriptionPlan !== null && !isInTrial && (
        <div className="mt-4">
          {plan === "annual" ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setRefundType("partial"); setShowRefundModal(true); }}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-orange-500 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                부분환불
              </button>
              <span className="text-gray-200">|</span>
              <button
                onClick={() => { setRefundType("full"); setShowRefundModal(true); }}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                전체환불
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setRefundType("full"); setShowRefundModal(true); }}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              환불
            </button>
          )}
          <p className="text-[11px] text-gray-400 mt-1">환불 처리 후 구독이 해지됩니다.</p>
        </div>
      )}

      {/* ── 구독 해지 / 해지 취소 ── */}
      {subscriptionPlan !== null && (
        <div className="mt-4 pt-5 border-t border-beige-200">
          {cancelAtPeriodEnd ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-400">구독 해지가 예약되었습니다.</span>
              <button
                onClick={handleUndoCancel}
                disabled={loading}
                className="text-xs text-gold-600 hover:text-gold-700 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                해지 취소
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                구독 해지
              </button>
              <p className="text-[11px] text-gray-400 mt-1">해지 시 현재 기간 종료 후 자동 결제가 중단됩니다.</p>
            </>
          )}
        </div>
      )}

      {/* 구독 해지 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">구독을 해지하시겠습니까?</p>
                <p className="text-xs text-gray-400 mt-0.5">현재 기간이 종료되면 자동 결제가 중단됩니다.</p>
              </div>
            </div>
            <ul className="text-xs text-gray-500 space-y-1.5 bg-beige-50 rounded-xl p-4">
              <li>· 해지 후에도 현재 구독 기간까지는 정상 이용 가능합니다.</li>
              <li>· 기간 종료 후 메뉴판이 비공개 처리됩니다.</li>
              <li>· 잔여 기간에 대한 환불은 제공되지 않습니다.</li>
            </ul>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                돌아가기
              </button>
              <button onClick={handleCancel} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors">
                {loading ? "처리 중..." : "해지 확인"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 환불 확인 모달 */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowRefundModal(false); setRefundReason(""); setRefundError(null); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {refundType === "partial" ? "부분환불 요청" : "전체환불 요청"}
            </h3>
            {refundType === "partial" && (
              <p className="text-xs text-gray-500 bg-beige-50 rounded-xl p-3">
                사용일수를 기준으로 월 단위로 공제 후 남은 금액이 환불됩니다.<br />
                (공제: 사용 개월수 × ₩14,900)
              </p>
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
            {refundError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{refundError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowRefundModal(false); setRefundReason(""); setRefundError(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding || !refundReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {refunding ? "처리 중..." : "환불 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 공통 플랜 카드 컴포넌트 ──
function PlanCard({
  selectedCycle,
  onCycleChange,
  currentPlan,
  actionSlot,
}: {
  selectedCycle: "monthly" | "annual";
  onCycleChange: (c: "monthly" | "annual") => void;
  currentPlan?: "monthly" | "annual";
  actionSlot: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-6 bg-white"
      style={{ borderColor: selectedCycle === "annual" ? "#e8ddc9" : "#e5e5e5" }}
    >
      {/* 토글 */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-full p-1" style={{ background: "#f3ede4" }}>
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => onCycleChange(cycle)}
              className="relative px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all"
              style={{
                background: selectedCycle === cycle ? "#2c2416" : "transparent",
                color: selectedCycle === cycle ? "white" : "#9a8a7a",
              }}
            >
              {cycle === "monthly" ? "월간" : "연간"}
              {currentPlan === cycle && (
                <span className="absolute -top-1.5 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#c9a96e", color: "white" }}>현재</span>
              )}
              {cycle === "annual" && selectedCycle !== "annual" && currentPlan !== "annual" && (
                <span className="absolute -top-1.5 -right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#c9a96e", color: "white" }}>추천</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 가격 */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-1" style={{ visibility: selectedCycle === "annual" ? "visible" : "hidden" }}>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.15)", color: "#9a7a3a" }}>
            연 ₩60,000 절약
          </span>
        </div>
        <div className="flex items-end justify-center gap-1.5">
          <span className="text-[2.8rem] font-semibold leading-none" style={{ color: "#2c2416" }}>
            ₩{(selectedCycle === "annual" ? PLAN_PRICES.annual : PLAN_PRICES.monthly).toLocaleString()}
          </span>
          <span className="text-[15px] font-medium text-neutral-400 mb-1.5">/ 월</span>
        </div>
        <p className="text-[12px] text-neutral-400 mt-1" style={{ visibility: selectedCycle === "annual" ? "visible" : "hidden" }}>
          연 ₩{PLAN_PRICES.annualTotal.toLocaleString()} 일괄 결제
        </p>
      </div>

      {/* 혜택 목록 */}
      <ul className="space-y-3 mb-6">
        {PLAN_FEATURES.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span style={{ color: item.highlight ? "#b8934a" : "#9ca3af" }}>{CHECK_ICON}</span>
            <span style={{ color: item.highlight ? "#9a7a3a" : "#374151" }}>{item.text}</span>
          </li>
        ))}
      </ul>

      {actionSlot}
    </div>
  );
}
