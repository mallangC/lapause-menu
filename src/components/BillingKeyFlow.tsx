"use client";

import { useState } from "react";

interface Props {
  companyId: string;
  customerName: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function BillingKeyFlow({ companyId, customerName, onSuccess, onError, buttonLabel = "결제 수단 등록", buttonClassName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        billingKeyMethod: "CARD",
        issueId: `issue-${companyId}-${Date.now()}`,
        issueName: "Flo.Aide Pro 월정기구독",
        customer: { customerId: companyId, fullName: customerName },
      });

      if (!response || "code" in response) {
        throw new Error((response as { message?: string } | undefined)?.message ?? "카드 등록에 실패했습니다.");
      }

      const res = await fetch("/api/billing/issue-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingKey: response.billingKey,
          pgProvider: "KPN",
          companyId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "서버 오류가 발생했습니다.");
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
