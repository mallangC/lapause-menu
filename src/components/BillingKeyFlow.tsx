"use client";

import { useState } from "react";

// PortOne 결제 비활성화 중 — 재활성화 시 @portone/browser-sdk 재설치 필요
// import * as PortOne from "@portone/browser-sdk/v2";

interface Props {
  companyId: string;
  customerName: string;
  onSuccess: () => void;
  onError?: (msg: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function BillingKeyFlow({ onSuccess, onError, buttonLabel = "결제 수단 등록", buttonClassName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // PortOne 결제 비활성화 중
      // const PortOne = await import("@portone/browser-sdk/v2");
      // const response = await PortOne.requestIssueBillingKey({ ... });
      throw new Error("현재 카드 등록 서비스를 준비 중입니다.");
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
