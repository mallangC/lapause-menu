import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 홈
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Privacy Policy</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 11월 2일</p>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600 leading-relaxed">

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 수집하는 개인정보 항목 및 수집 방법</h2>
            <p className="font-medium text-gray-800">가. 손님(주문자)</p>
            <p>맞춤 주문·상품 결제 신청 시 아래 항목을 직접 수집합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>이름</li>
              <li>휴대폰 번호</li>
              <li>배송 주소 (배송 선택 시)</li>
              <li>주문 내용 (상품 유형, 예산, 수령 일시 등)</li>
            </ul>
            <p className="font-medium text-gray-800 pt-2">나. 사장님(회원)</p>
            <p>회원 가입과 매장 운영, 판매 신청 시 아래 항목을 수집합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>회원 가입·로그인: 이메일, 비밀번호(암호화 저장), 이름, 휴대폰 번호</li>
              <li>소셜 로그인(Google·카카오) 이용 시: 해당 서비스에서 제공받는 이메일, 이름</li>
              <li>매장 정보: 상호, 매장 주소, 매장 전화번호, 매장 링크 및 SNS 주소</li>
              <li>판매 신청·정산: 사업자등록번호, 사업자등록증, 정산 계좌(은행·계좌번호·예금주), 통장사본, 통신판매업 신고번호</li>
              <li>서비스 이용 중 자동 생성: 로그인 2단계 인증 기기 정보, 서비스 이용 기록</li>
            </ul>
            <p className="text-gray-400 text-xs">카드번호 등 결제 상세 정보는 전자결제대행사(PG사)가 직접 처리하며 당사는 이를 수집·보관하지 않습니다. 구독 자동결제를 위해 PG사가 발급한 결제 키만 보관합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 개인정보 수집 및 이용 목적</h2>
            <p className="font-medium text-gray-800">가. 손님(주문자)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>맞춤 주문 접수 및 처리</li>
              <li>주문 관련 연락 및 확인</li>
              <li>예약 확정·취소 등 주문 진행 상황 안내 (카카오 알림톡 또는 문자)</li>
              <li>배송 처리 (배송 선택 시)</li>
              <li>결제 및 정산 처리</li>
            </ul>
            <p className="font-medium text-gray-800 pt-2">나. 사장님(회원)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>회원 가입, 본인 확인 및 로그인 (2단계 인증 인증번호 이메일 발송 포함)</li>
              <li>매장 메뉴판·예약·주문 관리 서비스 제공</li>
              <li>판매 신청 심사(사업자 확인) 및 판매 대금 정산</li>
              <li>구독 결제·환불 처리 및 관련 안내 (이메일)</li>
              <li>새 예약 접수 등 매장 운영 알림 (카카오 알림톡 또는 문자)</li>
              <li>약관·개인정보처리방침 변경, 서비스 장애 등 필수 공지</li>
            </ul>
            <p className="text-gray-400 text-xs">위 안내는 서비스 이용에 필요한 정보이며, 광고성 정보는 별도 동의 없이 보내지 않습니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 통신판매중개자로서의 역할</h2>
            <p>Flo.Aide는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 통신판매중개자로서, 입점한 각 꽃집(이하 "판매자")과 구매자 간 거래를 위한 시스템을 제공합니다.</p>
            <p>판매자는 Flo.Aide와 독립된 사업자이며 구매자가 입력한 개인정보는 주문 처리를 위해 해당 판매자에게 전달됩니다. 판매자가 전달받은 개인정보를 관리·처리하는 과정에 대한 책임은 해당 판매자에게 있습니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 개인정보 보유 및 이용 기간</h2>
            <p>「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 아래 기간 동안 보관 후 파기합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>계약 또는 청약철회, 대금결제 및 재화 공급에 관한 기록: 5년</li>
              <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
            </ul>
            <p className="text-gray-400 text-xs">그 외 관계 법령에 보존 의무가 없는 정보는 주문 완료 후 1년 이내 파기합니다.</p>
            <p className="text-gray-400 text-xs">사장님(회원) 정보는 회원 탈퇴 시까지 보관하며, 탈퇴 후에는 관계 법령에 따라 보관해야 하는 정보를 제외하고 지체 없이 파기합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 개인정보 파기 절차 및 방법</h2>
            <p>보유 기간이 경과한 개인정보는 지체 없이 아래 방법으로 파기합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>전자적 파일: 복구 불가능한 방법으로 영구 삭제</li>
              <li>출력물 등 기록물: 파쇄 또는 소각</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 개인정보의 제3자 제공</h2>
            <p>수집한 개인정보는 아래와 같이 주문 처리에 필요한 범위에서만 제3자에게 제공됩니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-2">
              <p><span className="font-medium text-gray-700">제공받는 자:</span> 주문·예약을 접수한 꽃집(판매자) · <span className="font-medium text-gray-700">제공 항목:</span> 이름, 연락처, 주문 내용, 배송 주소(배송 선택 시) · <span className="font-medium text-gray-700">제공 목적:</span> 주문 확인 및 처리</p>
              <p><span className="font-medium text-gray-700">제공받는 자:</span> 배송업체 · <span className="font-medium text-gray-700">제공 항목:</span> 이름, 연락처, 배송 주소 · <span className="font-medium text-gray-700">제공 목적:</span> 배송 처리 (배송 선택 시에 한함)</p>
              <p><span className="font-medium text-gray-700">제공받는 자:</span> 국세청 (공공데이터포털 사업자등록정보 진위확인 서비스) · <span className="font-medium text-gray-700">제공 항목:</span> 사업자등록번호 · <span className="font-medium text-gray-700">제공 목적:</span> 판매 신청 시 사업자 상태 확인</p>
            </div>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. 개인정보 처리 위탁</h2>
            <p>원활한 서비스 운영을 위해 아래와 같이 개인정보 처리를 위탁합니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-2">
              <p><span className="font-medium text-gray-700">수탁업체:</span> Supabase Inc. · <span className="font-medium text-gray-700">위탁 업무:</span> 데이터베이스 저장 및 관리</p>
              <p><span className="font-medium text-gray-700">수탁업체:</span> 토스페이먼츠 · <span className="font-medium text-gray-700">위탁 업무:</span> 결제 처리 및 정산</p>
              <p><span className="font-medium text-gray-700">수탁업체:</span> 솔라피(누리고 주식회사) · <span className="font-medium text-gray-700">위탁 업무:</span> 카카오 알림톡·문자 메시지 발송</p>
              <p><span className="font-medium text-gray-700">수탁업체:</span> Resend, Inc. · <span className="font-medium text-gray-700">위탁 업무:</span> 이메일 발송 (로그인 인증번호, 결제·환불 안내)</p>
            </div>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">8. 정보주체의 권리 및 행사 방법</h2>
            <p>손님과 사장님(회원)은 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>개인정보 열람 요청</li>
              <li>개인정보 정정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p>손님은 각 꽃집 담당자에게 직접 연락하시거나 아래 개인정보 보호책임자에게 이메일로 문의하시기 바랍니다. 사장님(회원)은 관리자 화면의 &lsquo;내 정보&rsquo;·&lsquo;매장 정보&rsquo;에서 직접 확인·수정하거나 개인정보 보호책임자에게 문의할 수 있습니다. 요청 접수 후 <strong className="text-gray-800">10일 이내</strong> 처리합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">9. 개인정보 보호책임자</h2>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">서비스명:</span> Flo.Aide</p>
              <p><span className="font-medium text-gray-700">담당자:</span> 최경재</p>
              <p><span className="font-medium text-gray-700">이메일:</span> floaide.team@gmail.com</p>
            </div>
          </section>

          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">10. 개인정보처리방침 변경</h2>
            <p>본 방침은 법령·정책 변경에 따라 수정될 수 있으며 변경 시 본 페이지를 통해 공지합니다.</p>
          </section>

        </div>

        <div className="pb-8" />
      </main>
    </div>
  );
}
