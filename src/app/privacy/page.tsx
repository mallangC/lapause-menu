import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-beige-100">
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-base font-normal tracking-widest text-gold-500">Flo.Aide</span>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 홈
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Privacy Policy</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 3월 24일</p>
        </div>

        <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 수집하는 개인정보 항목 및 수집 방법</h2>
            <p>맞춤 주문 신청 폼을 통해 직접 아래 항목을 수집합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>이름</li>
              <li>휴대폰 번호</li>
              <li>배송 주소 (배송 선택 시)</li>
              <li>주문 내용 (상품 유형, 예산, 수령 일시 등)</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>맞춤 주문 접수 및 처리</li>
              <li>주문 관련 연락 및 확인</li>
              <li>배송 처리 (배송 선택 시)</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 개인정보 보유 및 이용 기간</h2>
            <p>주문 완료 후 <strong className="text-gray-800">1년</strong>간 보관 후 파기합니다.</p>
            <p className="text-gray-400 text-xs">단, 관계 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 개인정보 파기 절차 및 방법</h2>
            <p>보유 기간이 경과한 개인정보는 지체 없이 아래 방법으로 파기합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
              <li>출력물 등 기록물: 파쇄 또는 소각</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 개인정보의 제3자 제공</h2>
            <p>수집한 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 다만, 배송 처리를 위해 배송업체에 수령자 정보(이름, 연락처, 주소)가 제공될 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 개인정보 처리 위탁</h2>
            <p>원활한 서비스 운영을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">수탁업체:</span> Supabase Inc.</p>
              <p><span className="font-medium text-gray-700">위탁 업무:</span> 데이터베이스 저장 및 관리</p>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. 정보주체의 권리 및 행사 방법</h2>
            <p>고객은 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>개인정보 열람 요청</li>
              <li>개인정보 정정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p>요청은 각 꽃집 담당자에게 직접 연락하시거나 아래 개인정보 보호책임자에게 이메일로 문의하시기 바랍니다. 요청 접수 후 <strong className="text-gray-800">10일 이내</strong> 처리합니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">8. 개인정보 보호책임자</h2>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">서비스명:</span> Flo.Aide</p>
              <p><span className="font-medium text-gray-700">담당자:</span> 운영자</p>
              <p><span className="font-medium text-gray-700">이메일:</span> ckj9001@gmail.com</p>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">9. 개인정보처리방침 변경</h2>
            <p>본 방침은 법령·정책 변경에 따라 수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.</p>
          </section>

        </div>

        <div className="pb-8" />
      </main>
    </div>
  );
}
