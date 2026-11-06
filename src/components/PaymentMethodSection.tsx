"use client";

import { formatPhone } from "@/lib/format";
import { CASH_RECEIPT_HINT, CASH_RECEIPT_TYPES, cashReceiptError, type CashReceipt, type PaymentMethod } from "@/lib/payment";

// 주문 마지막 페이지 — 결제 방법 고르기 (카드·간편결제 / 계좌이체 + 현금영수증)
// 맞춤주문·장바구니 결제 화면이 함께 쓴다.

interface Props {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  receipt: CashReceipt;
  onReceipt: (r: CashReceipt) => void;
  /** 예약하기를 눌렀는데 현금영수증 번호가 틀렸을 때 */
  receiptError?: boolean;
  /** 이 매장이 계좌이체를 받을 수 있는지 (매장 계좌가 등록돼 있어야 함) */
  transferAvailable: boolean;
  /** PC 오른쪽 결제 상자 안에 넣을 때 — 상자의 다른 칸과 같은 좌우 여백 */
  inSidebar?: boolean;
}

const fmtBiz = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
};

export default function PaymentMethodSection({ method, onMethod, receipt, onReceipt, receiptError, transferAvailable, inSidebar = false }: Props) {
  const px = inSidebar ? "px-5" : "px-4";
  const errMsg = receiptError ? cashReceiptError(receipt) : null;
  // 추가 옵션과 같은 모양 — 줄마다 이름 + 오른쪽 동그라미 체크
  // 계좌이체는 매장 계좌가 없으면 고를 수 없게 흐리게 둔다 (선택지 자체는 늘 보이게)
  const options: { key: PaymentMethod; label: string; disabled?: boolean }[] = [
    { key: "card", label: "카드·간편결제" },
    { key: "transfer", label: "계좌이체", disabled: !transferAvailable },
  ];

  return (
    <div className={`bg-white overflow-hidden ${inSidebar ? "border-b border-gray-100" : ""}`}>
      <div className={`${px} pt-4 pb-3 border-b border-gray-100`}>
        <h3 className="text-sm font-medium text-gray-700">
          결제 방법 <span className="text-red-400">*</span>
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {options.map((o) => {
          const on = method === o.key;
          return (
            <button
              key={o.key}
              type="button"
              disabled={o.disabled}
              onClick={() => onMethod(o.key)}
              aria-pressed={on}
              className={`w-full flex items-center justify-between ${px} py-3.5 text-left transition-colors disabled:cursor-not-allowed ${
                on ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : o.disabled ? "" : "hover:bg-gray-50"
              }`}
            >
              <div className="min-w-0">
                <span className={`text-sm ${on ? "text-gold-600 font-medium" : o.disabled ? "text-gray-300" : "text-gray-800"}`}>{o.label}</span>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${on ? "border-gold-500 bg-gold-500" : o.disabled ? "border-gray-200" : "border-gray-300"}`}>
                {on && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 계좌이체 — 현금영수증 신청 */}
      {method === "transfer" && (
        <div className={`space-y-2 ${px} pt-3 pb-4 border-t border-gray-100`}>
          <p className="text-sm font-medium text-gray-700">현금영수증</p>
          <div className="grid grid-cols-3 gap-2">
            {CASH_RECEIPT_TYPES.map((t) => {
              const on = receipt.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onReceipt({ type: t, number: t === receipt.type ? receipt.number : "" })}
                  className={`py-2.5 rounded-lg border text-sm transition-colors ${
                    on ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {receipt.type !== "신청 안 함" && (
            <div>
              <input
                type="text"
                inputMode="numeric"
                value={receipt.type === "소득공제" ? formatPhone(receipt.number) : fmtBiz(receipt.number)}
                onChange={(e) => onReceipt({ ...receipt, number: e.target.value.replace(/\D/g, "").slice(0, receipt.type === "소득공제" ? 11 : 10) })}
                placeholder={receipt.type === "소득공제" ? "010-1234-5678" : "123-45-67890"}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 ${errMsg ? "border-red-300" : "border-gray-200 focus:border-gray-400"}`}
              />
              <p className={`text-xs mt-1 ${errMsg ? "text-red-500" : "text-gray-400"}`}>{errMsg ?? CASH_RECEIPT_HINT[receipt.type]}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
