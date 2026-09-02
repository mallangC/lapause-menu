"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDesiredDate } from "../../admin/dashboard/reservations/utils";

interface ReservationInfo {
  reservationId: string;
  ordererName: string;
  ordererPhone: string;
  finalPrice: number;
  items: Array<{
    type?: string;
    name?: string;
    price: number;
    quantity: number;
    shopping_bag?: string | null;
    message_card?: string | null;
    message_card_content?: string | null;
  }>;
  expiresAt: string | null;
  deliveryType: string | null;
  desiredDate: string | null;
  desiredTime: string | null;
  companyName: string;
  slug: string;
  logoImage: string | null;
  messageCardPrice: number;
  shoppingBagPrice: number;
}

function addonCount(value?: string | null) {
  if (!value) return 0;
  if (value === "추가") return 1;
  const m = value.match(/^(\d+)/);
  return m ? Number(m[1]) : 0;
}

interface Props {
  slug: string;
  token: string;
  initialPaymentKey: string | null;
  initialOrderId: string | null;
  initialAmount: number | null;
  failCode: string | null;
  failMessage: string | null;
}

export default function PayClient({
  slug,
  token,
  initialPaymentKey,
  initialOrderId,
  initialAmount,
  failCode,
  failMessage,
}: Props) {
  const [info, setInfo] = useState<ReservationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [agreementError, setAgreementError] = useState(false);

  useEffect(() => {
    fetch(`/api/pay-link/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setLoadError(data.error);
        else setInfo(data);
      })
      .catch(() => setLoadError("네트워크 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [token]);

  // 토스 결제 리다이렉트 처리
  useEffect(() => {
    if (!initialPaymentKey || !initialOrderId || !initialAmount) return;
    if (failCode) {
      setPayError(failMessage ?? "결제가 취소되었습니다.");
      return;
    }

    window.history.replaceState({}, "", `/${slug}/pay/${token}`);
    setPaying(true);

    fetch("/api/pay-link/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        paymentKey: initialPaymentKey,
        orderId: initialOrderId,
        amount: initialAmount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setPayError(data.error);
        else setDone(true);
      })
      .catch(() => setPayError("결제 처리 중 오류가 발생했습니다."))
      .finally(() => setPaying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async () => {
    if (!info) return;
    if (!privacyAgreed || !cancellationAgreed) {
      setAgreementError(true);
      return;
    }
    setPaying(true);
    setPayError(null);

    try {
      const orderId = `pay-${token.slice(0, 8)}-${Date.now()}`;
      const orderName = info.items.length === 1
        ? (info.items[0].name || info.items[0].type || "상품")
        : `${info.items[0]?.name || info.items[0]?.type || "상품"} 외 ${info.items.length - 1}건`;

      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: orderId });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: info.finalPrice },
        orderId,
        orderName,
        customerName: info.ordererName,
        successUrl: `${window.location.origin}/${slug}/pay/${token}`,
        failUrl: `${window.location.origin}/${slug}/pay/${token}?code=FAIL`,
      });
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.");
      setPaying(false);
    }
  };

  if (paying && !payError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" />
          <p className="text-base font-medium text-gray-800">결제를 처리하고 있습니다</p>
          <p className="text-sm text-gray-400">잠시만 기다려주세요...</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900">결제가 완료되었습니다</h1>
            <p className="text-sm text-gray-400">주문해주신 상품 예쁘게 준비해드릴게요.</p>
          </div>
          {info && (
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-800">매장</span>
                <span className="text-gray-800 font-medium">{info.companyName || info.slug}</span>
              </div>
              {info.items.map((item, i) => {
                const bagAddon = info.shoppingBagPrice * addonCount(item.shopping_bag);
                const cardAddon = info.messageCardPrice * addonCount(item.message_card);
                const hasBag = item.shopping_bag && item.shopping_bag !== "없음" && item.shopping_bag !== "미포함";
                const hasCard = item.message_card && item.message_card !== "없음" && item.message_card !== "미포함";
                return (
                  <div key={i}>
                    <div className="flex justify-between">
                      <span className="text-gray-800">{item.name || item.type}</span>
                      <span className="text-gray-800 font-medium">{item.price.toLocaleString()}원</span>
                    </div>
                    {hasBag && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">쇼핑백 {item.shopping_bag}</span>
                        {bagAddon > 0 && <span className="text-xs text-gray-400">+{bagAddon.toLocaleString()}원</span>}
                      </div>
                    )}
                    {hasCard && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-400">메시지카드 {item.message_card}</span>
                        {cardAddon > 0 && <span className="text-xs text-gray-400 shrink-0 ml-2">+{cardAddon.toLocaleString()}원</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {info.desiredDate && (
                <div className="flex justify-between">
                  <span className="text-gray-800">{info.deliveryType === "배송" ? "배송 예정" : "픽업 예정"}</span>
                  <span className="text-gray-800 font-medium">
                    {formatDesiredDate(info.desiredDate, info.desiredTime)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-1.5 flex justify-between">
                <span className="text-gray-800">결제 금액</span>
                <span className="text-gray-800 font-medium">{info.finalPrice.toLocaleString()}원</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-yellow-500 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center space-y-3">
          <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-gray-900">{loadError}</h1>
          <p className="text-sm text-gray-400">링크가 만료되었거나 이미 결제된 예약입니다.</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const expiresDate = info.expiresAt ? new Date(info.expiresAt) : null;
  const displayName = info.companyName || info.slug;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-3">
        {/* 매장 로고 */}
        <div className="flex justify-center pt-2">
          {info.logoImage ? (
            <img
              src={info.logoImage}
              alt={displayName}
              className="max-w-40 max-h-24 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gold-500 shadow-sm flex items-center justify-center">
              <span className="text-xl font-semibold text-white">{displayName?.slice(0, 1) ?? ""}</span>
            </div>
          )}
        </div>

        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 text-center">
          <p className="text-xs text-gray-400">{displayName}</p>
          <h1 className="text-base font-semibold text-gray-900">결제 요청</h1>
          {expiresDate && (
            <p className="text-xs text-red-400 mt-0.5">
              만료: {expiresDate.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* 주문 정보 */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-100">주문 정보</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-800">예약자</span>
            <span className="text-gray-800">{info.ordererName}</span>
          </div>
          {info.items.map((item, i) => {
            const bagAddon = info.shoppingBagPrice * addonCount(item.shopping_bag);
            const cardAddon = info.messageCardPrice * addonCount(item.message_card);
            const hasBag = item.shopping_bag && item.shopping_bag !== "없음" && item.shopping_bag !== "미포함";
            const hasCard = item.message_card && item.message_card !== "없음" && item.message_card !== "미포함";
            return (
              <div key={i} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-800">{item.name || item.type}</span>
                  <span className="text-gray-800">{item.price.toLocaleString()}원</span>
                </div>
                {hasBag && (
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-gray-400">쇼핑백 {item.shopping_bag}</span>
                    {bagAddon > 0 && <span className="text-xs text-gray-400">+{bagAddon.toLocaleString()}원</span>}
                  </div>
                )}
                {hasCard && (
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-gray-400">메시지카드 {item.message_card}</span>
                    {cardAddon > 0 && <span className="text-xs text-gray-400 shrink-0 ml-2">+{cardAddon.toLocaleString()}원</span>}
                  </div>
                )}
              </div>
            );
          })}
          {info.desiredDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-800">{info.deliveryType === "배송" ? "배송 예정" : "픽업 예정"}</span>
              <span className="text-gray-800">{formatDesiredDate(info.desiredDate, info.desiredTime)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="text-sm font-medium text-gray-800">총 결제 금액</span>
            <span className="text-base font-bold text-gray-900">{info.finalPrice.toLocaleString()}원</span>
          </div>
        </div>

        {/* 동의 */}
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4 space-y-2.5">
          <label className={`flex items-start gap-2.5 text-xs cursor-pointer ${agreementError && !privacyAgreed ? "text-red-500" : "text-gray-500"}`}>
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => { setPrivacyAgreed(e.target.checked); if (agreementError) setAgreementError(false); }}
              className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0"
            />
            <span><Link href="/privacy" target="_blank" className="underline text-gold-600">개인정보처리방침</Link>에 동의합니다. <span className="text-red-400">*</span></span>
          </label>
          <label className={`flex items-start gap-2.5 text-xs cursor-pointer ${agreementError && !cancellationAgreed ? "text-red-500" : "text-gray-500"}`}>
            <input
              type="checkbox"
              checked={cancellationAgreed}
              onChange={(e) => { setCancellationAgreed(e.target.checked); if (agreementError) setAgreementError(false); }}
              className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0"
            />
            <span>제작 착수 후 취소·환불 불가. <Link href="/refund" target="_blank" className="underline text-gold-600">환불 정책</Link> 동의 <span className="text-red-400">*</span></span>
          </label>
        </div>

        {payError && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-500">
            {payError}
          </div>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={paying}
          className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors shadow-sm"
        >
          {info.finalPrice.toLocaleString()}원 결제하기
        </button>

        <p className="text-center text-xs text-gray-300">
          카드 결제 · Toss Payments
        </p>
      </div>
    </div>
  );
}
