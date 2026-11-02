import type { Metadata } from "next";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

export const metadata: Metadata = {
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
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
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Refund Policy</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">주문 환불 정책</h1>
          <p className="text-sm text-gray-400">최종 업데이트: 2026년 11월 1일</p>
          <p className="text-sm text-gray-500 mt-3">Flo.Aide 입점 꽃집에서 꽃을 주문·예약하고 결제한 고객님께 적용되는 정책입니다.</p>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600 leading-relaxed">
          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. 주문 취소 및 환불</h2>
            <p>Flo.Aide를 통한 상품 주문·맞춤 주문·예약 결제의 취소와 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 해당 매장의 정책을 따릅니다.</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>예약일 7일 전까지 취소: 전액 환불</li>
              <li>예약일 7일 이내 취소: 꽃 사입·제작 준비가 시작되므로 환불이 제한될 수 있습니다. (매장 정책에 따름)</li>
              <li>맞춤 제작 상품은 주문 시 &lsquo;제작 착수 후 취소·환불 불가&rsquo; 조건에 동의한 경우, 동법 제17조 제2항에 따라 청약 철회가 제한됩니다.</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. 단순 변심 반품(청약 철회) 불가</h2>
            <p>생화·식물은 신선도와 생육 상태에 영향을 받는 상품이므로, 단순 변심에 의한 교환 및 반품(청약 철회)이 불가합니다. (「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제2호)</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. 상품 하자·오배송</h2>
            <p>상품이 파손된 상태로 도착했거나 주문 내역과 다른 상품을 받은 경우, 수령 당일 사진을 찍어 주문한 매장에 알려주세요. 매장에서 확인 후 재제작·재배송 또는 환불해 드립니다.</p>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. 반품·교환 불가 사유</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>고객이 사용하거나 훼손한 경우</li>
              <li>포장 훼손 등으로 상품 가치가 떨어진 경우</li>
              <li>시간이 지나 재판매가 어려운 경우 (생화 등 신선 상품 특성상)</li>
              <li>고객 요청에 따라 별도로 제작된 맞춤 제작 상품</li>
            </ul>
          </section>

          <section className="p-6 border-b border-beige-100 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. 취소·환불 신청 방법</h2>
            <ul className="list-disc list-inside space-y-1.5">
              <li>주문한 매장에 직접 연락해 취소를 요청해주세요. 매장 연락처는 매장 메뉴판 페이지에서 확인할 수 있습니다.</li>
              <li>매장에서 주문을 취소하면 카드 결제는 결제하신 수단으로 자동 취소되며, 취소 안내 메시지가 발송됩니다.</li>
              <li>카드사 취소 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.</li>
              <li>계좌이체 등 카드 외 결제는 매장이 직접 환불해 드립니다.</li>
            </ul>
          </section>

          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. 판매 책임</h2>
            <p>상품의 제작·배송·교환·환불에 관한 책임은 상품을 판매한 매장에 있습니다. 매장과 연락이 닿지 않는 등 환불 처리에 어려움이 있으면 아래 Flo.Aide 고객 문의로 알려주세요. 매장에 전달해 처리를 돕겠습니다.</p>
          </section>
        </div>

        <div className="bg-white border-t border-b border-beige-200 text-sm text-gray-600">
          <section className="p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">Flo.Aide 고객 문의</h2>
            <ul className="space-y-1">
              <li>카카오 채널: <a href="http://pf.kakao.com/_yHXlX" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline underline-offset-2 hover:text-gold-600 transition-colors">카카오 채널 바로가기</a></li>
              <li>이메일: <span className="text-gray-800">floaide.team@gmail.com</span></li>
              <li>운영 시간: 평일 10:00 ~ 18:00 (공휴일 제외)</li>
            </ul>
          </section>
        </div>

        <p className="text-xs text-gray-400 text-center">
          꽃집 사장님이신가요? <Link href="/refund/subscription" className="underline underline-offset-2 hover:text-gray-600">구독 환불 정책</Link>을 확인해주세요.
        </p>
      </main>

      <footer className="max-w-3xl mx-auto px-5 pb-12">
        <FloAideFooter />
      </footer>
    </div>
  );
}
