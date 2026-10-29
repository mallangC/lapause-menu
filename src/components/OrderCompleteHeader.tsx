// 손님 결제 완료 화면 상단 — 장바구니 결제(CheckoutClient)와 맞춤 주문(ConsultClient)이 같은 문구·스타일을 쓰도록 공통으로 둔다
export default function OrderCompleteHeader() {
  return (
    <div className="bg-white rounded-2xl px-6 py-8 text-center space-y-2">
      <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
        <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">결제가 완료되었습니다</h2>
      {/* 두 안내 문장은 한 덩어리로 붙여서 보여준다 (바깥 space-y-2 간격을 받지 않도록 묶음) */}
      <div className="text-sm text-gray-400 space-y-0.5">
        <p>매장에서 확인 후 준비를 시작하겠습니다.</p>
        <p>(예약이 확정되거나 취소되면 카카오 알림톡으로 알려드립니다.)</p>
      </div>
    </div>
  );
}
