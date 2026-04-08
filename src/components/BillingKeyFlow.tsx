"use client";

import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";

interface Props {
  companyId: string;
  customerName: string;
  subscriptionPlan: "starter" | "pro";
  onSuccess: () => void;
  onError?: (msg: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function BillingKeyFlow({ companyId, customerName, subscriptionPlan, onSuccess, onError, buttonLabel = "결제 수단 등록", buttonClassName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const billingKeyResponse = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        billingKeyMethod: "CARD",
        issueId: `billing-${companyId}-${Date.now()}`,
        issueName: "Flo.Aide 구독 결제 수단",
        customer: { fullName: customerName },
      });

      if (!billingKeyResponse || "code" in billingKeyResponse) {
        throw new Error(
          ("message" in (billingKeyResponse ?? {}) ? (billingKeyResponse as { message: string }).message : null) ?? "카드 등록이 취소되었습니다."
        );
      }

      const res = await fetch("/api/billing/issue-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, billingKey: billingKeyResponse.billingKey, subscriptionPlan }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "결제 수단 저장에 실패했습니다.");
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className={buttonClassName ?? "w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"}
        style={!buttonClassName ? { background: "#2c2416" } : undefined}
      >
        {loading ? "처리 중..." : buttonLabel}
      </button>
    </div>
  );
}
