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
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 4월 2일</p>
        </div>

        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 구독 서비스 환불 원칙</h2>
            <p>Flo.Aide의 구독 서비스는 결제 즉시 서비스 이용이 개시되며, 결제 완료 후에는 해당 구독 기간(1개월)에 대한 환불이 불가합니다.</p>
            <p>디지털 콘텐츠 및 SaaS 서비스 특성상 결제 후 서비스 이용이 시작된 경우, 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라 청약 철회가 제한될 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 환불 불가 사유</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>결제 후 구독 기간이 시작된 경우 (월 단위 구독)</li>
              <li>서비스를 실제로 이용한 경우</li>
              <li>단순 변심 또는 서비스 이용 의사 변경</li>
              <li>회원 본인의 귀책사유로 서비스 이용이 불가능해진 경우</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 환불 가능한 경우</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>서비스 측 귀책사유로 7일 이상 서비스가 정상 제공되지 않은 경우</li>
              <li>결제는 완료되었으나 서비스 이용이 전혀 개시되지 않은 경우</li>
              <li>중복 결제 등 명백한 오류가 발생한 경우</li>
            </ul>
            <p>위 사유에 해당하는 경우 이메일(<span className="text-gray-800">floaide.team@gmail.com</span>)로 문의해 주시면 확인 후 처리해 드립니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 구독 해지</h2>
            <p>구독은 언제든지 해지할 수 있으며, 해지 시 현재 결제된 구독 기간이 만료될 때까지 서비스를 이용할 수 있습니다. 해지 후 잔여 기간에 대한 환불은 제공되지 않습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 문의</h2>
            <p>환불 관련 문의는 아래 이메일로 접수해 주세요.</p>
            <ul className="space-y-1">
              <li>이메일: <span className="text-gray-800">floaide.team@gmail.com</span></li>
              <li>운영 시간: 평일 10:00 ~ 18:00 (공휴일 제외)</li>
            </ul>
          </section>

        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-5 pb-12">
        <FloAideFooter />
      </footer>
    </div>
  );
}
