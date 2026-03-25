import Link from "next/link";

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-beige-100">

      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-base font-normal tracking-widest text-gold-500">Flo Aide</span>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
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
            <strong className="text-gray-700 font-medium">로고 또는 회사 이름을 클릭</strong>하면 관리자 로그인으로 이동합니다.
          </p>

          <div className="space-y-3">

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">1</span>
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
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">2</span>
                <h3 className="font-medium text-gray-900 text-sm">예약 관리</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["달력 뷰", "월별 달력으로 날짜별 예약 건수를 한눈에 확인할 수 있습니다. 날짜를 클릭하면 해당 일의 예약만 필터링됩니다. 미확인 예약이 있는 날짜에는 빨간 점이 표시되어 놓친 예약을 바로 알아볼 수 있습니다."],
                  ["미확인 상태", "고객이 직접 신청한 예약은 '미확인' 상태로 접수됩니다. 달력의 빨간 점을 보고 확인 후 '준비중'으로 변경하면 점이 사라집니다. 관리자가 직접 추가한 예약은 바로 '준비중'으로 등록됩니다."],
                  ["예약 직접 추가", "관리자가 직접 예약을 등록할 수 있습니다. 네이버 예약 텍스트를 붙여넣으면 정보를 자동으로 파싱합니다."],
                  ["상태 관리", "미확인, 준비중, 제작완료, 픽업배송완료, 취소 다섯 단계로 예약 상태를 관리합니다."],
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
                <h3 className="font-medium text-gray-900 text-sm">회사 정보</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["로고 · 상호명", "헤더에 표시될 로고를 업로드합니다. 로고가 없으면 상호명이 텍스트로 표시됩니다."],
                  ["채널 URL", "네이버, 카카오, 인스타그램, 유튜브 URL을 등록하면 홈 화면에 버튼이 자동으로 나타납니다."],
                  // ["알림 이메일", "고객이 상담 예약을 제출하면 알림 이메일로 알림이 발송됩니다. 기본적으로 로그인 계정 이메일로 자동 발송됩니다. 다른 이메일로 받고 싶을 때만 입력하세요."],
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
                <h3 className="font-medium text-gray-900 text-sm">예약 설정</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["맞춤 주문 활성화", "켜면 손님 메뉴 화면에 '맞춤 주문하기' 버튼이 홈 화면과 메인화면 헤더에 노출되고 통계 탭이 활성화됩니다."],
                  ["영업시간 설정", "요일별 영업시간을 설정하면 예약 폼에서 영업일만 선택 가능합니다."],
                  ["휴무일 설정", "특정 날짜를 휴무일로 지정하면 해당 날짜는 예약할 수 없습니다."],
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
                <h3 className="font-medium text-gray-900 text-sm">설정</h3>
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
                ["관리자 로그인", "메뉴 URL 뒤에 /admin 을 붙여 접속한 뒤 이메일과 비밀번호로 로그인합니다."],
                ["회사 정보 입력", "회사 정보 탭에서 상호명, 로고를 등록하고 채널 URL과 알림 이메일을 입력합니다."],
                ["상품 등록", "상품 관리 탭에서 판매 중인 상품을 추가합니다."],
                ["설정 구성", "설정 탭에서 홈 화면 이미지, 메뉴 필터, 사이트 색상을 취향에 맞게 조정합니다."],
                ["맞춤 주문 기능 활성화 (선택)", "예약 설정 탭에서 맞춤 주문 기능을 켜고 영업시간을 설정합니다."],
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
                <span className="text-xs font-semibold text-gold-500 tracking-widest">2025.03</span>
              </div>
              <ul className="px-6 py-4 space-y-3">
                {[
                  { date: "03.24", text: "예약 관리 — 미확인 상태 추가, 달력에서 미확인 예약 날짜 빨간 점 표시", isNew: true },
                  { date: "03.24", text: "통계 — 신규/재방문 고객 비율 추가", isNew: true },
                  { date: "03.24", text: "홈 화면 이미지 — 맞춤 주문하기 버튼 배경 이미지 설정 추가", isNew: true },
                  { date: "03.24", text: "예약자 이름 클릭 시 고객 프로필 모달 — 최근 주문 3건·메모 작성·수정", isNew: true },
                  { date: "03.24", text: "고객 프로필 기능 추가 — 전화번호 기준 자동 생성, 신규(NEW) 뱃지 표시", isNew: true },
                  { date: "03.24", text: "최초 가입 시 담당자 이름·연락처 입력 단계 추가", isNew: true },
                  { date: "03.23", text: "서비스 이름 Flo Aide 확정", isNew: false },
                  { date: "03.23", text: "통계 탭 추가 — 월별 매출, 채널별·수령방법·상품유형 차트", isNew: false },
                  { date: "03.23", text: "탭 구조 개편 — 홈화면·메뉴설정을 설정 탭으로 통합", isNew: false },
                  { date: "03.22", text: "고객 예약 시 관리자 이메일 알림 발송", isNew: false },
                  { date: "03.22", text: "상품 추가·예약 폼 UX 개선 — 가격 콤마 표시, 2열 레이아웃", isNew: false },
                  { date: "03.21", text: "상품 분위기 필드 추가 — 4가지 스타일 선택", isNew: false },
                  { date: "03.21", text: "메뉴 상단 '맞춤 주문하기' 버튼 추가 (맞춤 주문 기능 활성화 시)", isNew: false },
                  { date: "03.20", text: "예약 관리 달력 뷰 추가 — 일별 예약 건수 표시 및 날짜 필터", isNew: false },
                  { date: "03.20", text: "예약 직접 추가 — 네이버 예약 텍스트 자동 파싱 지원", isNew: false },
                  { date: "03.19", text: "예약 채널 관리 추가 — 네이버, 카카오, 워크인 구분", isNew: false },
                  { date: "03.18", text: "예약 관리 탭 추가 — 상태·배송비·메모·결제 관리", isNew: false },
                  { date: "03.12", text: "메뉴 설정 탭 추가 — 상품 유형·시즌 필터 항목 숨김", isNew: false },
                  { date: "03.07", text: "인스타그램, 유튜브 채널 버튼 추가", isNew: false },
                  { date: "03.07", text: "관리자 상품 목록 필터 추가 — 유형·뱃지·상태별 필터링", isNew: false },
                  { date: "03.06", text: "상품 상태 기능 추가 — 활성·비활성·품절 전환", isNew: false },
                  { date: "03.05", text: "홈 화면 채널 연결 버튼 추가 (네이버·카카오·인스타·유튜브)", isNew: false },
                  { date: "03.04", text: "서비스 최초 출시 — 상품 관리 CRUD, 필터, 시즌, 테마 색상", isNew: false },
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
          </div>
        </section>

        <div className="pb-8" />
      </main>
    </div>
  );
}
