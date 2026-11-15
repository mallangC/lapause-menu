"use client";

import { formatPhone } from "@/lib/format";
import { CASH_RECEIPT_HINT, CASH_RECEIPT_TYPES, cashReceiptError, type CashReceipt, type PaymentMethod } from "@/lib/payment";

// 주문 마지막 페이지 — 결제 방법 고르기 (카드·간편결제 / 무통장 입금 + 현금영수증)
// 맞춤주문·장바구니 결제 화면이 함께 쓴다.

interface Props {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  receipt: CashReceipt;
  onReceipt: (r: CashReceipt) => void;
  /** 예약하기를 눌렀는데 현금영수증 번호가 틀렸을 때 */
  receiptError?: boolean;
  /** 이 매장이 무통장 입금를 받을 수 있는지 (매장 계좌가 등록돼 있어야 함) */
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
  // 무통장 입금는 매장 계좌가 없으면 고를 수 없게 흐리게 둔다 (선택지 자체는 늘 보이게)
  const options: { key: PaymentMethod; label: string; disabled?: boolean }[] = [
    { key: "card", label: "카드·간편결제" },
    { key: "transfer", label: "무통장 입금", disabled: !transferAvailable },
  ];

  return (
    <div className={`bg-white overflow-hidden ${inSidebar ? "border-b border-gray-100" : ""}`}>
      <div className={`${px} pt-4 pb-3 border-b border-gray-100`}>
        <h3 className="text-sm font-medium text-gray-700">
          결제 방법 <span className="text-red-400">*</span>
        </h3>
      </div>
      {/* 하나만 고르는 선택 — 수령 시간·현금영수증과 같은 버튼형 (아래 동의 체크박스와 헷갈리지 않게) */}
      <div className={`grid grid-cols-2 gap-2 ${px} py-3`}>
        {options.map((o) => {
          const on = method === o.key;
          return (
            <button
              key={o.key}
              type="button"
              disabled={o.disabled}
              onClick={() => onMethod(o.key)}
              aria-pressed={on}
              className={`py-2.5 rounded-lg border text-sm transition-colors disabled:cursor-not-allowed ${
                on
                  ? "border-gold-500 bg-gold-500 text-white font-medium"
                  : o.disabled
                    ? "border-gray-100 text-gray-300"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* 무통장 입금 — 현금영수증 신청 */}
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
