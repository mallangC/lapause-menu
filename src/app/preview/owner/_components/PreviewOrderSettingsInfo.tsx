// 미리보기 판매 신청 — 실제 신청서(계좌·서류 입력) 대신 '판매 신청이 무엇인지'만 가볍게 알려주는 페이지
// (가입 전 사장님에게 서류 칸을 줄줄이 보여주면 부담이 커서, 흐름만 보여준다)
const STEPS = [
  { title: "정보 입력", body: "매장 연락처와 정산받을 계좌, 사업자 정보를 한 번 입력해요." },
  { title: "운영자 확인", body: "입력한 정보를 Flo.Aide에서 확인해요." },
  { title: "판매 시작", body: "승인되면 판매 설정에서 예약·결제 기능을 켜고 바로 주문을 받아요." },
];

export default function PreviewOrderSettingsInfo() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-gray-900">판매 신청</h2>

      <div className="bg-white -mx-4 md:mx-0 py-6 px-5 md:rounded-2xl md:p-8">
        <div className="max-w-lg space-y-7">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900 leading-snug">
              손님에게 온라인으로 주문·결제를 받으려면
              <br />
              판매 신청이 필요해요
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              메뉴판과 상품 등록은 가입하자마자 바로 쓸 수 있어요.
              <br />
              장바구니·맞춤주문·결제 같은 판매 기능은 판매 신청이 승인되면 켤 수 있어요.
            </p>
          </div>

          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="w-7 h-7 rounded-full bg-gold-500 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
            손님이 결제한 금액은 입력한 정산 계좌로 보내드려요.
            <br />
            미리보기에서는 신청 화면 대신 안내만 보여드려요.
          </p>
        </div>
      </div>
    </div>
  );
}
