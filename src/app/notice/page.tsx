import Link from "next/link";

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-beige-100">

      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-base font-normal tracking-widest text-gold-500">꽃메뉴</span>
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
            꽃집을 위한<br />온라인 메뉴 서비스
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
            앱 설치 없이 링크 하나로 손님에게 상품을 보여주고,<br />
            관리자 페이지에서 언제든지 메뉴를 관리할 수 있습니다.
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
                desc: "홈 화면에서 버튼을 누르면 메인 화면으로 진입합니다. 상품 유형, 꽃 색상, 포장지 색상으로 원하는 상품을 빠르게 찾을 수 있습니다.",
              },
              {
                title: "채널 연결 버튼",
                desc: "홈 화면 하단에 네이버 예약, 카카오 채널, 인스타그램 버튼을 원형 아이콘으로 표시할 수 있습니다. URL을 등록한 채널만 자동으로 노출됩니다.",
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
            <strong className="text-gray-700 font-medium">로고 또는 회사 이름을 탭</strong>하면 관리자 로그인으로 이동합니다.
          </p>

          <div className="space-y-3">

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">1</span>
                <h3 className="font-medium text-gray-900 text-sm">상품 관리</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["상품 추가", "상품명, 가격, 이미지, 유형, 뱃지, 색상, 시즌, 상태를 입력해 등록합니다. 이미지는 자동 압축 처리됩니다."],
                  ["상품 수정 / 삭제", "목록에서 수정·삭제 버튼으로 즉시 변경할 수 있습니다."],
                  ["상태 변경", "상태 뱃지를 클릭하면 활성 → 비활성 → 품절 순으로 전환됩니다. 비활성·품절 상품은 손님 화면에 표시되지 않습니다."],
                  ["뱃지", "인기 상품 또는 추천 상품 뱃지를 지정하면 손님 화면의 추천/인기 탭에 모아서 표시됩니다."],
                  ["시즌 상품", "시즌을 지정한 상품은 시즌 탭에만 표시되며, 모든 상품 탭에는 나오지 않습니다."],
                  ["목록 필터", "유형, 뱃지(추천·인기·없음), 상태(활성·비활성)로 상품을 필터링할 수 있습니다. 필터는 조합해서 사용할 수 있습니다."],
                  ["페이지 이동", "상품 목록은 10개씩 페이지로 나뉘며 이전·다음 버튼으로 이동합니다."],
                  ["가격 정렬", "가격 열의 화살표를 눌러 오름차순·내림차순으로 정렬할 수 있습니다."],
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
                <h3 className="font-medium text-gray-900 text-sm">홈 화면</h3>
              </div>
              <p className="px-6 py-4 text-xs text-gray-500 leading-relaxed">
                추천/인기, 모든 상품, 시즌 버튼에 배경 이미지를 각각 업로드할 수 있습니다. 이미지를 등록하지 않으면 텍스트만 표시되는 기본 디자인으로 보입니다.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-beige-100">
                <span className="w-6 h-6 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold shrink-0">3</span>
                <h3 className="font-medium text-gray-900 text-sm">회사 정보</h3>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  ["로고", "헤더에 표시될 로고 이미지를 업로드합니다. 없으면 회사 이름이 텍스트로 표시됩니다."],
                  ["회사 이름", "로고가 없을 때 헤더에 표시되는 상호명입니다."],
                  ["네이버 예약 URL", "입력하면 홈 화면에 네이버 예약 버튼이 나타납니다."],
                  ["카카오 채널 URL", "입력하면 홈 화면에 카카오 채널 버튼이 나타납니다."],
                  ["인스타그램 URL", "입력하면 홈 화면에 인스타그램 버튼이 나타납니다."],
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
                <h3 className="font-medium text-gray-900 text-sm">설정 — 테마 색상</h3>
              </div>
              <p className="px-6 py-4 text-xs text-gray-500 leading-relaxed">
                메뉴 화면의 배경색과 포인트 색상을 변경할 수 있습니다. 가게 분위기에 맞게 커스터마이징하세요.
              </p>
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
                ["회사 정보 입력", "회사 정보 탭에서 상호명, 로고를 등록하고 채널 URL을 입력합니다."],
                ["홈 화면 이미지 설정", "홈 화면 탭에서 각 버튼에 배경 이미지를 업로드합니다."],
                ["상품 등록", "상품 관리 탭에서 판매 중인 상품을 추가합니다."],
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
                  { date: "03.07", text: "인스타그램 채널 버튼 추가", isNew: true },
                  { date: "03.07", text: "관리자 상품 목록 필터 추가 — 유형·뱃지·상태별 필터링", isNew: true },
                  { date: "03.07", text: "관리자 상품 목록 페이지 이동 추가 — 10개씩 이전/다음", isNew: true },
                  { date: "03.06", text: "상품 상태 기능 추가 — 활성·비활성·품절 전환", isNew: false },
                  { date: "03.06", text: "관리자 상품 추가·수정 모달 팝업 방식으로 변경", isNew: false },
                  { date: "03.05", text: "홈 화면 네이버 예약·카카오 채널 연결 버튼 추가", isNew: false },
                  { date: "03.05", text: "관리자 가격 오름차순·내림차순 정렬 기능 추가", isNew: false },
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
