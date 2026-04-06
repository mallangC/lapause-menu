"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  reservationId: string;
  companyName: string;
  productName: string;
  finalPrice: number;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  alreadyPaid: boolean;
}

export default function PayConfirmClient({
  reservationId,
  companyName,
  productName,
  finalPrice,
  bankName,
  bankAccount,
  bankHolder,
  alreadyPaid: initialPaid,
}: Props) {
  const [done, setDone] = useState(initialPaid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/pay/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      setError("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-beige-200 p-8 space-y-6">
        {/* 헤더 */}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">{companyName}</p>
          <Image src="/logo-light.png" alt="Flo.Aide" width={100} height={36} className="object-contain mx-auto" />
        </div>

        {done ? (
          /* 완료 상태 */
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-base font-medium text-gray-900">입금 확인 요청이 완료되었습니다.</p>
            <p className="text-sm text-gray-400">예약 확정, 취소 시 카톡 알림이 발송됩니다.</p>
          </div>
        ) : (
          /* 미결제 상태 */
          <>
            <div className="space-y-3">
              <div className="bg-beige-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">상품</span>
                  <span className="text-gray-900 font-medium">{productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">결제 금액</span>
                  <span className="text-gray-900 font-semibold">{finalPrice.toLocaleString()}원</span>
                </div>
              </div>

              {(bankName || bankAccount || bankHolder) && (
                <div className="bg-beige-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs text-gray-400 mb-1">입금 계좌</p>
                  {bankName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">은행</span>
                      <span className="text-gray-900">{bankName}</span>
                    </div>
                  )}
                  {bankAccount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">계좌번호</span>
                      <span className="text-gray-900 font-medium tracking-wide">{bankAccount}</span>
                    </div>
                  )}
                  {bankHolder && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">예금주</span>
                      <span className="text-gray-900">{bankHolder}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-gold-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-gold-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "처리 중..." : "입금 완료 알림 보내기"}
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              계좌이체 후 위 버튼을 눌러주세요.<br />
              매장에서 입금 확인 후 예약이 진행됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
