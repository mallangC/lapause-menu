"use client";

import { useState, useEffect } from "react";

interface Props {
  companyId: string;
  customerName: string;
  subscriptionPlan: "starter" | "pro";
  onSuccess: () => void;
  onError?: (msg: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export default function BillingKeyFlow({ companyId, customerName, subscriptionPlan, onSuccess, onError, buttonLabel = "결제 수단 등록", buttonClassName, disabled = false }: Props) {
  const isReturning = typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("authKey");
  const [loading, setLoading] = useState(isReturning);
  const [error, setError] = useState<string | null>(null);

  // 토스 빌링 인증 후 리다이렉트 복귀 처리
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authKey = params.get("authKey");
    const returnedCustomerKey = params.get("customerKey");
    const failCode = params.get("code");

    if (!authKey && !failCode) return;

    const savedRaw = sessionStorage.getItem("billingKeyFlow");
    if (!savedRaw) return;

    const saved = JSON.parse(savedRaw) as { companyId: string; subscriptionPlan: string };
    // 이 인스턴스의 플랜과 저장된 플랜이 일치할 때만 처리 (두 인스턴스 중복 실행 방지)
    if (saved.subscriptionPlan !== subscriptionPlan) return;

    sessionStorage.removeItem("billingKeyFlow");
    // URL 파라미터 정리
    window.history.replaceState({}, "", window.location.pathname);

    if (failCode) {
      const msg = params.get("message") ?? "카드 등록이 취소되었습니다.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setLoading(true);
    fetch("/api/billing/issue-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: saved.companyId,
        authKey,
        customerKey: returnedCustomerKey,
        subscriptionPlan: saved.subscriptionPlan,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "결제 수단 저장에 실패했습니다.");
        }
        onSuccess();
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
        setError(msg);
        onError?.(msg);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      sessionStorage.setItem("billingKeyFlow", JSON.stringify({ companyId, subscriptionPlan }));

      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: companyId });

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}${window.location.pathname}`,
        failUrl: `${window.location.origin}${window.location.pathname}`,
        customerName,
      });
      // 리다이렉트 발생 — 이후 코드 실행 안 됨
    } catch (err) {
      sessionStorage.removeItem("billingKeyFlow");
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(msg);
      onError?.(msg);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={buttonClassName ?? "w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"}
        style={!buttonClassName ? { background: "#2c2416" } : undefined}
      >
        {loading ? "처리 중..." : buttonLabel}
      </button>
    </div>
  );
}
