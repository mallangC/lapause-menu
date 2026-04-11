import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

export default function GuidePage() {
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
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">How to Use</p>
          <h1 className="text-2xl font-light text-gray-900 mb-2">서비스 이용 안내</h1>
          <p className="text-sm text-gray-400">Flo.Aide를 통해 꽃 주문·예약을 이용하는 방법을 안내합니다.</p>
        </div>

        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-beige-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <h2 className="font-semibold text-gray-900 text-base">상품 둘러보기</h2>
            </div>
            <p>홈 화면에서 <strong className="text-gray-800">추천/인기</strong>, <strong className="text-gray-800">모든 상품</strong>, <strong className="text-gray-800">시즌</strong> 카테고리를 눌러 매장의 상품을 확인할 수 있습니다. <br/>상품을 누르면 상세 정보(가격, 이미지 등)를 볼 수 있고 해당 상품을 바로 예약할 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-beige-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <h2 className="font-semibold text-gray-900 text-base">맞춤 주문 신청</h2>
            </div>
            <p>홈 화면의 <strong className="text-gray-800">맞춤 주문하기</strong>를 누르면 원하는 꽃 상품을 직접 구성해 주문 신청할 수 있습니다.</p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-500">
              <li>상품 유형 선택 (꽃다발, 꽃바구니, 화분 등)</li>
              <li>예산, 분위기, 용도, 받는 분 정보 입력</li>
              <li>메시지 카드·쇼핑백 옵션 선택</li>
              <li>픽업 또는 배송 날짜 지정</li>
              <li>주문자 이름·연락처 입력 후 결제</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-beige-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <h2 className="font-semibold text-gray-900 text-base">매장 확인 및 예약 확정</h2>
            </div>
            <p>주문 신청 후 매장에서 내용을 확인합니다. 예약이 확정되면 카카오 알림톡으로 안내 메시지가 발송됩니다.</p>
            <p className="text-gray-400 text-xs">※ 매장 운영 시간에 따라 확인까지 시간이 소요될 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-beige-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">4</span>
              <h2 className="font-semibold text-gray-900 text-base">결제</h2>
            </div>
            <p>예약 확정 후 카드 결제를 진행하면 결제가 완료됩니다. 결제 완료 후 매장에서 제작을 시작합니다.</p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-500">
              <li>결제 수단: 신용카드 · 체크카드</li>
              <li>결제 완료 후 예약이 최종 확정됩니다</li>
              <li>매장 상황에 따라 결제 완료 후에도 예약이 취소될 수 있습니다</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-beige-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0">5</span>
              <h2 className="font-semibold text-gray-900 text-base">픽업 또는 배송</h2>
            </div>
            <p>예약 시 지정한 날짜에 매장을 방문해 픽업하거나, 배송 신청의 경우 지정 주소로 배송됩니다.</p>
            <p className="text-gray-400 text-xs">※ 배송 가능 여부 및 배송비는 매장 정책에 따라 다를 수 있습니다.</p>
          </section>

          <section className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3 text-sm text-gray-600">
            <h2 className="font-semibold text-gray-900 text-base">문의</h2>
            <p>이용 중 문의사항은 아래로 접수해 주세요.</p>
            <ul className="space-y-1">
              <li>카카오 채널: <a href="http://pf.kakao.com/_yHXlX" target="_blank" rel="noopener noreferrer" className="text-gray-800 underline underline-offset-2 hover:text-gold-600 transition-colors">카카오 채널 바로가기</a></li>
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
