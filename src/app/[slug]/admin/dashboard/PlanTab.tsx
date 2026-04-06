"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BillingKeyFlow from "@/components/BillingKeyFlow";

interface Props {
  companyId: string;
  customerName: string;
  plan: "starter" | "pro";
  trialEndsAt: string | null;
  planExpiresAt: string | null;
}

const CHECK_ICON = (
  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PlanTab({ companyId, customerName, plan, trialEndsAt, planExpiresAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
    await supabase
      .from("companies")
      .update({ plan: "starter", trial_ends_at: null, plan_expires_at: null, billing_key: null })
      .eq("id", companyId);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.refresh(), 1000);
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-2">요금제</h2>

      {/* 상태 배너 */}
      {isInTrial && (
        <div className="mb-5 p-3 rounded-xl bg-gold-500/10 border border-gold-400/30">
          <p className="text-sm font-semibold text-gold-600">무료 체험 중 · D-{trialDaysLeft}</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(trialEndsAt!)} 이후 월 9,900원이 자동 결제됩니다.</p>
        </div>
      )}
      {planExpiresAt && !isInTrial && plan === "pro" && (
        <div className="mb-5 p-3 rounded-xl bg-beige-50 border border-beige-200">
          <p className="text-xs text-gray-500">다음 결제일</p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">{formatDate(planExpiresAt)}</p>
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
            <span className="text-[2rem] font-semibold text-gray-900 leading-none">₩0</span>
            <span className="text-sm text-gray-400 ml-1">/ 월</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">월 구독료 없이 계속 사용</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              { text: "전자 메뉴판 운영", gold: false },
              { text: "맞춤 주문 & 예약 관리", gold: false },
              { text: "결제 수수료 5% (카드 수수료 포함)", gold: true },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: item.gold ? "#b8934a" : "#9ca3af" }}>{CHECK_ICON}</span>
                <span style={{ color: item.gold ? "#9a7a3a" : "#374151" }}>{item.text}</span>
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
            <span className="text-[2rem] font-semibold text-gray-900 leading-none">₩9,900</span>
            <span className="text-sm text-gray-400 ml-1">/ 월</span>
          </div>
          <p className="text-xs text-gray-400 mb-1">수수료 없이 매출을 온전히</p>
          <p className="text-xs font-semibold text-gold-500 mb-4">첫 30일 무료 체험</p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              { text: "Starter 플랜 모든 기능 포함", gold: false },
              { text: "우선 고객 지원", gold: false },
              { text: "결제 수수료 0% (카드 수수료 별도)", gold: true },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span style={{ color: item.gold ? "#b8934a" : "#9ca3af" }}>{CHECK_ICON}</span>
                <span style={{ color: item.gold ? "#9a7a3a" : "#374151" }}>{item.text}</span>
              </li>
            ))}
          </ul>
          {plan === "starter" ? (
            <BillingKeyFlow
              companyId={companyId}
              customerName={customerName}
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
    </div>
  );
}
