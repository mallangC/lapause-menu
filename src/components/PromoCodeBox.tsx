"use client";

import { useState } from "react";
import {
  describeDiscount,
  describePromoTerms,
  PLAN_CHARGE_AMOUNT,
  promoAppliesTo,
  quoteCharge,
  type BillingCycle,
  type PromoCode,
} from "@/lib/billingPrice";

interface Props {
  companyId: string;
  /** 지금 화면에서 선택된 플랜 — 이 플랜 기준으로 결제 금액을 보여준다 */
  cycle: BillingCycle;
  promo: PromoCode | null;
  cyclesRemaining: number | null;
  onApplied: (promo: PromoCode, cyclesRemaining: number | null) => void;
}

const won = (n: number) => `₩${n.toLocaleString()}`;

// 할인 코드 입력 + 적용 결과(정가 → 할인 → 실제 결제 금액) 안내
export default function PromoCodeBox({ companyId, cycle, promo, cyclesRemaining, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "할인 코드 등록에 실패했습니다.");
      } else {
        onApplied(data.promo as PromoCode, (data.cyclesRemaining as number | null) ?? null);
        setCode("");
        setOpen(false);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!promo) {
    return (
      <div className="mt-3">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-gray-500 hover:text-gold-600 underline underline-offset-2 transition-colors"
          >
            할인 코드가 있으신가요?
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                placeholder="할인 코드 입력"
                maxLength={30}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase tracking-wider focus:outline-none focus:border-gold-400 bg-white"
              />
              <button
                type="button"
                onClick={handleApply}
                disabled={loading || !code.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "#2c2416" }}
              >
                {loading ? "확인 중…" : "적용"}
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>
    );
  }

  const applies = promoAppliesTo(promo, cycle);
  const quote = quoteCharge(cycle, promo, cyclesRemaining);
  const unit = cycle === "annual" ? "매년" : "매월";
  const discounted = quote.discountAmount > 0;

  return (
    <div className="mt-3 p-3.5 rounded-xl text-xs space-y-2" style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.3)" }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold" style={{ color: "#9a7a3a" }}>할인 코드 {promo.code} 적용됨</span>
        <span className="text-gray-500">{describeDiscount(promo)} · {describePromoTerms(promo)}</span>
      </div>

      {discounted ? (
        <>
          <div className="space-y-0.5 text-gray-600">
            <div className="flex justify-between"><span>정가</span><span>{won(quote.baseAmount)}</span></div>
            <div className="flex justify-between"><span>할인</span><span className="text-red-500">−{won(quote.discountAmount)}</span></div>
            <div className="flex justify-between pt-1 border-t border-beige-200 font-semibold text-gray-900">
              <span>결제 금액</span>
              <span>{unit} {won(quote.amount)}</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {cyclesRemaining === null
              ? "구독을 유지하는 동안 계속 할인된 금액으로 결제됩니다."
              : `앞으로 ${cyclesRemaining}회 결제에 할인이 적용되고, 이후에는 정가 ${won(PLAN_CHARGE_AMOUNT[cycle])}으로 결제됩니다.`}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {!applies
            ? `이 코드는 ${promo.applies_to === "monthly" ? "월간" : "연간"} 플랜에만 적용됩니다. ${cycle === "annual" ? "연간" : "월간"} 플랜은 정가 ${won(quote.baseAmount)}으로 결제됩니다.`
            : `할인 적용 횟수를 모두 사용해 정가 ${won(quote.baseAmount)}으로 결제됩니다.`}
        </p>
      )}
    </div>
  );
}
