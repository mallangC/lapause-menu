"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// ────────────────────────────────────────────────
// Scroll animation
// ────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string; }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────
// FAQ Accordion
// ────────────────────────────────────────────────
function FaqItem({ q, a, isLast = false }: { q: string; a: string; isLast?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={isLast ? "" : "border-b border-neutral-200"}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-center py-5 text-left text-[15px] font-medium text-neutral-800 hover:text-neutral-600 transition-colors"
      >
        <span>{q}</span>
        <svg
          className={`w-5 h-5 shrink-0 ml-4 text-neutral-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s ease",
        }}
      >
        <p className="text-[14px] text-neutral-500 leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────
const hero = { tag: "전자 메뉴판 & 예약 관리", headline: "상담 시간은 줄이고\n예약은 편리하게", sub: "링크 하나로 상품을 소개하고\n예약을 받으세요.", bg: "/landing/hero-menu.jpg" };

const capabilities = [
  { title: "전자 메뉴판", desc: "앱 없이 링크만으로 상품 카탈로그를 공유하세요.", img: "/landing/cap-menu.jpg" },
  { title: "맞춤 주문", desc: "고객이 직접 꽃 종류, 예산, 색상을 선택합니다.", img: "/landing/cap-order.jpg" },
  { title: "예약 관리", desc: "월별로 모든 예약을 한눈에 확인하세요.", img: "/landing/cap-reservation.jpg" },
  { title: "카카오 알림", desc: "예약 확인, 확정, 취소 알림을 자동으로 발송합니다.", img: "/landing/cap-kakao.jpg" },
  { title: "매출 분석", desc: "어떤 상품이 잘 팔리는지 데이터로 확인하세요.", img: "/landing/cap-stats.jpg" },
  { title: "나만의 링크", desc: "flo-aide.com/내가게주소로 브랜드를 만드세요.", img: "/landing/cap-link.jpg" },
  { title: "쉬운 설정", desc: "가입하고 상품만 등록하면 바로 운영 시작. 별도 설치 없이도 누구나 쉽게.", img: "/landing/cap-setup.jpg" },
];

const steps = [
  { num: "01", title: "무료로 시작", desc: "회원가입 후 가게 정보를 입력하세요." },
  { num: "02", title: "상품 등록", desc: "사진과 가격을 입력하면 메뉴판 완성." },
  { num: "03", title: "맞춤 주문 설정", desc: "고객이 꽃·색상·예산을 직접 선택할 수 있게 설정하세요." },
  { num: "04", title: "바로 운영", desc: "링크를 공유하는 순간 예약을 받을 수 있습니다." },
];

const faqs = [
  { q: "앱을 설치해야 하나요?", a: "아니요. 가게 링크를 공유하면 고객은 앱 설치 없이 바로 메뉴를 볼 수 있습니다. 관리자도 웹 브라우저만 있으면 관리할 수 있습니다." },
  { q: "기존 SNS나 네이버 스마트스토어와 함께 쓸 수 있나요?", a: "네. 플로에이드는 기존 채널을 대체하는 게 아니라 보완하는 도구입니다. 링크만 공유하면 어디서든 연결됩니다." },
  { q: "상품은 몇 개까지 등록할 수 있나요?", a: "상품은 최대 100개까지 등록 할 수 있습니다." },
  { q: "고객이 예약하면 제가 직접 확정해야 하나요, 아니면 자동으로 되나요?", a: "기본적으로 관리자가 직접 확정하는 방식입니다. 예약 요청이 들어오면 알림을 받고, 관리 페이지에서 판매 가능한 예약건인지 확인 후 확정 또는 취소 처리를 할 수 있습니다." },
  { q: "메뉴에 가격을 표시하지 않을 수 있나요?", a: "네. 상품을 추가할 때 가격을 입력하지 않으면 가격이 표시되지 않습니다." },
  { q: "예약 알림은 어디로 오나요?", a: "관리자에게 카카오톡 또는 문자로 알림이 발송됩니다. 고객에게도 예약 확정·취소 시 카카오톡으로 안내가 전달됩니다." },
  { q: "카카오 알림은 어떻게 작동하나요?", a: "고객이 예약을 완료하면 관리자에게, 관리자가 예약을 확정하거나 취소하면 고객 카카오톡으로 알림이 발송됩니다." },
  { q: "비용은 얼마인가요?", a: "첫 1개월은 구독료 없이 모든 혜택을 무료로 이용할 수 있습니다. 이후 스타터 플랜은 월 구독료 없이 결제 수수료 5%(카드 수수료 포함)가 부과되며, 프로 플랜은 월 9,900원으로 결제 수수료 없이(카드 수수료 미포함) 이용하실 수 있습니다." },
];

export default function Landing1() {
  const [scrolled, setScrolled] = useState(false);
  const [activeCap, setActiveCap] = useState(0);
  const capCarouselRef = useRef<HTMLDivElement>(null);

  function goToCap(idx: number) {
    setActiveCap(idx);
    const track = capCarouselRef.current;
    if (!track) return;
    const card = track.children[idx] as HTMLElement;
    if (!card) return;
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeft =
      track.scrollLeft +
      cardRect.left -
      trackRect.left -
      (trackRect.width - cardRect.width) / 2;
    track.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const track = capCarouselRef.current;
    if (!track) return;
    const onScroll = () => {
      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      Array.from(track.children).forEach((child, i) => {
        const el = child as HTMLElement;
        const cardCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(trackCenter - cardCenter);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActiveCap(closest);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <div className="bg-white">

      {/* ── NAV ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
          borderBottom: scrolled ? "1px solid #e5e5e5" : "none",
          backdropFilter: scrolled ? "blur(8px)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <Image
              src={scrolled ? "/logo-light.png" : "/logo-dark.png"}
              alt="Flo.Aide"
              width={72}
              height={24}
              className="object-contain"
            />
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "기능", href: "#기능" },
              { label: "사용 방법", href: "#사용 방법" },
              { label: "FAQ", href: "#FAQ" },
            ].map((item) => (
              <a key={item.label} href={item.href} className={`text-[13px] transition-colors hover:opacity-70 ${scrolled ? "text-neutral-600" : "text-white/80"}`}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className={`text-[13px] transition-colors ${scrolled ? "text-neutral-600" : "text-white/80"} hover:opacity-70`}>
              로그인
            </a>
            <a
              href="/login"
              className="text-[13px] px-4 py-2 rounded-full font-medium transition-all"
              style={{
                background: scrolled ? "#2c2416" : "white",
                color: scrolled ? "white" : "#2c2416",
              }}
            >
              무료로 시작하기
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "#18130e" }}>

        {/* 배경 이미지 */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${hero.bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* 다크 오버레이 — 이미지 위 텍스트 가독성 확보 */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(12,8,4,0.55) 0%, rgba(12,8,4,0.65) 100%)" }}
        />

        {/* 보케 블롭 — 오버레이 위에 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full" style={{
            width: 600, height: 600, top: "-10%", left: "-8%",
            background: "radial-gradient(circle, rgba(210,120,130,0.2) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
          <div className="absolute rounded-full" style={{
            width: 500, height: 500, bottom: "-5%", left: "15%",
            background: "radial-gradient(circle, rgba(110,155,110,0.16) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
          <div className="absolute rounded-full" style={{
            width: 400, height: 400, top: "20%", right: "25%",
            background: "radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
          <div className="absolute rounded-full" style={{
            width: 350, height: 350, bottom: "10%", right: "5%",
            background: "radial-gradient(circle, rgba(230,160,150,0.13) 0%, transparent 70%)",
            filter: "blur(50px)",
          }} />
        </div>

        {/* 콘텐츠 */}
        <div className="relative z-10 w-full flex flex-col items-center text-center px-6 py-28">
          <div
            className="inline-block text-[13px] tracking-[0.2em] uppercase mb-6 px-3 py-1 rounded-full"
            style={{
              color: "rgba(201,169,110,0.95)",
              border: "1px solid rgba(201,169,110,0.35)",
            }}
          >
            {hero.tag}
          </div>

          <h1
            className="text-[clamp(2.8rem,8vw,5.5rem)] leading-[1.12] font-semibold not-italic mb-6"
            style={{ color: "white", whiteSpace: "pre-line" }}
          >
            {hero.headline}
          </h1>

          <p
            className="text-[16px] leading-relaxed mb-12 max-w-sm"
            style={{ color: "rgba(255,255,255,0.55)", whiteSpace: "pre-line" }}
          >
            {hero.sub}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <a
              href="/login"
              className="px-8 py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
              style={{ background: "white", color: "#18130e" }}
            >
              무료로 시작하기
            </a>
            <a
              href="#기능"
              className="px-8 py-3.5 rounded-full text-[14px] font-medium transition-all"
              style={{ color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              기능 살펴보기 →
            </a>
          </div>
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-10 animate-pulse" style={{ background: "rgba(255,255,255,0.25)" }} />
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section className="py-24" style={{ background: "#fdf6ee" }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Before / After</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              하루가 이렇게 바뀝니다
            </h2>
          </FadeIn>

          {/* 숫자 강조 */}
          <FadeIn>
            <div className="grid grid-cols-3 gap-4 mb-14">
              {[
                { num: "↓ 80%", label: "반복 문의 감소", sub: "상품·가격 질문이 링크로 해결" },
                { num: "0건", label: "놓치는 예약", sub: "모든 접수가 대시보드에 기록" },
                { num: "24/7", label: "쉬는 날도 예약 접수", sub: "관리자가 자리를 비워도 OK" },
              ].map(({ num, label, sub }) => (
                <div key={label} className="bg-white rounded-2xl p-6 text-center border border-neutral-100">
                  <div className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-semibold not-italic mb-1.5" style={{ color: "#2c2416" }}>{num}</div>
                  <div className="text-[14px] font-medium text-neutral-800 mb-1">{label}</div>
                  <div className="text-[12px] text-neutral-400">{sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Before / After 비교 */}
          <FadeIn delay={100}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-7">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400 mb-5">지금 방식</p>
                <ul className="space-y-4">
                  {[
                    "카카오톡으로 상품 사진 일일이 전송",
                    "\"얼마예요?\" 질문에 매번 답장",
                    "예약 날짜·시간 수동으로 조율",
                    "메모장·엑셀로 예약 관리",
                    "쉬는 날엔 예약 접수 불가",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-neutral-500">
                      <span className="mt-0.5 shrink-0 text-neutral-300">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="rounded-2xl border p-7" style={{ background: "#18130e", borderColor: "#2c2416" }}>
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-5" style={{ color: "rgba(201,169,110,0.7)" }}>Flo.Aide 사용 후</p>
                <ul className="space-y-4">
                  {[
                    "링크 하나로 상품·가격 한번에 공유",
                    "고객이 직접 보고 예약까지 완료",
                    "고객이 원하는 날짜 직접 선택",
                    "대시보드에서 예약 한눈에 관리",
                    "24시간 자동으로 예약 접수",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: "rgba(255,255,255,0.8)" }}>
                      <span className="mt-0.5 shrink-0" style={{ color: "#c9a96e" }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white py-20 border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="grid grid-cols-3 gap-8 text-center">
            {[
              { num: "0원", label: "시작 비용", sub: "무료로 시작, 필요할 때 업그레이드" },
              { num: "설치 없이", label: "바로 사용 가능", sub: "앱 다운로드 없이 링크 하나로" },
              { num: "24/7", label: "언제나 운영 가능", sub: "쉬는 날에도 메뉴판은 열려 있어요" },
            ].map(({ num, label, sub }) => (
              <div key={label}>
                <div
                  className="text-[clamp(1.6rem,4vw,3rem)] font-semibold not-italic leading-none mb-2"
                  style={{ color: "#2c2416" }}
                >
                  {num}
                </div>
                <div className="text-[14px] font-medium text-neutral-700 mb-1">{label}</div>
                <div className="text-[12px] text-neutral-400 leading-snug">{sub}</div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── CAPABILITIES (Squarespace-style tabbed carousel) ── */}
      <section id="기능" className="pt-20 pb-16 bg-white" style={{ scrollMarginTop: 64 }}>
        {/* 섹션 헤더 — 중앙 정렬 */}
        <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
          <FadeIn>
            <p className="text-[15px] tracking-[0.2em] uppercase text-neutral-400 mb-3">기능</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic text-neutral-900 leading-tight">
              꽃집 운영에 필요한<br />모든 도구
            </h2>
            <p className="text-[14px] text-neutral-400 mt-3">하나의 플랫폼에서 누리는 올인원 솔루션</p>
          </FadeIn>
        </div>

        {/* 카테고리 탭 — 중앙 정렬 */}
        <div className="mb-8">
          <div
            className="flex justify-center overflow-x-auto"
            style={{ scrollbarWidth: "none", borderBottom: "1px solid #e5e5e5" }}
          >
            {capabilities.map((cap, i) => (
              <button
                key={cap.title}
                onClick={() => goToCap(i)}
                className="shrink-0 px-5 py-3.5 text-[13px] font-medium transition-all whitespace-nowrap"
                style={{
                  color: activeCap === i ? "#1a1a1a" : "#9a9a9a",
                  borderBottom: activeCap === i ? "2px solid #1a1a1a" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {cap.title}
              </button>
            ))}
          </div>
        </div>

        {/* 카드 캐러셀 — 한 화면에 1개, 양옆 살짝 peek */}
        <div
          ref={capCarouselRef}
          className="flex"
          style={{
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
            gap: 20,
            paddingLeft: 60,
            paddingRight: 60,
          }}
        >
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="shrink-0 rounded-2xl overflow-hidden"
              style={{
                width: "calc(100vw - 120px)",
                maxWidth: 1100,
                scrollSnapAlign: "center",
              }}
            >
              {/* 이미지 + 텍스트 오버레이 (이미지 왼쪽 하단 고정) */}
              <div
                className="relative w-full overflow-hidden"
                style={{ height: "clamp(320px, 60vh, 580px)" }}
              >
                {/* 플레이스홀더 배경 */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(135deg, #f0ebe4 0%, #ddd0c4 100%)" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[13px] text-neutral-400 tracking-wide">{cap.title} 이미지</span>
                </div>
                {/* 실제 이미지 */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${cap.img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                {/* 왼쪽 하단 그라데이션 */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(10,7,4,0.75) 0%, rgba(10,7,4,0.2) 40%, transparent 65%)",
                  }}
                />
                {/* 텍스트 — 이미지 왼쪽 하단 고정 */}
                <div className="absolute bottom-0 left-0 p-8 max-w-lg">
                  <h3 className="text-[clamp(1.3rem,2.8vw,1.8rem)] font-semibold text-white leading-snug mb-3">
                    {cap.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                    {cap.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="사용 방법" className="py-24" style={{ background: "#18130e", scrollMarginTop: 64 }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[15px] tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(201,169,110,0.7)" }}>사용 방법</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic text-white leading-tight">
              가입하고 상품 올리면<br />바로 준비 완료
            </h2>
          </FadeIn>
          <div className="relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-8 left-[6%] right-[6%] h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="grid md:grid-cols-4 gap-8 relative z-10">
              {steps.map((step, i) => (
                <FadeIn key={step.num} delay={i * 100}>
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-[17px] font-semibold mb-5 shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(201,169,110,0.9)" }}
                    >
                      {step.num}
                    </div>
                    <h3 className="text-[15px] font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING (임시 숨김) ── */}
      {false && <section id="pricing" className="py-24 bg-white" style={{ scrollMarginTop: 64 }}>
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Pricing</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              합리적인 요금제
            </h2>
            <p className="mt-4 text-[15px] text-neutral-500">필요에 맞는 플랜을 선택하세요</p>
          </FadeIn>

          {/* 첫 달 무료 배너 */}
          <FadeIn>
            <div className="rounded-2xl mb-6 py-5 px-6 text-center" style={{ background: "linear-gradient(135deg, #2c2416 0%, #18130e 100%)" }}>
              <p className="text-[15px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#c9a96e" }}>첫 1개월 무료 체험</p>
              <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.7)" }}>구독료 없음 + 결제 수수료 0% — 한 달간 Pro 혜택을 그대로</p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Starter */}
              <div className="rounded-2xl border border-beige-200 p-6 sm:p-8 flex flex-col bg-beige-50">
                <div className="mb-6">
                  <p className="text-[12px] font-semibold tracking-[0.2em] uppercase text-neutral-500 mb-3">Starter</p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[2.6rem] font-semibold leading-none" style={{ color: "#2c2416" }}>₩0</span>
                    <span className="text-[15px] font-medium text-neutral-500 mb-1.5">/ 월</span>
                  </div>
                  <p className="text-[14px] text-neutral-500">월 구독료 없이 계속 사용</p>
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {[
                    { text: "전자 메뉴판 운영", highlight: false },
                    { text: "맞춤 주문 & 예약 관리", highlight: false },
                    { text: "결제 수수료 5% (카드 수수료 포함)", highlight: true },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] font-medium">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: item.highlight ? "#b8934a" : "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: item.highlight ? "#9a7a3a" : "#374151" }}>{item.text}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/login"
                  className="block text-center py-3 rounded-xl border border-neutral-300 text-[14px] font-semibold text-neutral-800 hover:border-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  무료로 시작하기
                </a>
              </div>

              {/* Pro */}
              <div className="rounded-2xl border p-6 sm:p-8 flex flex-col relative" style={{ background: "#fdf6ee", borderColor: "#e8ddc9" }}>
                {/* Badge */}
                <div
                  className="absolute top-5 right-5 text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                  style={{ background: "rgba(201,169,110,0.15)", color: "#9a7a3a" }}
                >
                  추천
                </div>

                <div className="mb-6">
                  <p className="text-[12px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "#9a7a3a" }}>Pro</p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[2.6rem] font-semibold leading-none" style={{ color: "#2c2416" }}>₩9,900</span>
                    <span className="text-[15px] font-medium text-neutral-500 mb-1.5">/ 월</span>
                  </div>
                  <p className="text-[14px] text-neutral-500">수수료 없이 매출을 온전히</p>
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {[
                    { text: "Starter 플랜 모든 기능 포함", highlight: false },
                    { text: "우선 고객 지원", highlight: false },
                    { text: "결제 수수료 0% (카드 수수료 별도)", highlight: true },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] font-medium">
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: item.highlight ? "#b8934a" : "#9ca3af" }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: item.highlight ? "#9a7a3a" : "#374151" }}>
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/login"
                  className="block text-center py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90"
                  style={{ background: "#2c2416", color: "#fff" }}
                >
                  Pro 시작하기
                </a>
              </div>

            </div>

          </FadeIn>
        </div>
      </section>}

      {/* ── FAQ ── */}
      <section id="FAQ" className="py-24" style={{ background: "#fdf6ee", scrollMarginTop: 64 }}>
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="mb-12">
            <p className="text-[15px] tracking-[0.2em] uppercase text-neutral-400 mb-3">FAQ</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              자주 묻는 질문
            </h2>
          </FadeIn>
          <FadeIn delay={100} className="bg-white rounded-2xl px-8 py-2 shadow-sm">
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} isLast={i === faqs.length - 1} />
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 text-center" style={{ background: "#18130e" }}>
        <FadeIn>
          <p className="text-[15px] tracking-[0.2em] uppercase mb-6" style={{ color: "rgba(201,169,110,0.7)" }}>
            지금 바로
          </p>
          <h2
            className="text-[clamp(2rem,5vw,3.5rem)] font-semibold not-italic text-white leading-tight mb-4"
          >
            오늘 무료로<br />꽃집 메뉴판을 만들어보세요
          </h2>
          <p className="text-[15px] mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
            신용카드는 필요하지 않습니다
          </p>
          {/* 회원가입 CTA — 임시 숨김 */}
          {/* <a href="/signup" className="inline-block px-10 py-4 rounded-full text-[14px] font-semibold transition-all hover:opacity-90" style={{ background: "white", color: "#18130e" }}>
            무료로 시작하기
          </a> */}
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      {/* TODO: 서비스 / 지원 / 회사 링크 섹션 — 추후 추가 */}
      <footer className="bg-white border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* 상단: 로고 + 약관 링크 */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Image src="/logo-light.png" alt="Flo.Aide" width={64} height={22} className="object-contain" />
              <span className="text-neutral-200">|</span>
              <span className="text-[12px] text-neutral-400">© 2026 말랑 스튜디오. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href="/terms" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">이용약관</a>
              <a href="/privacy" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">개인정보처리방침</a>
              <a href="/refund" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">환불정책</a>
            </div>
          </div>
          {/* 사업자 정보 */}
          <div className="text-[11px] text-neutral-400 leading-relaxed space-y-0.5 border-t border-neutral-100 pt-5">
            <p>상호명: 말랑 스튜디오 &nbsp;|&nbsp; 대표자: 최경재 &nbsp;|&nbsp; 사업자등록번호: 698-15-00460</p>
            <p>사업장 주소: 서울특별시 관악구 남부순환로 168나길 14-2 &nbsp;|&nbsp; 전화: 0507-1371-6290 &nbsp;|&nbsp; 이메일: floaide.team@gmail.com</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
