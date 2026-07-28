import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-beige-100">
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
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Refund Policy</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">환불 정책</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 7월 18일</p>
        </div>

        {/* 일반 소비자 (맞춤 주문·예약 결제) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-beige-200 text-gray-600">
              일반 고객
            </span>
            <span className="text-xs text-gray-400">꽃 주문·예약 결제 이용 시</span>
          </div>

          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">1. 주문 취소 및 환불</h2>
              <p>Flo.Aide를 통해 진행되는 맞춤 주문 및 예약 결제의 취소·환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 해당 매장의 정책을 따릅니다.</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>예약일 7일 전: 전액 환불</li>
                <li>예약일 3~6일 전: 일부 공제 후 환불 (매장 정책에 따름)</li>
                <li>예약일 1~2일 전: 50~90% 공제 후 환불 (매장 정책에 따름)</li>
                <li>예약 당일 취소: 환불 불가</li>
                <li>제작 시작 후: 소비자가 주문 시 맞춤 제작 취소 불가 조건에 동의한 경우, 동법 제17조 제2항에 따라 청약 철회가 제한됩니다.</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">2. 단순변심 반품 (청약철회)</h2>
              <p>「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제1항에 따라 상품 수령 후 7일 이내라면 별도의 이유 없이 반품을 요청할 수 있습니다.</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>상품 수령 후 7일 이내</li>
                <li>사용·훼손되지 않은 상태</li>
                <li>왕복 배송비는 소비자 부담</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">3. 교환·반품 (하자 또는 오배송)</h2>
              <p>아래 사유에 해당하는 경우 교환 또는 반품이 가능하며, 배송비는 판매자가 부담합니다.</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>불량·파손 제품</li>
                <li>주문과 다른 상품 배송</li>
                <li>광고·상품 설명과 다른 상품</li>
              </ul>
              <p className="text-gray-400 text-xs">접수 기한: 해당 사실을 안 날로부터 30일 이내 (또는 수령 후 3개월 이내)</p>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">4. 반품·교환 불가 사유</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>소비자가 사용하거나 훼손한 경우</li>
                <li>포장 훼손 등으로 상품 가치가 떨어진 경우</li>
                <li>시간이 지나 재판매가 어려운 경우 (생화 등 신선식품 특성상)</li>
                <li>맞춤 제작 상품 (소비자 요청에 따라 별도 제작된 경우)</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">5. 환불 문의</h2>
              <p>환불 문의는 해당 매장에 직접 연락해주세요.</p>
            </section>
          </div>
        </div>

        {/* 구독 회원 (월간 · 연간 플랜) */}
        <div>
          <div className="flex items-center gap-2 mb-3 mt-4">
            <span className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-gold-400/15 text-gold-600">
              구독 회원
            </span>
            <span className="text-xs text-gray-400">월간 · 연간 플랜 이용 시</span>
          </div>

          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">1. 무료 체험 기간</h2>
              <p>최초 구독 등록 시 30일간 무료 체험이 제공됩니다. 무료 체험 기간 중에는 요금이 청구되지 않으며, 체험 종료 전에 구독을 해지하면 비용이 발생하지 않습니다.</p>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">2. 구독 결제 환불 원칙</h2>
              <p>「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제1항에 따라 소비자는 결제일로부터 7일 이내에 청약을 철회할 수 있습니다.</p>
              <p>단, 구독 신청 시 서비스 이용이 즉시 개시됨을 고지하고 소비자가 동의한 경우, 동법 제17조 제2항 제5호에 따라 결제 완료 후 청약 철회가 제한됩니다. 회원은 구독 신청 화면에서 이 조건에 명시적으로 동의한 것으로 간주됩니다.</p>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">3. 월간 플랜 환불</h2>
              <p>월간 플랜은 결제 후 서비스 이용이 즉시 개시되므로 원칙적으로 환불이 제한됩니다.</p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>서비스 측 귀책사유가 확인된 경우 전액 환불 처리됩니다.</li>
                <li>이 외 환불은 운영팀의 판단에 따라 처리됩니다.</li>
              </ul>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">4. 연간 플랜 환불</h2>
              <p>연간 플랜은 아래 기준에 따라 부분환불 또는 전액환불이 가능합니다.</p>
              <div className="bg-beige-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-700 text-[13px]">부분환불 계산 방식</p>
                <p className="text-[13px]">환불액 = 연간 결제 금액(₩118,800) − 사용 개월수 × ₩14,900</p>
                <p className="text-xs text-gray-400">· 사용 개월수는 결제일로부터 올림 계산합니다. (예: 3개월 1일 이용 시 → 4개월로 산정)</p>
                <p className="text-xs text-gray-400">· 공제 금액은 할인이 적용되지 않은 월간 정가(₩14,900)를 기준으로 합니다.</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-700 text-[13px]">전액환불</p>
                <p className="text-xs text-gray-400">서비스 측 귀책사유로 7일 이상 정상 서비스가 제공되지 않은 경우, 또는 중복 결제 등 명백한 오류가 확인된 경우에 한해 전액환불이 가능합니다.</p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">5. 구독 해지</h2>
              <p>구독은 언제든지 해지할 수 있으며, 해지 후에도 현재 결제된 구독 기간 만료일까지 서비스를 이용할 수 있습니다. 잔여 기간에 대한 환불은 위 항목의 환불 조건에 해당하는 경우에만 가능합니다.</p>
            </section>

            <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 text-base">6. 환불 불가 사유</h2>
              <ul className="list-disc list-inside space-y-1.5">
                <li>구독 기간이 시작된 이후 단순 변심</li>
                <li>서비스를 실제로 이용한 경우 (부분환불 조건 해당 시 제외)</li>
                <li>회원 본인의 귀책사유로 서비스 이용이 불가능해진 경우</li>
              </ul>
            </section>
          </div>
        </div>

        {/* 공통 문의 */}
        <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3 text-sm text-gray-600">
          <h2 className="font-semibold text-gray-900 text-base">문의</h2>
          <p>환불 관련 문의는 아래로 접수해 주세요.</p>
          <ul className="space-y-1">
            <li>카카오 채널: <a href="http://pf.kakao.com/_yHXlX" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline underline-offset-2 hover:text-gold-600 transition-colors">카카오 채널 바로가기</a></li>
            <li>이메일: <span className="text-gray-800">floaide.team@gmail.com</span></li>
            <li>운영 시간: 평일 10:00 ~ 18:00 (공휴일 제외)</li>
          </ul>
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-5 pb-12">
        <FloAideFooter />
      </footer>
    </div>
  );
}
