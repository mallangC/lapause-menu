// 손님 결제 완료 화면 상단 — 장바구니 결제(CheckoutClient)와 맞춤 주문(ConsultClient)이 같은 문구·스타일을 쓰도록 공통으로 둔다
// 계좌이체 주문은 아직 결제 전이라 '예약 접수' 문구와, 입금할 매장 계좌를 함께 보여준다.

interface Props {
  /** 계좌이체 주문 — 입금할 매장 계좌 (있으면 계좌이체 화면) */
  transfer?: { bankName: string | null; bankAccount: string | null; bankHolder: string | null; amount: number } | null;
}

export default function OrderCompleteHeader({ transfer }: Props = {}) {
  return (
    <>
      <div className="bg-white rounded-2xl px-6 py-8 text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{transfer ? "예약이 접수되었습니다" : "결제가 완료되었습니다"}</h2>
        {/* 두 안내 문장은 한 덩어리로 붙여서 보여준다 (바깥 space-y-2 간격을 받지 않도록 묶음) */}
        <div className="text-sm text-gray-400 space-y-0.5">
          {transfer ? (
            <p>아래 계좌로 입금해주시면 매장에서 확인 후 예약이 확정됩니다.</p>
          ) : (
            <p>매장에서 확인 후 준비를 시작하겠습니다.</p>
          )}
          <p>(예약이 확정되거나 취소되면 카카오 알림톡으로 알려드립니다.)</p>
        </div>
      </div>

      {/* 계좌이체 — 입금할 계좌 */}
      {transfer && (
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">입금 계좌</p>
          <div className="px-4 py-4 space-y-2.5">
            {[
              { label: "은행", value: transfer.bankName },
              { label: "계좌번호", value: transfer.bankAccount, copy: true },
              { label: "예금주", value: transfer.bankHolder },
              { label: "입금 금액", value: `${transfer.amount.toLocaleString()}원`, strong: true },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <span className="text-sm text-gray-400 w-20 shrink-0">{r.label}</span>
                <span className={`flex-1 text-sm ${r.strong ? "font-bold text-gold-500" : "text-gray-800 font-medium"}`}>{r.value ?? "-"}</span>
                {r.copy && r.value && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(r.value!.replace(/\D/g, "")).catch(() => {})}
                    className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-400"
                  >
                    복사
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mx-4 mb-4 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 break-keep">
            이 계좌로 금액을 보내주셔야 예약이 확정돼요. 주문자 이름으로 입금해주세요.
          </p>
        </div>
      )}
    </>
  );
}
