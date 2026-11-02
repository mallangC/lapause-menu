import type { Metadata } from "next";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

export const metadata: Metadata = {
  alternates: { canonical: "/refund/subscription" },
};

export default function SubscriptionRefundPage() {
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
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Subscription Refund Policy</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">구독 환불 정책</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 11월 1일</p>
          <p className="text-sm text-gray-500 mt-3">Flo.Aide 월간·연간 플랜을 구독하는 매장(사장님)께 적용되는 정책입니다.</p>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600 leading-relaxed">
          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 무료 체험 기간</h2>
            <p>최초 구독 등록 시 30일간 무료 체험이 제공됩니다. 무료 체험 기간 중에는 요금이 청구되지 않으며, 체험 종료 전에 구독을 해지하면 비용이 발생하지 않습니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 구독 결제 환불 원칙</h2>
            <p>「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제1항에 따라 소비자는 결제일로부터 7일 이내에 청약을 철회할 수 있습니다.</p>
            <p>단, 구독 신청 시 서비스 이용이 즉시 개시됨을 고지하고 소비자가 동의한 경우, 동법 제17조 제2항 제5호에 따라 결제 완료 후 청약 철회가 제한됩니다. 회원은 구독 신청 화면에서 이 조건에 명시적으로 동의한 것으로 간주됩니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 월간 플랜 환불</h2>
            <p>월간 플랜은 결제 후 서비스 이용이 즉시 개시되므로 원칙적으로 환불이 제한됩니다.</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>서비스 측 귀책사유가 확인된 경우 전액 환불 처리됩니다.</li>
              <li>이 외 환불은 운영팀의 판단에 따라 처리됩니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 연간 플랜 환불</h2>
            <p>연간 플랜은 아래 기준에 따라 부분환불 또는 전액환불이 가능합니다.</p>
            <div className="bg-beige-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-700 text-[13px]">부분환불 계산 방식</p>
              <p className="text-[13px]">환불액 = 실제 결제한 연간 금액 − 사용 개월수 × ₩18,900</p>
              <p className="text-xs text-gray-400">· 실제 결제 금액은 정가 ₩159,000이며, 할인 코드를 적용해 결제했다면 할인된 금액입니다.</p>
              <p className="text-xs text-gray-400">· 사용 개월수는 결제일로부터 올림 계산합니다. (예: 3개월 1일 이용 시 → 4개월로 산정)</p>
              <p className="text-xs text-gray-400">· 공제 금액은 할인이 적용되지 않은 월간 정가(₩18,900)를 기준으로 합니다.</p>
              <p className="text-xs text-gray-400">· 공제 금액이 실제 결제 금액 이상이면(정가 결제 시 9개월째부터) 환불액은 0원이며 추가로 청구되지 않습니다.</p>
            </div>
            <div className="bg-beige-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-gray-700 text-[13px]">전액환불</p>
              <p className="text-xs text-gray-400">서비스 측 귀책사유로 7일 이상 정상 서비스가 제공되지 않은 경우, 또는 중복 결제 등 명백한 오류가 확인된 경우에 한해 전액환불이 가능합니다.</p>
            </div>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 구독 해지</h2>
            <p>구독은 언제든지 해지할 수 있으며, 해지 후에도 현재 결제된 구독 기간 만료일까지 서비스를 이용할 수 있습니다. 잔여 기간에 대한 환불은 위 항목의 환불 조건에 해당하는 경우에만 가능합니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 환불 불가 사유</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>구독 기간이 시작된 이후 단순 변심</li>
              <li>서비스를 실제로 이용한 경우 (부분환불 조건 해당 시 제외)</li>
              <li>회원 본인의 귀책사유로 서비스 이용이 불가능해진 경우</li>
            </ul>
          </section>

          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. 환불 신청 방법</h2>
            <p>구독 환불은 아래 구독 문의 채널로 신청해주세요. 매장명과 환불 사유를 함께 알려주시면 위 기준에 따라 확인 후 처리해 드립니다.</p>
            <p className="text-xs text-gray-400">환불이 완료되면 구독이 해지되며, 결제 수단에 따라 카드사 취소 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.</p>
          </section>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600">
          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">구독 문의</h2>
            <ul className="space-y-1">
              <li>카카오 채널: <a href="http://pf.kakao.com/_yHXlX" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline underline-offset-2 hover:text-gold-600 transition-colors">카카오 채널 바로가기</a></li>
              <li>이메일: <span className="text-gray-800">floaide.team@gmail.com</span></li>
              <li>운영 시간: 평일 10:00 ~ 18:00 (공휴일 제외)</li>
            </ul>
          </section>
        </div>

        <p className="text-xs text-gray-400 text-center">
          꽃 주문 고객님은 <Link href="/refund" className="underline underline-offset-2 hover:text-gray-600">주문 환불 정책</Link>을 확인해주세요.
        </p>
      </main>

      <footer className="max-w-3xl mx-auto px-5 pb-12">
        <FloAideFooter />
      </footer>
    </div>
  );
}
