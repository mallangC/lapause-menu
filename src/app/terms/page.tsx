import type { Metadata } from "next";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";
import { PLATFORM_FEE_PERCENT_LABEL } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Terms of Service</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">서비스 이용약관</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 10월 12일</p>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600 leading-relaxed">

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 서비스 소개</h2>
            <p>Flo.Aide(이하 "서비스")는 꽃집 사업자(이하 "회원")를 위한 메뉴 관리 및 예약 운영 서비스입니다. 본 약관은 서비스 운영자(이하 "운영자")와 회원 간의 이용 조건을 정하며, 회원이 서비스를 통해 상품을 판매하는 경우 구매자와의 거래에도 일부 적용됩니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 통신판매중개자로서의 지위</h2>
            <p>운영자는 「전자상거래 등에서의 소비자보호에 관한 법률」에 따른 통신판매중개자로서 회원과 구매자 간의 거래를 위한 시스템을 제공할 뿐 거래의 당사자가 아닙니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>상품의 품질, 배송, 교환, 환불 등 거래에 관한 책임은 해당 상품을 판매한 회원에게 있습니다.</li>
              <li>상품의 가격 및 판매 조건은 회원이 직접 정하며, 운영자는 가격 결정에 관여하지 않습니다.</li>
              <li>구매자와 회원 간 분쟁이 발생한 경우 원칙적으로 당사자 간에 해결해야 하며, 운영자는 거래 당사자가 아닌 중개자로서 협조합니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 이용 계약 체결</h2>
            <p>회원은 회원가입 또는 운영자로부터 계정을 발급받고 최초 로그인(계정 활성화)함으로써 본 약관에 동의한 것으로 간주합니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>회원가입을 통해 계정이 등록되거나 운영자의 승인 후 계정이 발급됩니다.</li>
              <li>계정은 1개 사업장에 한해 사용 가능하며 타인에게 양도할 수 없습니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 이용 요금 및 결제</h2>
            <p>서비스는 월간 또는 연간 구독 방식으로 제공되며 요금은 아래와 같습니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p><span className="font-medium text-gray-700">월간 구독:</span> 월 18,900원 (매월 자동 결제)</p>
              <p><span className="font-medium text-gray-700">연간 구독:</span> 월 13,250원 상당(월간 대비 약 30% 할인), 연 159,000원 (1년 단위 자동 결제)</p>
              <p><span className="font-medium text-gray-700">무료 체험:</span> 최초 가입 회원에 한해 30일간 무료로 이용할 수 있습니다.</p>
            </div>
            <p>구독은 등록된 결제수단으로 매 결제 주기마다 자동 갱신되며 회원은 요금제 탭에서 언제든지 해지할 수 있습니다. 해지 시 현재 결제 주기가 끝나는 시점까지 서비스를 이용할 수 있습니다.</p>
            <p className="text-gray-400 text-xs">요금 정책이 변경될 경우 변경 전 최소 7일 전에 고지합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 판매 수수료 및 정산</h2>
            <p>회원이 서비스를 통해 상품을 판매하는 경우 구매자의 결제는 토스페이먼츠 등 전자결제대행사(PG사)를 통해 처리되며 운영자는 결제 정보를 직접 수집·보관하지 않습니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p><span className="font-medium text-gray-700">수수료율:</span> 결제 금액의 {PLATFORM_FEE_PERCENT_LABEL} (카드 수수료, 부가세 포함)</p>
              <p><span className="font-medium text-gray-700">정산 주기:</span> 매주 수요일 정산 (수요일이 공휴일인 경우 다음 영업일)</p>
              <p><span className="font-medium text-gray-700">정산 대상:</span> 결제일로부터 영업일 기준 4일이 지나고 예약이 완료 처리된 건</p>
            </div>
            <p className="text-gray-400 text-xs">수수료율이 변경되는 경우 변경 전 최소 7일 전에 고지합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 환불 정책</h2>
            <p>구독 결제는 결제 즉시 서비스 이용이 시작되므로 환불이 불가합니다.</p>
            <p className="text-gray-400 text-xs">회원이 판매한 상품에 대한 구매자의 환불은 해당 회원이 책임지고 처리합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. 회원의 의무</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>계정 및 비밀번호는 본인이 직접 관리해야 하며 타인과 공유할 수 없습니다.</li>
              <li>서비스를 통해 수집한 고객 개인정보는 관련 법령에 따라 적법하게 처리해야 합니다.</li>
              <li>입점 판매자는 관련 법령(전자상거래법 등)에 따른 통신판매업 신고 등 필요한 자격을 갖추어야 하며 미신고로 인한 불이익은 판매자 본인에게 있습니다.</li>
              <li>판매하는 상품의 정보, 가격, 재고를 정확하게 등록·관리해야 합니다.</li>
              <li>구매자로부터 접수된 주문·예약은 신의에 따라 성실히 이행해야 합니다.</li>
              <li>서비스를 이용하여 불법적인 행위를 해서는 안 됩니다.</li>
              <li>서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">8. 운영자의 데이터 활용</h2>
            <p>운영자는 서비스 개선 및 운영 목적으로 회원의 거래 통계 데이터(예약 건수, 매출 규모 등)를 수집·분석할 수 있습니다.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500 pl-2">
              <li>수집된 데이터는 서비스 품질 개선에만 활용됩니다.</li>
              <li>특정 회원을 식별할 수 있는 형태로 외부에 제공하지 않습니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">9. 서비스 데이터 보관</h2>
            <p>회원의 예약 및 거래 데이터는 서비스 이용 기간 동안 보관되며 탈퇴 후에도 전자상거래법 등 관계 법령에 따라 최대 <strong className="text-gray-800">5년</strong>간 보관될 수 있습니다.</p>
            <p className="text-gray-400 text-xs">보관 기간 내 데이터 삭제를 원하시면 운영자에게 문의하시기 바랍니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">10. 서비스 중단 및 종료</h2>
            <p>운영자는 서비스를 중단하거나 종료할 경우 최소 <strong className="text-gray-800">30일 전</strong>에 회원에게 공지합니다.</p>
            <p>시스템 점검, 장애 등 불가피한 사유로 일시 중단될 수 있으며 이 경우 사전 또는 사후에 공지합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">11. 책임의 제한</h2>
            <p>운영자는 천재지변, 네트워크 장애 등 불가항력적인 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
            <p>회원이 서비스를 통해 수집·관리하는 고객 개인정보의 처리에 대한 법적 책임은 해당 회원에게 있습니다.</p>
            <p>운영자는 통신판매중개자로서 회원이 등록한 상품 정보의 정확성이나 거래 이행 여부를 보증하지 않으며 이에 대한 책임은 해당 회원에게 있습니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">12. 약관 변경</h2>
            <p>본 약관은 법령·정책 변경에 따라 수정될 수 있으며 변경 시 시행 <strong className="text-gray-800">7일 전</strong>에 서비스 내 공지 페이지를 통해 고지합니다.</p>
            <p className="text-gray-400 text-xs">변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴를 요청할 수 있습니다.</p>
          </section>

          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">13. 문의</h2>
            <div className="bg-beige-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">서비스명:</span> Flo.Aide</p>
              <p><span className="font-medium text-gray-700">담당자:</span> 운영자</p>
              <p><span className="font-medium text-gray-700">이메일:</span> floaide.team@gmail.com</p>
            </div>
          </section>

        </div>

        <FloAideFooter />
      </main>
    </div>
  );
}
