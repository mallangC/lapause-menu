"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BillingKeyFlow from "@/components/BillingKeyFlow";
import { PLAN_PRICES, PLAN_FEATURES } from "@/lib/constants";

interface Props {
  companyId: string;
  slug: string;
  customerName: string;
  trialEligible: boolean;
}

export default function PlanSelectClient({ companyId, slug, customerName, trialEligible }: Props) {
  const router = useRouter();
  const [pricingCycle, setPricingCycle] = useState<"monthly" | "annual">("annual");
  const [withdrawalAgreed, setWithdrawalAgreed] = useState(false);
  const handleSuccess = () => router.push(`/${slug}/admin/onboarding`);

  return (
    <div className="space-y-5 max-w-lg mx-auto w-full">
      <div className="rounded-2xl border p-7 bg-white" style={{ borderColor: pricingCycle === "annual" ? "#e8ddc9" : "#e5e5e5" }}>

        {/* 토글 */}
        <div className="flex justify-center mb-8">
          <div className="flex rounded-full p-1" style={{ background: "#f3ede4" }}>
            {(["monthly", "annual"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setPricingCycle(cycle)}
                className="relative px-6 py-2 rounded-full text-[15px] font-semibold transition-all"
                style={{
                  background: pricingCycle === cycle ? "#2c2416" : "transparent",
                  color: pricingCycle === cycle ? "white" : "#9a8a7a",
                }}
              >
                {cycle === "monthly" ? "월간" : "연간"}
                {cycle === "annual" && pricingCycle !== "annual" && (
                  <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#c9a96e", color: "white" }}>추천</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 가격 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-1" style={{ visibility: pricingCycle === "annual" ? "visible" : "hidden" }}>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.15)", color: "#9a7a3a" }}>
              연 ₩60,000 절약
            </span>
          </div>
          <div className="flex items-end justify-center gap-1.5">
            <span className="text-[3.2rem] font-semibold leading-none" style={{ color: "#2c2416" }}>
              ₩{(pricingCycle === "annual" ? PLAN_PRICES.annual : PLAN_PRICES.monthly).toLocaleString()}
            </span>
            <span className="text-[16px] font-medium text-neutral-400 mb-2">/ 월</span>
          </div>
          <p className="text-[13px] text-neutral-400 mt-1.5" style={{ visibility: pricingCycle === "annual" ? "visible" : "hidden" }}>
            연 ₩{PLAN_PRICES.annualTotal.toLocaleString()} 일괄 결제
          </p>
        </div>

        {/* 혜택 목록 */}
        <ul className="space-y-3.5 mb-8">
          {PLAN_FEATURES.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] font-medium">
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.highlight ? "#b8934a" : "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ color: item.highlight ? "#9a7a3a" : "#374151" }}>{item.text}</span>
            </li>
          ))}
        </ul>

        {trialEligible && (
          <div className="mb-4 py-3 px-4 rounded-xl text-center" style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.3)" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#9a7a3a" }}>30일 무료 체험 적용</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#b8934a" }}>카드 등록 후 30일간 요금이 청구되지 않습니다</p>
          </div>
        )}

        <BillingKeyFlow
          companyId={companyId}
          customerName={customerName}
          subscriptionPlan={pricingCycle}
          onSuccess={handleSuccess}
          buttonLabel={trialEligible ? "30일 무료로 시작하기" : (pricingCycle === "annual" ? "연간 구독 시작하기" : "월간 구독 시작하기")}
          buttonClassName="w-full py-3.5 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          buttonStyle={{ background: "#2c2416", color: "#fff" }}
          disabled={!withdrawalAgreed}
        />
      </div>

      {/* 청약 철회 제한 동의 */}
      <label className="flex items-start gap-3 cursor-pointer bg-white border border-beige-200 rounded-xl px-4 py-3">
        <input
          type="checkbox"
          checked={withdrawalAgreed}
          onChange={(e) => setWithdrawalAgreed(e.target.checked)}
          className="mt-0.5 accent-gold-500 shrink-0"
        />
        <span className="text-xs text-gray-500 leading-relaxed">
          구독 시작 즉시 서비스 이용이 개시되며,{" "}
          <Link href="/refund" target="_blank" className="underline text-gold-600 hover:text-gold-700">환불 정책</Link>
          에 따라 「전자상거래법」 제17조 제2항에 의해 결제 후 청약 철회가 제한될 수 있음을 확인하고 동의합니다. <span className="text-red-400">(필수)</span>
        </span>
      </label>
    </div>
  );
}
