import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-beige-100">
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-base font-normal tracking-widest text-gold-500">Flo Aide</span>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 홈
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Terms of Service</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">서비스 이용약관</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 3월 24일</p>
        </div>

        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 서비스 소개</h2>
            <p>Flo Aide(이하 "서비스")는 꽃집 사업자(이하 "회원")를 위한 메뉴 관리 및 예약 운영 서비스입니다. 본 약관은 서비스 운영자(이하 "운영자")와 회원 간의 이용 조건을 정합니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 이용 계약 체결</h2>
            <p>회원은 운영자로부터 계정을 발급받고 최초 로그인(계정 활성화)함으로써 본 약관에 동의한 것으로 간주합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>계정은 운영자의 승인 후 발급됩니다.</li>
              <li>계정은 1개 사업장에 한해 사용 가능하며, 타인에게 양도할 수 없습니다.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 이용 요금 및 결제</h2>
            <p>서비스 이용 요금 및 결제 방식은 운영자가 회원에게 별도로 고지합니다.</p>
            <p className="text-gray-400 text-xs">요금 정책이 변경될 경우 변경 전 최소 7일 전에 고지합니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 환불 정책</h2>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p><span className="font-medium text-gray-700">계정 활성화 전 (최초 로그인 전):</span> 결제 금액 전액 환불</p>
              <p><span className="font-medium text-gray-700">계정 활성화 후 (최초 로그인 후):</span> 서비스가 이미 제공된 것으로 간주하여 환불 불가</p>
            </div>
            <p className="text-gray-400 text-xs">환불 요청은 운영자에게 직접 문의하시기 바랍니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 회원의 의무</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>계정 및 비밀번호는 본인이 직접 관리해야 하며, 타인과 공유할 수 없습니다.</li>
              <li>서비스를 통해 수집한 고객 개인정보는 관련 법령에 따라 적법하게 처리해야 합니다.</li>
              <li>서비스를 이용하여 불법적인 행위를 해서는 안 됩니다.</li>
              <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 운영자의 데이터 활용</h2>
            <p>운영자는 서비스 개선 및 운영 목적으로 회원의 거래 통계 데이터(예약 건수, 매출 규모 등)를 수집·분석할 수 있습니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>수집된 데이터는 서비스 품질 개선에만 활용됩니다.</li>
              <li>특정 회원을 식별할 수 있는 형태로 외부에 제공하지 않습니다.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. 서비스 데이터 보관</h2>
            <p>회원의 예약 및 거래 데이터는 서비스 이용 기간 동안 보관되며, 탈퇴 후에도 전자상거래법 등 관계 법령에 따라 최대 <strong className="text-gray-800">5년</strong>간 보관될 수 있습니다.</p>
            <p className="text-gray-400 text-xs">보관 기간 내 데이터 삭제를 원하시면 운영자에게 문의하시기 바랍니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">8. 서비스 중단 및 종료</h2>
            <p>운영자는 서비스를 중단하거나 종료할 경우 최소 <strong className="text-gray-800">30일 전</strong>에 회원에게 공지합니다.</p>
            <p>시스템 점검, 장애 등 불가피한 사유로 일시 중단될 수 있으며, 이 경우 사전 또는 사후에 공지합니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">9. 책임의 제한</h2>
            <p>운영자는 천재지변, 네트워크 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
            <p>회원이 서비스를 통해 수집·관리하는 고객 개인정보의 처리에 대한 법적 책임은 해당 회원에게 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">10. 약관 변경</h2>
            <p>본 약관은 법령·정책 변경에 따라 수정될 수 있으며, 변경 시 시행 <strong className="text-gray-800">7일 전</strong>에 서비스 내 공지 페이지를 통해 고지합니다.</p>
            <p className="text-gray-400 text-xs">변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴를 요청할 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">11. 문의</h2>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">서비스명:</span> Flo Aide</p>
              <p><span className="font-medium text-gray-700">담당자:</span> 운영자</p>
              <p><span className="font-medium text-gray-700">이메일:</span> ckj9001@gmail.com</p>
            </div>
          </section>

        </div>

        <div className="pb-8" />
      </main>
    </div>
  );
}
