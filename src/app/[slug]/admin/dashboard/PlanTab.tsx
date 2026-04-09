"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BillingKeyFlow from "@/components/BillingKeyFlow";
import { PLAN_PRICES, PLAN_DESCRIPTIONS, PLAN_FEATURES } from "@/lib/constants";

interface Props {
  companyId: string;
  customerName: string;
  plan: "starter" | "pro" | "free";
  subscriptionPlan: "starter" | "pro" | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
}

const CHECK_ICON = (
  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PlanTab({ companyId, customerName, plan, subscriptionPlan, cancelAtPeriodEnd, trialEndsAt, planExpiresAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000))
    : null;
  const isInTrial = plan === "pro" && trialDaysLeft !== null && trialDaysLeft > 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const handleDowngrade = async () => {
    if (!confirm("Starter 플랜으로 변경하면 통계 등 Pro 기능을 사용할 수 없습니다. 변경하시겠습니까?")) return;
    setLoading(true);
    await Promise.all([
      supabase.from("company_subscriptions")
        .update({ plan: "starter", trial_ends_at: null, plan_expires_at: null, billing_key: null })
        .eq("company_id", companyId),
      supabase.from("company_settings")
        .update({ consult_enabled: false })
        .eq("company_id", companyId),
    ]);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.refresh(), 1000);
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

  if (plan === "free") {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">요금제</h2>
        <div className="p-5 rounded-2xl border border-gold-300 bg-gold-50">
          <p className="text-sm font-semibold text-gold-600 mb-1">무료 계정</p>
          <p className="text-xs text-gray-500">모든 기능을 무료로 이용할 수 있는 특별 계정입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-2">요금제</h2>

      {/* 상태 배너 */}
      {isInTrial && !cancelAtPeriodEnd && (
        <div className="mb-5 p-3 rounded-xl bg-gold-500/10 border border-gold-400/30">
          <p className="text-sm font-semibold text-gold-600">Pro 플랜 무료 체험 중 · D-{trialDaysLeft}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(trialEndsAt!)} 이후 월 {subscriptionPlan === "starter" ? PLAN_PRICES.starter.toLocaleString() : PLAN_PRICES.pro.toLocaleString()}원이 자동 결제됩니다.</p>
        </div>
      )}
      {isInTrial && cancelAtPeriodEnd && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-500">해지 예정</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(trialEndsAt!)} 무료 체험 종료 후 플랜이 해지됩니다.</p>
        </div>
      )}
      {planExpiresAt && !isInTrial && plan === "pro" && !cancelAtPeriodEnd && (
        <div className="mb-5 p-3 rounded-xl bg-beige-50 border border-beige-200">
          <p className="text-xs text-gray-500">다음 결제일</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{formatDate(planExpiresAt)}</p>
        </div>
      )}
      {planExpiresAt && !isInTrial && plan === "pro" && cancelAtPeriodEnd && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-500">해지 예정</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(planExpiresAt)} 이후 플랜이 해지됩니다.</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          플랜이 변경되었습니다.
        </div>
      )}

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Starter */}
        <div className={`rounded-2xl border p-6 flex flex-col ${plan === "starter" ? "border-gray-400 bg-white ring-2 ring-gray-300" : "border-beige-200 bg-beige-50"}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-400">Starter</p>
            {plan === "starter" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">현재 플랜</span>
            )}
          </div>
          <div className="mb-1">
            <span className="text-[2rem] font-semibold text-gray-900 leading-none">₩{PLAN_PRICES.starter.toLocaleString()}</span>
            <span className="text-sm text-gray-400 ml-1">/ 월</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">{PLAN_DESCRIPTIONS.starter}</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {PLAN_FEATURES.starter.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: "#9ca3af" }}>{CHECK_ICON}</span>
                <span style={{ color: "#374151" }}>{item.text}</span>
              </li>
            ))}
          </ul>
          {plan === "pro" ? (
            <button
              onClick={handleDowngrade}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading ? "처리 중..." : "Starter로 변경"}
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-gray-200 text-gray-300 cursor-default">
              현재 플랜
            </div>
          )}
        </div>

        {/* Pro */}
        <div className={`rounded-2xl border p-6 flex flex-col relative ${plan === "pro" ? "border-gold-400 bg-white ring-2 ring-gold-300" : "border-beige-200 bg-beige-50"}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-500">Pro</p>
            {plan === "pro" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-100 text-gold-600">현재 플랜</span>
            )}
          </div>
          <div className="mb-1">
            <span className="text-[2rem] font-semibold text-gray-900 leading-none">₩{PLAN_PRICES.pro.toLocaleString()}</span>
            <span className="text-sm text-gray-400 ml-1">/ 월</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">{PLAN_DESCRIPTIONS.pro}</p>
          <p className="text-xs font-semibold text-gold-500 mb-4">첫 30일 무료 체험</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {PLAN_FEATURES.pro.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: item.highlight ? "#b8934a" : "#9ca3af" }}>{CHECK_ICON}</span>
                <span style={{ color: item.highlight ? "#9a7a3a" : "#374151" }}>{item.text}</span>
              </li>
            ))}
          </ul>
          {plan === "starter" ? (
            <BillingKeyFlow
              companyId={companyId}
              customerName={customerName}
              subscriptionPlan="pro"
              onSuccess={() => { setSuccess(true); setTimeout(() => router.refresh(), 1000); }}
              buttonLabel="정기 구독 결제"
            />
          ) : (
            <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center border border-gold-200 text-gold-400 cursor-default">
              현재 플랜
            </div>
          )}
        </div>

      </div>

      {/* 구독 해지 / 해지 취소 */}
      {subscriptionPlan !== null && (
        <div className="mt-6 pt-5 border-t border-beige-200">
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
                className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                구독 해지
              </button>
              <p className="text-[11px] text-gray-300 mt-1">해지 시 현재 기간 종료 후 자동 결제가 중단됩니다.</p>
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
              <li>· 해지 후에도 현재 체험/구독 기간까지는 정상 이용 가능합니다.</li>
              <li>· 기간 종료 후 메뉴판이 비공개 처리됩니다.</li>
              <li>· 잔여 기간에 대한 환불은 제공되지 않습니다.</li>
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {loading ? "처리 중..." : "해지 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
