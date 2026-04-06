import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-beige-100">

      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 로그인
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <div className="bg-white border-b border-beige-200">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-4">Guide</p>
          <h1 className="text-3xl font-light text-gray-900 mb-4 leading-snug">
            꽃집을 위한<br />전자 메뉴 · 상담 예약 서비스
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
            앱 설치 없이 링크 하나로 손님에게 상품을 보여주고,<br />
            상담 예약부터 주문 관리·매출 통계까지 한 곳에서 처리할 수 있습니다.
          </p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-16">

        {/* 손님 화면 */}
        <section>
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">For Customers</p>
            <h2 className="text-xl font-medium text-gray-900">손님 메뉴 화면</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "홈 화면",
                desc: "접속 시 가장 먼저 보이는 화면. 추천/인기, 모든 상품, 시즌 세 가지 버튼이 있고 각 버튼에 배경 이미지를 설정할 수 있습니다.",
              },
              {
                title: "메인 화면 — 상품 필터",
                desc: "상품 유형, 꽃 색상, 포장지 색상으로 원하는 상품을 빠르게 찾을 수 있습니다. PC에서는 호버 드롭다운, 모바일에서는 하단 필터 패널로 동작합니다.",
              },
              {
                title: "맞춤 주문하기",
                desc: "예약 기능이 활성화된 경우 메뉴 상단에 '맞춤 주문하기' 버튼이 노출됩니다. 손님이 직접 예약 폼을 작성해 제출하면 관리자에게 이메일로 알림이 전송됩니다.",
              },
              {
                title: "채널 연결 버튼",
                desc: "홈 화면 하단에 네이버, 카카오, 인스타그램, 유튜브 버튼을 노출할 수 있습니다. URL이 등록된 채널만 자동으로 표시됩니다.",
              },
              {
                title: "자동 복귀",
                desc: "메인 화면에서 일정 시간 조작이 없으면 자동으로 홈 화면으로 돌아옵니다. 매장 태블릿·키오스크 용도에 적합합니다.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-beige-200">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 관리자 기능 */}
        <section>
          <div className="mb-3">
            <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">For Admin</p>
            <h2 className="text-xl font-medium text-gray-900">관리자 기능</h2>
          </div>
          <p className="text-sm text-gray-500 mb-8">
            메뉴 URL 뒤에{" "}
            <code className="bg-beige-200 px-1.5 py-0.5 rounded text-xs text-gray-700">/admin</code>
            을 붙이거나, 메뉴 화면 상단의{" "}
            <strong className="text-gray-700 font-medium">로고 또는 매장 이름을 클릭</strong>하면 관리자 로그인으로 이동합니다.
          </p>

          <div className="space-y-3">

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">1</span>
                <h3 className="font-medium text-gray-900 text-sm">예약 관리</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["달력 뷰", "월별 달력으로 날짜별 예약 건수를 한눈에 확인할 수 있습니다. 날짜를 클릭하면 해당 일의 예약만 필터링됩니다. 미확인 예약이 있는 날짜에는 빨간 점이 표시되어 놓친 예약을 바로 알아볼 수 있습니다."],
                  ["미확인 상태", "고객이 직접 신청한 예약은 '미확인' 상태로 접수됩니다. 달력의 빨간 점을 보고 확인 후 '준비중'으로 변경하면 점이 사라집니다. 관리자가 직접 추가한 예약은 바로 '준비중'으로 등록됩니다."],
                  ["상태 변경 알림", "미확인 → 준비중으로 변경 시 고객에게 카카오 예약 확정 알림이 발송됩니다. 미확인 → 취소 시 취소 알림이 발송됩니다. 고객이 주문 시 카카오 알림 동의를 한 경우에만 발송됩니다."],
                  ["예약 직접 추가", "관리자가 직접 예약을 등록할 수 있습니다. 네이버 예약 텍스트를 붙여넣으면 정보를 자동으로 파싱합니다. 직접 추가한 예약은 알림이 발송되지 않습니다."],
                  ["상태 관리", "미확인, 준비중, 제작완료, 픽업배송완료, 취소 다섯 단계로 예약 상태를 관리합니다. 취소된 예약은 상태를 변경할 수 없습니다."],
                  ["채널 표시", "네이버, 카카오, 워크인 채널을 색상 뱃지로 구분해 표시합니다."],
                  ["배송비 관리", "배송 주문의 경우 배송비를 입력하면 최종 가격에 자동 반영됩니다."],
                  ["관리자 메모", "상품 제작 시 참고할 메모를 예약별로 저장할 수 있습니다."],
                  ["결제 상태", "미결제 / 결제완료를 클릭 한 번으로 전환할 수 있습니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">2</span>
                <h3 className="font-medium text-gray-900 text-sm">상품 관리</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["상품 추가", "상품명, 가격, 이미지, 유형, 분위기, 뱃지, 꽃 색상, 포장지 색상, 시즌, 상태를 입력해 등록합니다. 이미지는 자동 압축 처리됩니다."],
                  ["분위기", "깔끔한 화이트&그린, 화사한 파스텔톤, 선명한 비비드톤, 차분한 딥컬러 중 선택할 수 있습니다. 상담 예약 시 고객 선호와 매칭하는 데 활용됩니다."],
                  ["상품 수정 / 삭제", "목록에서 수정·삭제 버튼으로 즉시 변경할 수 있습니다."],
                  ["상태 변경", "상태 뱃지를 클릭하면 활성 → 비활성 → 품절 순으로 전환됩니다. 비활성·품절 상품은 손님 화면에 표시되지 않습니다."],
                  ["뱃지", "인기 또는 추천 뱃지를 지정하면 손님 화면의 추천/인기 탭에 모아서 표시됩니다."],
                  ["시즌 상품", "시즌을 지정한 상품은 시즌 탭에만 표시되며, 모든 상품 탭에는 나오지 않습니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">3</span>
                <h3 className="font-medium text-gray-900 text-sm">통계 <span className="text-xs font-normal text-gray-400 ml-1">맞춤 주문 기능 활성화 시</span></h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["이번 달 요약", "총 매출, 예약 건수, 평균 단가를 카드 형태로 확인합니다."],
                  ["월별 매출 추이", "최근 6개월 매출을 바 차트로 시각화합니다."],
                  ["채널별 비율", "네이버, 카카오, 워크인 채널 비율을 도넛 차트로 확인합니다."],
                  ["수령 방법", "픽업과 배송 비율을 확인합니다."],
                  ["상품 유형 순위", "가장 많이 주문된 상품 유형을 건수 기준으로 순위를 보여줍니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">4</span>
                <h3 className="font-medium text-gray-900 text-sm">매장 정보</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["로고 · 상호명", "헤더에 표시될 로고를 업로드합니다. 로고가 없으면 상호명이 텍스트로 표시됩니다."],
                  ["채널 URL", "매장 위치 URL, 카카오 채널, 인스타그램, 유튜브 URL을 등록하면 홈 화면에 버튼이 자동으로 나타납니다."],
                  ["매장 주소", "주소 찾기 버튼을 눌러 도로명 주소를 검색합니다. 배송 거리 계산 및 카카오 알림톡에 활용됩니다."],
                  ["매장 전화번호", "고객에게 발송되는 카카오 알림톡의 발신 번호로 표시됩니다."],
                  ["계좌 정보", "고객이 맞춤 주문 후 계좌이체로 결제할 수 있도록 은행, 계좌번호, 예금주를 입력합니다."],
                  ["예약 알림 정보", "매장 전화번호, 매장 주소, 은행, 계좌번호, 예금주 5개 항목을 모두 입력해야 맞춤 주문을 활성화할 수 있습니다. 맞춤 주문이 활성화된 상태에서는 수정이 불가합니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">5</span>
                <h3 className="font-medium text-gray-900 text-sm">영업 설정</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["당일 예약 시간", "상품 형태(꽃다발, 바구니 등)별로 당일 예약 가능한 최소 시간을 설정합니다. 예: 3으로 설정하면 현재 시각 기준 3시간 이후부터 예약 가능합니다. 기본값은 2시간입니다."],
                  ["요일별 영업시간", "요일별 영업시간을 설정하면 예약 폼에서 영업 시간대만 선택 가능합니다."],
                  ["특정 휴무일", "공휴일, 임시 휴무일 등 특정 날짜를 지정하면 해당 날짜는 예약할 수 없습니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">6</span>
                <h3 className="font-medium text-gray-900 text-sm">맞춤 주문</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["맞춤 주문 활성화", "켜면 손님 메뉴 화면에 '맞춤 주문하기' 버튼이 노출되고 통계 탭이 활성화됩니다. 매장 정보 탭의 예약 알림 정보 5개 항목을 모두 입력해야 활성화할 수 있습니다."],
                  ["메시지 카드", "활성화하면 맞춤 주문 폼에 메시지 카드 옵션이 표시됩니다. 추가 금액을 설정하면 최종 가격에 반영됩니다."],
                  ["쇼핑백", "활성화하면 맞춤 주문 폼에 쇼핑백 옵션이 표시됩니다. 추가 금액을 설정할 수 있습니다."],
                  ["배송 기능", "활성화하면 맞춤 주문 폼에 배송 선택이 노출됩니다. 1km 이내 배송비를 먼저 설정해야 활성화할 수 있습니다. 배송은 당일 예약이 불가합니다."],
                  ["배송비 설정", "거리별 배송비를 6구간(1km 이내 / 1~3km / 3~5km / 5~10km / 10~15km / 15~20km)으로 설정합니다. 1km 이내는 필수이며, 나머지 구간은 비워두면 해당 거리의 고객에게 '매장 문의' 안내가 표시됩니다. 20km 초과도 동일하게 매장 문의로 안내됩니다."],
                  ["예약 확인 문구", "고객이 예약을 완료하기 직전 확인 화면 상단에 표시할 안내 문구를 입력합니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">7</span>
                <h3 className="font-medium text-gray-900 text-sm">디자인</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["홈 화면 이미지", "추천/인기, 모든 상품, 시즌 버튼에 배경 이미지를 각각 업로드할 수 있습니다. 이미지가 없으면 텍스트만 표시됩니다."],
                  ["메뉴 설정", "특정 상품 유형이나 시즌을 손님 화면 필터에서 숨길 수 있습니다."],
                  ["사이트 색상", "메뉴 화면의 배경색과 포인트 색상을 가게 분위기에 맞게 변경할 수 있습니다."],
                ].map(([label, desc]) => (
                  <div key={label} className="flex gap-3">
                    <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* 시작 가이드 */}
        <section>
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Quick Start</p>
            <h2 className="text-xl font-medium text-gray-900">처음 시작하는 방법</h2>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-4 bottom-4 w-px bg-beige-200" />
            <ol className="space-y-6">
              {[
                ["로그인", "이메일과 비밀번호로 로그인합니다."],
                ["매장 정보 입력", "로그인 시 나오는 팝업에서 상호명, 로고를 등록하고 채널 URL을 입력합니다."],
                ["상품 등록", "상품 관리 탭에서 판매 할 상품을 추가합니다."],
                ["디자인 구성", "디자인 탭에서 홈 화면 이미지, 메뉴 필터, 사이트 색상을 취향에 맞게 조정합니다."],
                ["맞춤 주문 활성화 (선택)", "매장 정보 탭에서 전화번호·주소·계좌 정보를 입력한 뒤, 맞춤 주문 탭에서 기능을 켭니다. 배송을 제공하려면 영업 설정에서 배송비도 설정합니다."],
                ["링크 공유", "메뉴 URL을 SNS, 카카오톡, 네이버 스마트플레이스 등에 공유합니다."],
              ].map(([title, desc], i) => (
                <li key={title} className="flex gap-5 relative">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-white border-2 border-gold-400 text-gold-500 flex items-center justify-center text-xs font-semibold z-10">
                    {i + 1}
                  </span>
                  <div className="pt-0.5 pb-2">
                    <p className="font-medium text-gray-800 text-sm mb-0.5">{title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 업데이트 로그 */}
        <section>
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Changelog</p>
            <h2 className="text-xl font-medium text-gray-900">업데이트 내역</h2>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-3 border-b border-beige-100">
                <span className="text-xs font-semibold text-gold-500 tracking-widest">2026.04</span>
              </div>
              <ul className="px-6 py-4 space-y-3">
                {[
                  { date: "04.04", text: "관리자 탭 구조 개편 — 기존 매장 정보·예약 설정·설정을 매장 정보·영업 설정·맞춤 주문·디자인 4개 탭으로 분리", isNew: true },
                  { date: "04.04", text: "배송 기능 추가 — 배송 활성화 토글, 거리별(6구간) 배송비 설정, 고객 주문 시 직선거리 자동 계산 및 배송비 자동 반영", isNew: true },
                  { date: "04.04", text: "배송 제한 — 당일 배송 예약 불가, 20km 초과 또는 미설정 구간은 매장 문의 안내", isNew: true },
                  { date: "04.04", text: "매장 주소 찾기 — 주소 직접 입력 대신 다음 우편번호 검색으로 변경", isNew: true },
                  { date: "04.04", text: "금액·전화번호 자동 포맷 — 금액 입력 시 콤마(,) 자동 삽입, 전화번호 입력 시 대시(-) 자동 삽입. DB 저장 시 숫자만 저장", isNew: true },
                  { date: "04.04", text: "상품 등록 한도 — 매장별 최대 100개 제한, 초과 시 경고 모달 표시", isNew: true },
                  { date: "04.04", text: "저장 버튼 UX 개선 — 매장 정보·영업 설정·맞춤 주문 탭 저장 버튼 하단 고정, 저장 성공 시 인라인 메시지 표시 후 3초 후 자동 사라짐", isNew: true },
                ].map(({ date, text, isNew }) => (
                  <li key={text} className="flex items-start gap-2 text-xs leading-relaxed">
                    <span className="text-gray-300 shrink-0 w-10 pt-0.5">{date}</span>
                    {isNew && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gold-500 text-white leading-none mt-0.5">NEW</span>
                    )}
                    <span className="text-gray-500">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <details className="bg-white rounded-2xl border border-beige-200 overflow-hidden group">
              <summary className="flex items-center justify-between px-6 py-3 cursor-pointer list-none">
                <span className="text-xs font-semibold text-gold-500 tracking-widest">2025.03</span>
                <svg className="w-4 h-4 text-gray-300 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                </svg>
              </summary>
              <ul className="px-6 py-4 space-y-3 border-t border-beige-100">
                {[
                  { date: "03.26", text: "내 정보 탭 추가 — 이메일·이름·전화번호 확인 및 비밀번호 변경" },
                  { date: "03.26", text: "매장 정보 — 매장 전화번호 입력 추가" },
                  { date: "03.26", text: "비밀번호 재설정 — 이메일 링크를 통한 비밀번호 변경 기능 추가" },
                  { date: "03.24", text: "예약 관리 — 미확인 상태 추가, 달력에서 미확인 예약 날짜 빨간 점 표시" },
                  { date: "03.24", text: "통계 — 신규/재방문 고객 비율 추가" },
                  { date: "03.24", text: "홈 화면 이미지 — 맞춤 주문하기 버튼 배경 이미지 설정 추가" },
                  { date: "03.24", text: "예약자 이름 클릭 시 고객 프로필 모달 — 최근 주문 3건·메모 작성·수정" },
                  { date: "03.24", text: "고객 프로필 기능 추가 — 전화번호 기준 자동 생성, 신규(NEW) 뱃지 표시" },
                  { date: "03.24", text: "최초 가입 시 이름·연락처 입력 단계 추가" },
                  { date: "03.23", text: "서비스 이름 Flo.Aide 확정" },
                  { date: "03.23", text: "통계 탭 추가 — 월별 매출, 채널별·수령방법·상품유형 차트" },
                  { date: "03.23", text: "탭 구조 개편 — 홈화면·메뉴설정을 설정 탭으로 통합" },
                  { date: "03.22", text: "고객 예약 시 관리자 이메일 알림 발송" },
                  { date: "03.22", text: "상품 추가·예약 폼 UX 개선 — 가격 콤마 표시, 2열 레이아웃" },
                  { date: "03.21", text: "상품 분위기 필드 추가 — 4가지 스타일 선택" },
                  { date: "03.21", text: "메뉴 상단 '맞춤 주문하기' 버튼 추가 (맞춤 주문 기능 활성화 시)" },
                  { date: "03.20", text: "예약 관리 달력 뷰 추가 — 일별 예약 건수 표시 및 날짜 필터" },
                  { date: "03.20", text: "예약 직접 추가 — 네이버 예약 텍스트 자동 파싱 지원" },
                  { date: "03.19", text: "예약 채널 관리 추가 — 네이버, 카카오, 워크인 구분" },
                  { date: "03.18", text: "예약 관리 탭 추가 — 상태·배송비·메모·결제 관리" },
                  { date: "03.12", text: "메뉴 설정 탭 추가 — 상품 유형·시즌 필터 항목 숨김" },
                  { date: "03.07", text: "인스타그램, 유튜브 채널 버튼 추가" },
                  { date: "03.07", text: "관리자 상품 목록 필터 추가 — 유형·뱃지·상태별 필터링" },
                  { date: "03.06", text: "상품 상태 기능 추가 — 활성·비활성·품절 전환" },
                  { date: "03.05", text: "홈 화면 채널 연결 버튼 추가 (네이버·카카오·인스타·유튜브)" },
                  { date: "03.04", text: "서비스 최초 출시 — 상품 관리 CRUD, 필터, 시즌, 테마 색상" },
                ].map(({ date, text }) => (
                  <li key={text} className="flex items-start gap-2 text-xs leading-relaxed">
                    <span className="text-gray-300 shrink-0 w-10 pt-0.5">{date}</span>
                    <span className="text-gray-500">{text}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </section>

        <FloAideFooter />
      </main>
    </div>
  );
}
