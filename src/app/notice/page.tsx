"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";
import Image from "next/image";

type NavItem = { id: string; label: string };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "시작하기",
    items: [
      { id: "intro", label: "서비스 소개" },
      { id: "quickstart", label: "처음 시작하는 방법" },
    ],
  },
  {
    group: "손님 화면",
    items: [
      { id: "customer-home", label: "홈 화면" },
      { id: "customer-filter", label: "상품 필터" },
      { id: "customer-order", label: "맞춤 주문하기" },
      { id: "customer-etc", label: "채널 연결" },
    ],
  },
  {
    group: "판매 시작하기",
    items: [
      { id: "sales-apply", label: "1. 판매 신청" },
      { id: "sales-review", label: "2. 운영자 검토" },
      { id: "sales-activate", label: "3. 판매 설정 활성화" },
      { id: "sales-mailorder", label: "통신판매업 신고 안내" },
    ],
  },
  {
    group: "관리자 기능",
    items: [
      { id: "admin-reservations", label: "예약 관리" },
      { id: "admin-payment-flow", label: "결제 처리 흐름" },
      { id: "admin-products", label: "상품 관리" },
      { id: "admin-stats", label: "통계" },
      { id: "admin-company", label: "매장 정보" },
      { id: "admin-business", label: "영업 설정" },
      { id: "admin-design", label: "디자인" },
    ],
  },
  {
    group: "",
    items: [{ id: "changelog", label: "업데이트 내역" }],
  },
];

const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

function Fig({ src, mobileSrc, alt }: { src?: string; mobileSrc?: string; alt: string }) {
  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-beige-300 bg-beige-50 h-40 flex items-center justify-center">
        <span className="text-xs text-gray-300">스크린샷 준비 중</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-beige-200 overflow-hidden bg-white">
      <picture>
        {mobileSrc && <source media="(max-width: 640px)" srcSet={mobileSrc} />}
        <img src={src} alt={alt} className="w-full object-cover object-top" loading="lazy" />
      </picture>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 w-7 h-7 rounded-full bg-gold-500 text-white flex items-center justify-center text-xs font-semibold">
        {n}
      </span>
      <div className="flex-1 min-w-0 pb-1">
        <p className="font-medium text-gray-900 text-sm mb-1.5">{title}</p>
        <div className="text-sm text-gray-500 leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  );
}

function FieldList({ items }: { items: [string, string][] }) {
  return (
    <div className="space-y-3">
      {items.map(([label, desc]) => (
        <div key={label} className="flex gap-3">
          <span className="shrink-0 text-xs font-medium text-gold-600 w-24 pt-0.5">{label}</span>
          <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">{desc}</p>
        </div>
      ))}
    </div>
  );
}

interface FlowStepData {
  title: string;
  color: string; // 관리자 화면 상태 뱃지와 동일한 색
  detail: string;
  note?: string; // 카카오 알림톡 등 분기 이벤트
}

function FlowDiagram({ steps }: { steps: FlowStepData[] }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0 ${s.color}`}>
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="w-px flex-1 bg-beige-300 my-1" />}
          </div>
          <div className={`flex-1 min-w-0 ${i < steps.length - 1 ? "pb-4" : ""}`}>
            <p className="text-sm font-medium text-gray-900">{s.title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.detail}</p>
            {s.note && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-700 bg-gold-50 border border-dashed border-gold-300 rounded-full px-2.5 py-1">
                💬 {s.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Callout({ tone, title, children, className }: { tone: "amber" | "red"; title: string; children: React.ReactNode; className?: string }) {
  const styles = tone === "amber"
    ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-red-50 border-red-200 text-red-700";
  return (
    <div className={`rounded-xl border p-4 text-sm ${styles} ${className ?? ""}`}>
      <p className="font-semibold mb-1">{title}</p>
      <div className="text-xs leading-relaxed opacity-90 space-y-1">{children}</div>
    </div>
  );
}

export default function NoticePage() {
  const [activeId, setActiveId] = useState(ALL_IDS[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const clickScrollRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickScrollRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
          setActiveId(topMost.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => {
    setActiveId(id);
    setMobileMenuOpen(false);
    clickScrollRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => { clickScrollRef.current = false; }, 700);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
          <Link href="/login" className="hidden md:inline-flex text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 로그인
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="메뉴 열기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── 모바일 메뉴 딤 ── */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── 모바일 메뉴 드로어 (오른쪽에서 슬라이드) ── */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-full bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-beige-200 shrink-0">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-700 transition-colors" aria-label="메뉴 닫기">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((g, gi) => (
            <div key={gi} className="mb-2">
              {g.group && (
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase px-4 pt-3 pb-1">{g.group}</p>
              )}
              {g.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    activeId === item.id ? "bg-gold-50 text-gold-600" : "text-gray-700 hover:bg-beige-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
          <div className="mx-4 my-2 border-t border-beige-100" />
          <Link
            href="/login"
            className="block px-4 py-3 rounded-xl text-base font-medium text-gray-400 hover:bg-beige-50 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            ← 로그인
          </Link>
        </nav>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-10 flex gap-10">

        {/* 좌측 사이드 네비게이션 */}
        <aside className="hidden md:block w-52 shrink-0 pr-6 border-r border-beige-200">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-6">
            {NAV.map((g, gi) => (
              <div key={gi}>
                {g.group && (
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-2 px-2.5">{g.group}</p>
                )}
                <div className="space-y-0.5">
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`block w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                        activeId === item.id
                          ? "bg-gold-50 text-gold-600 font-medium"
                          : "text-gray-500 hover:text-gray-800 hover:bg-beige-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* 콘텐츠 */}
        <main className="flex-1 min-w-0 max-w-2xl space-y-20">

          {/* 서비스 소개 */}
          <section id="intro" className="scroll-mt-24 space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Introduction</p>
              <h2 className="text-xl font-medium text-gray-900">서비스 소개</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Flo.Aide는 꽃집 사장님이 링크 하나로 공유할 수 있는 예쁜 전자 메뉴판을 만들어, 매장을 홍보하고 바로 판매까지 이어갈 수 있게 해주는 서비스입니다.
              손님은 앱 설치 없이 매장 링크(<code className="bg-beige-200 px-1.5 py-0.5 rounded text-xs text-gray-700">flo-aide.com/매장주소</code>) 하나로 상품을 둘러보고 맞춤 주문을 신청할 수 있습니다.
              사장님은 관리자 페이지에서 상품·예약·정산까지 한 곳에서 처리할 수 있습니다.
            </p>
            <Fig src="/notice/intro.jpg" alt="전자 메뉴판 화면" />
          </section>

          {/* 처음 시작하는 방법 */}
          <section id="quickstart" className="scroll-mt-24 space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Quick Start</p>
              <h2 className="text-xl font-medium text-gray-900">처음 시작하는 방법</h2>
            </div>
            <div className="space-y-5">
              <Step n={1} title="회원가입">회원 가입 후 로그인합니다.</Step>
              <Step n={2} title="매장 정보 입력">로그인 시 나오는 팝업에서 상호명, 로고를 등록하고 채널 URL을 입력합니다.</Step>
              <Step n={3} title="상품 등록">상품 관리 탭에서 판매할 상품을 추가합니다.</Step>
              <Step n={4} title="디자인 구성">디자인 탭에서 홈 화면 이미지, 메뉴 필터, 사이트 색상을 취향에 맞게 조정합니다.</Step>
              <Step n={5} title="판매 신청 (선택)">
                <p>예약 주문을 받으려면 판매 신청이 필요합니다. 자세한 절차는 <button onClick={() => handleNavClick("sales-apply")} className="text-gold-600 underline hover:text-gold-700">판매 시작하기</button> 섹션을 참고하세요.</p>
              </Step>
              <Step n={6} title="링크 공유">메뉴 URL을 SNS, 카카오톡, 네이버 스마트플레이스 등에 공유합니다.</Step>
            </div>
          </section>

          {/* 손님 화면 - 홈 */}
          <section id="customer-home" className="scroll-mt-24 space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">For Customers</p>
              <h2 className="text-xl font-medium text-gray-900">홈 화면</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              접속 시 가장 먼저 보이는 화면입니다. 추천/인기, 모든 상품, 시즌 세 가지 버튼이 있고 각 버튼에 배경 이미지를 설정할 수 있습니다.
              하단에는 이용 안내·환불 정책·이용약관 링크가 표시됩니다.
            </p>
            <Fig src="/landing/cap-menu.webp" mobileSrc="/landing/cap-menu-m.webp" alt="홈 화면" />
          </section>

          {/* 손님 화면 - 필터 */}
          <section id="customer-filter" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">상품 필터</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              상품 유형, 색상, 포장지 색상으로 원하는 상품을 빠르게 찾을 수 있습니다. PC는 호버 드롭다운으로 동작하고 모바일은 하단 필터 패널로 동작합니다.
            </p>
          </section>

          {/* 손님 화면 - 맞춤 주문 */}
          <section id="customer-order" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">맞춤 주문하기</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              판매 기능이 활성화된 경우 메뉴 상단에 &lsquo;맞춤 주문하기&rsquo; 버튼이 노출됩니다. 손님이 직접 예약 폼을 작성해 제출하면 관리자에게 알림이 전송됩니다.
            </p>
            <Fig src="/notice/consult.jpg" alt="맞춤 주문 화면" />
          </section>

          {/* 손님 화면 - 채널 연결 */}
          <section id="customer-etc" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">채널 연결</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              홈 화면 하단에 네이버, 카카오, 인스타그램, 유튜브 버튼을 노출할 수 있습니다. URL이 등록된 채널만 자동으로 표시됩니다.
            </p>
          </section>

          {/* 판매 시작하기 - 1. 판매 신청 */}
          <section id="sales-apply" className="scroll-mt-24 space-y-5">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Start Selling</p>
              <h2 className="text-xl font-medium text-gray-900">1. 판매 신청</h2>
              <p className="text-sm text-gray-500 leading-relaxed mt-2">
                맞춤 주문(판매) 기능은 승인이 필요한 기능입니다. 관리자 페이지 <span className="text-gray-700 font-medium">판매 신청</span> 탭에서
                아래 정보를 모두 입력·업로드해야 신청할 수 있습니다.
              </p>
            </div>
            <div className="space-y-5">
              <Step n={1} title="예약 알림 정보 입력">
                <p>매장 전화번호, 매장 주소, 은행·계좌번호·예금주를 입력합니다. 카카오 알림톡 발송과 정산 이체에 사용됩니다.</p>
              </Step>
              <Step n={2} title="통장사본 업로드">
                <p>정산 계좌를 확인하고 오이체 사고를 방지하기 위해 필요합니다. 업로드된 파일은 암호화된 비공개 저장소에 보관됩니다.</p>
              </Step>
              <Step n={3} title="사업자등록번호 인증">
                <p>사업자등록번호 입력 후 &lsquo;인증&rsquo; 버튼을 누르면 국세청에서 유효한 사업자인지 조회합니다. 정상 영업 중인 계속사업자만 등록 가능합니다.</p>
              </Step>
              <Step n={4} title="사업자등록증 업로드">
                <p>사업자 본인 확인을 위해 사진 또는 PDF로 업로드합니다.</p>
              </Step>
              <Step n={5} title="통신판매업 신고번호 (선택)">
                <p>온라인으로 상품을 판매하는 경우 신고가 필요합니다. 없어도 신청은 가능하지만 미신고 상태로 상품 50개를 판매하면 판매가 자동 정지됩니다. 자세한 내용은 아래 <button onClick={() => handleNavClick("sales-mailorder")} className="text-gold-600 underline hover:text-gold-700">통신판매업 신고 안내</button>를 참고하세요.</p>
              </Step>
            </div>
            <p className="text-sm text-gray-500">위 항목을 모두 채우면 <span className="text-gray-700 font-medium">&lsquo;맞춤 주문 신청하기&rsquo;</span> 버튼이 활성화됩니다.</p>
          </section>

          {/* 판매 시작하기 - 2. 운영자 검토 */}
          <section id="sales-review" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">2. 운영자 검토</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              신청하면 상태가 <span className="text-yellow-600 font-medium">검토 중</span>으로 바뀝니다. 운영자가 제출된 사업자등록증·통장사본·인증 정보를 직접 확인한 뒤 승인 또는 반려 처리합니다.
              반려된 경우 사유가 함께 표시되며 판매 신청 탭에서 내용을 보완해 다시 신청할 수 있습니다.
            </p>
          </section>

          {/* 판매 시작하기 - 3. 판매 설정 활성화 */}
          <section id="sales-activate" className="scroll-mt-24 space-y-5">
            <h2 className="text-xl font-medium text-gray-900">3. 판매 설정 활성화</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              승인이 완료되면 <span className="text-gray-700 font-medium">판매 설정</span> 탭에서 판매 기능을 켤 수 있습니다. 토글을 켜는 순간 손님 화면에 &lsquo;맞춤 주문하기&rsquo; 버튼이 노출되고 상품을 선택해 예약이 가능해지며 통계 탭이 활성화됩니다.
            </p>
            <FieldList
              items={[
                ["판매 기능", "토글을 켜면 손님이 상품을 주문할 수 있는 기능이 활성화됩니다."],
                ["메시지 카드", "활성화하면 주문 폼에 메시지 카드 옵션이 표시됩니다. 추가 금액을 설정하면 최종 가격에 반영됩니다."],
                ["쇼핑백", "활성화하면 주문 폼에 쇼핑백 옵션이 표시됩니다. 추가 금액을 설정할 수 있습니다."],
                ["배송 기능", "1km 이내 배송비를 먼저 설정해야 활성화할 수 있습니다. 배송은 당일 예약이 불가합니다."],
                ["배송비 설정", "거리별 배송비를 6구간(1km 이내 / 1~3km / 3~5km / 5~10km / 10~15km / 15~20km)으로 설정합니다. 1km 이내는 필수이며 나머지 구간을 비워두면 해당 거리는 '매장 문의'로 안내됩니다."],
                ["예약 확인 문구", "고객이 예약을 완료하기 직전 확인 화면 상단에 표시할 안내 문구를 입력합니다. 손님이 이 문구를 필수로 확인하도록 동의 체크박스에 체크해야만 주문이 가능하게 되어 있습니다."],
              ]}
            />
            <Fig src="/info.png" alt="안내 문구 표시 위치 예시" />
            <p className="text-sm text-gray-500 leading-relaxed">
              손님이 맞춤 주문이나 상품 상세에서 배송을 선택하면, 매장 주소와 배송받을 주소 사이의 거리를 자동으로 계산해 그 거리가 속한 구간의 배송비(판매 설정에서 입력한 금액)를 최종 가격에 반영합니다. 거리 계산은 실시간 퀵서비스 요금 조회가 아니라, 사장님이 미리 설정해둔 6개 구간별 고정 금액 중 해당 구간 값을 그대로 적용하는 방식입니다.
            </p>
            <Callout tone="amber" title="배송비 책정 팁">
              <p>카카오퀵 등 퀵서비스 앱에서 매장 주소를 기준으로 구간별(1~3km, 3~5km 등) 예상 요금을 미리 조회해보고, 그 구간에서 나올 수 있는 최대 금액으로 설정해두는 걸 추천합니다. 이 시스템은 퀵서비스 API와 실시간으로 연동되는 게 아니라 설정해둔 고정 금액을 그대로 적용하기 때문에, 최대 금액 기준으로 설정해두면 실제 배송 비용이 예상보다 높게 나와도 손해를 보지 않습니다.</p>
            </Callout>
          </section>

          {/* 판매 시작하기 - 통신판매업 신고 안내 */}
          <section id="sales-mailorder" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">통신판매업 신고 안내</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              온라인으로 상품을 50개 이상 판매하려면 관할 구청에 통신판매업 신고가 필요합니다. 판매 신청 탭에서 신고번호를 입력해두면 이 제한 없이 계속 판매할 수 있습니다.
            </p>
            <Callout tone="red" title="통신판매업 미신고 시 50개 판매 제한">
              <p>신고번호를 등록하지 않은 매장은 결제완료 건 기준 누적 판매 수량이 50개에 도달하면 판매 기능이 자동으로 꺼집니다. 판매 신청 탭과 대시보드 상단에서 현재 판매 수량을 &lsquo;n/50&rsquo; 형태로 확인할 수 있으며 정지된 이후에는 신고번호를 등록해야 다시 판매를 켤 수 있습니다.</p>
            </Callout>
            <Callout tone="amber" title="신고 절차 (구매안전서비스 이용확인증 발급 후 신청)">
              <p>통신판매업 신고에는 &lsquo;구매안전서비스 이용확인증&rsquo;이 필요합니다. 아래 순서로 발급받아 신청하세요.</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>
                  <a
                    href="https://obiz.kbstar.com/quics?page=obiz&QViewPC=Y#loading"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-600 underline hover:text-gold-700"
                  >
                    국민은행 기업인터넷뱅킹
                  </a>
                  에서 사업자로 가입 후 로그인
                </li>
                <li>에스크로이체 판매자 신청 진행</li>
                <li>신청 완료 후 &lsquo;구매안전서비스 이용확인증&rsquo; 발급</li>
                <li>발급받은 확인증으로{" "}
                  <a
                    href="https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=11300000006"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-600 underline hover:text-gold-700"
                  >
                    정부24
                  </a>
                  {" "}에서 통신판매업 신고</li>
              </ol>
            </Callout>
          </section>

          {/* 관리자 기능 - 예약 관리 */}
          <section id="admin-reservations" className="scroll-mt-24 space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">For Admin</p>
              <h2 className="text-xl font-medium text-gray-900">예약 관리</h2>
            </div>
            <Fig src="/landing/cap-reservation.webp" mobileSrc="/landing/cap-reservation-m.webp" alt="예약 관리 화면" />
            <FieldList
              items={[
                ["월별 보기", "상단 ‹ › 버튼으로 월을 이동하며 해당 월의 예약만 모아 볼 수 있습니다. 이번 달을 보는 중에는 '지난 예약 보기' 토글로 이미 지난 날짜의 예약도 확인할 수 있습니다."],
                ["미확인 상태", "고객이 직접 신청한 예약은 '미확인' 상태로 접수되며, 관리자가 직접 추가한 예약은 바로 '준비중'으로 등록됩니다."],
                ["예약 직접 추가", "네이버 예약 텍스트를 붙여넣으면 정보를 자동으로 파싱합니다. 상품 추가 버튼으로 여러 상품을 한 예약에 묶을 수 있습니다."],
                ["상태 관리", "미확인, 준비중, 제작완료, 픽업배송완료, 취소 다섯 단계로 관리합니다. 복수 상품 예약은 상품별로 개별 상태 관리가 가능합니다."],
                ["자동 완료 처리", "'준비중'이나 '제작완료' 상태로 남아 있는 예약은 예약일이 지나면 다음날 새벽에 자동으로 '픽업/배송완료'로 바뀝니다. 픽업·배송 후 상태 변경을 깜빡해도 따로 정리하지 않아도 됩니다."],
                ["채널 표시", "네이버, 카카오, 워크인 채널을 색상 뱃지로 구분해 표시합니다."],
                ["배송비 관리", "배송 주문의 경우 배송비를 입력하면 최종 가격에 자동 반영됩니다."],
                ["결제 상태", "미결제 / 결제완료를 클릭 한 번으로 전환할 수 있습니다."],
                ["예약자 검색", "목록 오른쪽 위 돋보기를 누르면 검색창이 열립니다. 예약자 이름(2글자 이상)이나 전화번호(숫자 4자리 이상)로 달과 관계없이 전체 기간의 예약을 찾을 수 있으며, ✕를 누르면 원래 월 보기로 돌아갑니다."],
                ["모바일 사용법", "카드를 왼쪽으로 스와이프하면 수정·삭제 버튼이 나타납니다. 카드를 탭하면 하단에 상세 정보 시트가 열립니다."],
              ]}
            />

            <div className="pt-2 space-y-4">
              <h3 className="font-medium text-gray-900 text-sm">모바일에서 예약 수정·삭제하기</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                휴대폰 화면에서는 예약 목록이 카드 형태로 보이며, 수정·삭제 버튼이 카드 뒤에 숨어 있습니다.
              </p>
              {/* 스크린샷: public/landing/ 에 이미지를 넣고 아래 주석을 풀면 됩니다 (Fig는 PC·모바일 이미지를 따로 지정 가능) */}
              {/* <Fig src="/landing/cap-reservation-swipe-m.webp" alt="모바일 예약 카드를 왼쪽으로 밀어 수정·삭제 버튼을 연 화면" /> */}
              <div className="space-y-5">
                <Step n={1} title="예약 카드를 왼쪽으로 밀기">수정하거나 삭제할 예약 카드를 손가락으로 왼쪽으로 밀어주세요. 카드 오른쪽에 파란색 연필(수정) 버튼과 빨간색 휴지통(삭제) 버튼이 나타납니다.</Step>
                <Step n={2} title="수정하기">파란색 연필 버튼을 누르면 예약 수정 화면이 열립니다. 내용을 고친 뒤 저장하면 바로 반영됩니다.</Step>
                <Step n={3} title="삭제하기">빨간색 휴지통 버튼을 누르면 &lsquo;정말 삭제하시겠습니까?&rsquo; 확인 창이 뜨고, 확인을 누르면 삭제됩니다. 카드로 결제된 예약은 먼저 상태를 &lsquo;취소&rsquo;로 변경해야 삭제할 수 있습니다. (취소 시 자동 환불)</Step>
                <Step n={4} title="버튼 닫기">버튼을 열었다가 그만두려면 카드를 다시 오른쪽으로 밀면 원래대로 돌아갑니다.</Step>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                카드를 밀지 않고 가볍게 누르면 화면 아래에서 예약 상세 정보가 열리며, 상세 정보 안에서도 수정·삭제할 수 있습니다. PC 화면에서는 예약 행을 눌러 상세 정보를 펼친 뒤 수정·삭제할 수 있습니다.
              </p>
            </div>

            <div className="pt-2 space-y-4">
              <h3 className="font-medium text-gray-900 text-sm">단골 손님 관리 (고객 메모 · 방문 횟수)</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                같은 전화번호로 들어온 예약은 한 고객으로 묶여 관리됩니다. 예약자 이름을 누르면 그 손님이 몇 번 방문했는지, 최근에 무엇을 주문했는지 확인하고 메모를 남길 수 있습니다.
              </p>
              {/* 스크린샷: public/landing/ 에 이미지를 넣고 아래 주석을 풀면 됩니다 */}
              {/* <Fig src="/landing/cap-customer-profile.webp" alt="예약자 이름을 눌러 연 고객 정보 창" /> */}
              <div className="space-y-5">
                <Step n={1} title="예약자 이름 누르기">예약 관리 목록에서 예약자 이름을 누르면 고객 정보 창이 열립니다. 전화번호가 입력된 예약만 이름이 눌리며, PC 화면에서 사용할 수 있습니다.</Step>
                <Step n={2} title="방문 횟수 · 최근 주문 확인">이름 옆에 &lsquo;총 N회 방문&rsquo;이 표시되고, 아래에서 최근 주문 3건의 상품·날짜·금액을 볼 수 있습니다.</Step>
                <Step n={3} title="고객 메모 남기기">좋아하는 꽃·색감, 알레르기, 기념일처럼 기억해 둘 내용을 적고 &lsquo;메모 저장&rsquo;을 누르세요. 다음에 같은 손님이 예약하면 이름을 눌러 바로 확인할 수 있습니다.</Step>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                고객 메모는 사장님만 볼 수 있으며 손님에게는 보이지 않습니다. 방문 횟수는 같은 전화번호로 들어온 예약 수(삭제된 예약 제외)로 계산됩니다.
              </p>
            </div>

            <div className="pt-2 space-y-4">
              <h3 className="font-medium text-gray-900 text-sm">링크결제 보내기</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                예약을 미결제 상태로 등록한 경우 예약 상세 페이지에서 결제 링크를 생성해 고객에게 보낼 수 있습니다.
              </p>
              <div className="space-y-5">
                <Step n={1} title="미결제 예약 등록">링크 결제는 예약 관리 탭에서 예약을 직접 추가해야 하며 결제 상태를 &lsquo;미결제&rsquo;로 등록합니다.</Step>
                <Step n={2} title="결제 링크 생성">예약 상세 페이지 미결제 옆 &lsquo;결제 링크&rsquo; 버튼을 누르고 원하는 만료 시간을 선택해 생성합니다.</Step>
                <Step n={3} title="고객에게 링크 전달">생성된 링크를 문자, 카카오톡 등으로 고객에게 보내면 고객이 직접 접속해 카드 결제를 진행할 수 있습니다.</Step>
                <Step n={4} title="만료 시간 연장">기존 링크가 만료되었거나 시간을 늘리고 싶다면 예약 상세 페이지에서 다시 만료 시간을 설정해 연장할 수 있습니다.</Step>
              </div>
            </div>
          </section>

          {/* 관리자 기능 - 결제 처리 흐름 */}
          <section id="admin-payment-flow" className="scroll-mt-24 space-y-8">
            <div>
              <h2 className="text-xl font-medium text-gray-900">결제 처리 흐름</h2>
              <p className="text-sm text-gray-500 leading-relaxed mt-2">
                결제 상태를 어떻게 바꾸느냐에 따라 손님에게 어떤 카카오 알림톡이 가는지와 환불은 언제 자동으로 처리되는지를 정리했습니다.
                💬 표시는 그 단계에서 알림톡이 발송된다는 뜻입니다.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">일반 결제 — 예약을 받는 경우</h3>
              <div className="bg-white border border-beige-200 rounded-2xl p-5">
                <FlowDiagram
                  steps={[
                    {
                      title: "구매자 결제",
                      color: "bg-gold-500",
                      detail: "맞춤 주문 또는 상품을 선택해 예약 결제를 진행합니다.",
                      note: "매장에 새 예약 알림톡 발송",
                    },
                    {
                      title: "예약 확정",
                      color: "bg-gray-400",
                      detail: "알림톡을 확인한 관리자가 예약 내역을 확인한 뒤 '예약 확정' 버튼을 누릅니다.",
                      note: "구매자에게 예약 확정 알림톡 발송",
                    },
                    {
                      title: "제작완료",
                      color: "bg-yellow-400",
                      detail: "상품 준비를 마치면 상태를 '제작완료'로 변경합니다. 준비중 · 제작완료 · 픽업완료를 구분하기 위한 단계이며 '준비중'에서 바로 '픽업/배송완료'로 변경해도 무방합니다.",
                    },
                    {
                      title: "픽업/배송완료",
                      color: "bg-blue-400",
                      detail: "상품을 픽업 또는 배송 완료하면 상태를 '픽업/배송완료'로 변경합니다. 깜빡하고 변경하지 않아도 예약일 다음날 새벽에 자동으로 '픽업/배송완료' 처리됩니다.",
                    },
                  ]}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                '준비중' 이후 단계에서도 언제든 상태를 '취소'로 변경할 수 있습니다. 정산 전이라면 결제 금액이 자동으로 환불되며, 이미 정산된 예약이라면 아래 &lsquo;예약을 받지 않는 경우&rsquo;의 안내와 동일하게 자동 환불되지 않습니다.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">일반 결제 — 예약을 받지 않는 경우</h3>
              <div className="bg-white border border-beige-200 rounded-2xl p-5">
                <FlowDiagram
                  steps={[
                    {
                      title: "구매자 결제",
                      color: "bg-gold-500",
                      detail: "맞춤 주문 또는 상품을 선택해 예약 결제를 진행합니다.",
                      note: "매장에 새 예약 알림톡 발송",
                    },
                    {
                      title: "예약 취소",
                      color: "bg-gray-500",
                      detail: "알림톡을 확인한 관리자가 예약 내역을 확인한 뒤 '예약 취소' 버튼을 누르고 취소 사유를 작성합니다.",
                      note: "구매자에게 예약 취소 알림톡 발송 + 결제 금액 자동 환불",
                    },
                  ]}
                />
              </div>
              <Callout tone="amber" title="이미 정산된 예약은 자동 환불되지 않습니다" className="mt-3">
                <p>매장에 정산 지급이 끝난 예약을 취소하면 결제 금액이 자동으로 환불되지 않고 직접 환불 처리가 필요합니다. 취소 전 확인 창에서 안내됩니다.</p>
              </Callout>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">링크결제 — 다른 채널로 상담 후 결제가 필요한 경우</h3>
              <div className="bg-white border border-beige-200 rounded-2xl p-5">
                <FlowDiagram
                  steps={[
                    {
                      title: "미결제 상태로 예약 추가",
                      color: "bg-gray-400",
                      detail: "전화, DM 등 다른 채널로 상담한 내용을 토대로 예약 관리 탭에서 결제 상태 '미결제'로 예약을 추가합니다.",
                    },
                    {
                      title: "결제 링크 생성",
                      color: "bg-gray-400",
                      detail: "추가된 예약을 클릭해 상세 내용을 확인하고 결제 상태 옆 '결제 링크' 버튼을 눌러 만료 시간을 정한 뒤 생성합니다.",
                    },
                    {
                      title: "구매자에게 링크 전달",
                      color: "bg-gray-400",
                      detail: "생성된 링크를 문자, 카카오톡 등으로 구매자에게 전송합니다.",
                    },
                    {
                      title: "구매자 결제",
                      color: "bg-gold-500",
                      detail: "구매자가 링크로 들어가 결제를 진행합니다.",
                      note: "매장에 새 예약 알림톡 발송",
                    },
                  ]}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                이후는 위의 <button onClick={() => handleNavClick("admin-payment-flow")} className="text-gold-600 underline hover:text-gold-700">일반 결제 흐름</button>과 동일하게 '미확인' 상태에서부터 진행됩니다.
              </p>
            </div>
          </section>

          {/* 관리자 기능 - 상품 관리 */}
          <section id="admin-products" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">상품 관리</h2>
            <FieldList
              items={[
                ["상품 추가", "상품명, 가격, 이미지, 유형, 분위기, 뱃지, 색상, 포장지 색상(선택), 시즌, 상태를 입력해 등록합니다. 이미지는 자동 압축됩니다."],
                ["분위기", "깔끔한 화이트&그린, 화사한 파스텔톤, 선명한 비비드톤, 차분한 딥컬러 중 선택할 수 있습니다."],
                ["상태 변경", "상태 뱃지를 클릭하면 활성 → 비활성 → 품절 순으로 전환됩니다. 비활성·품절 상품은 손님 화면에 표시되지 않습니다."],
                ["뱃지", "인기 또는 추천 뱃지를 지정하면 손님 화면의 추천/인기 탭에 모아서 표시됩니다."],
                ["시즌 상품", "시즌을 지정한 상품은 시즌 탭에만 표시되며 모든 상품 탭에는 나오지 않습니다."],
                ["모바일 사용법", "카드를 왼쪽으로 스와이프하면 수정·삭제 버튼이 나타납니다."],
              ]}
            />
          </section>

          {/* 관리자 기능 - 통계 */}
          <section id="admin-stats" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">통계 <span className="text-xs font-normal text-gray-400 ml-1">판매 기능 활성화 시</span></h2>
            <Fig src="/landing/cap-stats.webp" mobileSrc="/landing/cap-stats-m.webp" alt="통계 화면" />
            <FieldList
              items={[
                ["이번 달 요약", "총 매출, 예약 건수, 평균 단가를 카드 형태로 확인합니다."],
                ["월별 매출 추이", "최근 6개월 매출을 바 차트로 시각화합니다."],
                ["채널별 비율", "네이버, 카카오, 워크인 채널 비율을 도넛 차트로 확인합니다."],
                ["수령 방법", "픽업과 배송 비율을 확인합니다."],
                ["상품 유형 순위", "가장 많이 주문된 상품 유형을 건수 기준으로 순위를 보여줍니다."],
              ]}
            />
          </section>

          {/* 관리자 기능 - 매장 정보 */}
          <section id="admin-company" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">매장 정보</h2>
            <FieldList
              items={[
                ["로고 · 상호명", "헤더에 표시될 로고를 업로드합니다. 로고가 없으면 상호명이 텍스트로 표시됩니다."],
                ["채널 URL", "매장 위치 URL, 카카오 채널, 인스타그램, 유튜브 URL을 등록하면 홈 화면에 버튼이 자동으로 나타납니다."],
              ]}
            />
          </section>

          {/* 관리자 기능 - 영업 설정 */}
          <section id="admin-business" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">영업 설정</h2>
            <FieldList
              items={[
                ["당일 예약 시간", "상품 형태(꽃다발, 바구니 등)별로 당일 예약 가능한 최소 시간을 설정합니다. 예: 3으로 설정하면 현재 시각 기준 3시간 이후부터 예약 가능합니다."],
                ["요일별 영업시간", "요일별 영업시간을 설정하면 예약 폼에서 영업 시간대만 선택 가능합니다."],
                ["특정 휴무일", "공휴일, 임시 휴무일 등 특정 날짜를 지정하면 해당 날짜는 예약할 수 없습니다."],
              ]}
            />
          </section>

          {/* 관리자 기능 - 디자인 */}
          <section id="admin-design" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-medium text-gray-900">디자인</h2>
            <FieldList
              items={[
                ["홈 화면 이미지", "추천/인기, 모든 상품, 시즌 버튼에 배경 이미지를 각각 업로드할 수 있습니다. 이미지가 없으면 텍스트만 표시됩니다."],
                ["메뉴 설정", "특정 상품 유형이나 시즌을 손님 화면 필터에서 숨길 수 있습니다."],
                ["사이트 색상", "메뉴 화면의 배경색과 포인트 색상을 가게 분위기에 맞게 변경할 수 있습니다."],
              ]}
            />
          </section>

          {/* 업데이트 로그 */}
          <section id="changelog" className="scroll-mt-24 space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gold-500 uppercase mb-2">Changelog</p>
              <h2 className="text-xl font-medium text-gray-900">업데이트 내역</h2>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-beige-100">
                  <span className="text-xs font-semibold text-gold-500 tracking-widest">2026.09</span>
                </div>
                <ul className="px-6 py-4 space-y-3">
                  {[
                    { date: "09.03", text: "통신판매업 신고번호 입력란 추가 — 판매 신청 탭에서 등록. 미등록 상태로 30개 판매 시 판매 기능 자동 정지, 판매 신청/대시보드에서 남은 수량 확인 가능", isNew: true },
                    { date: "09.02", text: "관리자 탭 명칭 정리 — '주문 설정'을 '판매 신청'으로, '맞춤 주문'을 '판매 설정'으로 변경", isNew: true },
                    { date: "09.02", text: "이용 안내 페이지 전면 개편 — 좌측 목차 네비게이션 도입, 판매 신청부터 활성화까지 절차를 단계별로 안내", isNew: true },
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
                  <span className="text-xs font-semibold text-gold-500 tracking-widest">2026.07</span>
                  <svg className="w-4 h-4 text-gray-300 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </summary>
                <ul className="px-6 py-4 space-y-3 border-t border-beige-100">
                  {[
                    { date: "07.02", text: "사업자등록증 업로드 필수화 — 맞춤 주문 신청 시 사업자등록증 사진·PDF 업로드 필수. 운영자가 서류를 직접 확인한 뒤 승인 처리" },
                    { date: "07.02", text: "커스텀 상품 유형 지원 — 디자인 > 메뉴 설정에서 직접 상품 유형을 추가해 사용 가능" },
                    { date: "07.02", text: "상품 색상 필드명 변경 및 포장지 색상 선택 사항으로 변경" },
                    { date: "07.02", text: "구독 결제·환불 이력 로그 — 구독 결제·환불 이벤트를 자동 기록" },
                    { date: "07.02", text: "운영자 결제 이력 탭 추가" },
                  ].map(({ date, text }) => (
                    <li key={text} className="flex items-start gap-2 text-xs leading-relaxed">
                      <span className="text-gray-300 shrink-0 w-10 pt-0.5">{date}</span>
                      <span className="text-gray-500">{text}</span>
                    </li>
                  ))}
                </ul>
              </details>

              <details className="bg-white rounded-2xl border border-beige-200 overflow-hidden group">
                <summary className="flex items-center justify-between px-6 py-3 cursor-pointer list-none">
                  <span className="text-xs font-semibold text-gold-500 tracking-widest">2026.04</span>
                  <svg className="w-4 h-4 text-gray-300 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </summary>
                <ul className="px-6 py-4 space-y-3 border-t border-beige-100">
                  {[
                    { date: "04.28", text: "맞춤 주문 신청·승인 플로우 추가 — 사업자등록번호 국세청 인증, 통장사본 업로드, 계좌 정보 입력 완료 후 운영자에게 신청 가능" },
                    { date: "04.28", text: "이용 안내 페이지 개선 — 맞춤 주문 활성화 준비 사항 및 단계별 순서 상세 안내 추가" },
                    { date: "04.11", text: "이용 안내 페이지 추가" },
                    { date: "04.11", text: "예약 직접 추가·수정 — 상품 다중 추가 지원" },
                    { date: "04.10", text: "맞춤 주문 — 예약 가능 날짜 오늘로부터 최대 30일 이내로 제한" },
                    { date: "04.10", text: "예약 직접 추가·수정 — 결제 상태(미결제/결제 완료) 항목 추가" },
                    { date: "04.04", text: "관리자 탭 구조 개편" },
                    { date: "04.04", text: "배송 기능 추가" },
                    { date: "04.04", text: "배송 제한 — 당일 배송 예약 불가, 20km 초과 또는 미설정 구간은 매장 문의 안내" },
                    { date: "04.04", text: "매장 주소 찾기 — 다음 우편번호 검색으로 변경" },
                    { date: "04.04", text: "금액·전화번호 자동 포맷" },
                    { date: "04.04", text: "상품 등록 한도 — 매장별 최대 500개 제한" },
                    { date: "04.04", text: "저장 버튼 UX 개선" },
                  ].map(({ date, text }) => (
                    <li key={text} className="flex items-start gap-2 text-xs leading-relaxed">
                      <span className="text-gray-300 shrink-0 w-10 pt-0.5">{date}</span>
                      <span className="text-gray-500">{text}</span>
                    </li>
                  ))}
                </ul>
              </details>

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
    </div>
  );
}
