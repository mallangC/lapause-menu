"use client";

import ChatDemo from "./_landing/ChatDemo";
import LivePreviewFrame, { LiveMenuFrame } from "./_landing/LiveMenuFrame";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ANNUAL_DISCOUNT_RATE, PLAN_PRICES, PLAN_FEATURES, PLATFORM_FEE_PERCENT_LABEL } from "@/lib/constants";

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
// Q&A Accordion
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
const hero = { tag: "꽃집 상담 & 예약", headline: "상담 시간은 줄이고\n예약은 편리하게", sub: "링크 하나로 손님 상담부터\n예약·결제까지 끝내요.", bg: "/landing/hero-menu.webp" };

const capabilities = [
  { title: "맞춤 상담", desc: "손님이 대화하듯 고르면 주문서까지 정리돼요.", img: "/landing/cap-order.webp", mobileImg: "/landing/cap-order-m.webp" },
  { title: "전자 메뉴판", desc: "사진·가격을 한눈에 보여줘 상품 문의가 줄어요.", img: "/landing/cap-menu.webp", mobileImg: "/landing/cap-menu-m.webp" },
  { title: "링크결제", desc: "전화·DM 상담으로 정한 주문도 결제 링크 하나로 마무리해요.", img: "/landing/cap-paylink.webp", mobileImg: "/landing/cap-paylink-m.webp" },
  { title: "예약 관리", desc: "상담 내용이 담긴 예약을 월별로 한눈에 확인하세요.", img: "/landing/cap-reservation.webp", mobileImg: "/landing/cap-reservation-m.webp" },
  { title: "네이버 예약 연동", desc: "네이버 예약도 예약 관리에 자동으로 추가돼요. 확인 전에는 알림으로 알려 드려요.", img: "/landing/cap-naver.webp", mobileImg: "/landing/cap-naver-m.webp" },
  { title: "카카오 알림", desc: "\"예약 됐나요?\" 문의 없이 확정·취소를 자동으로 알려요.", img: "/landing/cap-kakao.webp", mobileImg: "/landing/cap-kakao-m.webp" },
  { title: "매출 분석", desc: "어떤 상담에서 주문이 많이 나오는지 데이터로 확인하세요.", img: "/landing/cap-stats.webp", mobileImg: "/landing/cap-stats-m.webp" },
  { title: "쉬운 설정", desc: "가입하고 상품만 등록하면 바로 운영 시작. 별도 설치 없이도 누구나 쉽게.", img: "/landing/cap-setup.webp", mobileImg: "/landing/cap-setup-m.webp" },
];

const steps = [
  { num: "01", title: "한달 무료로 시작", desc: "회원가입 후 가게 정보를 입력하세요." },
  { num: "02", title: "상품 등록", desc: "사진과 가격을 입력하면 메뉴판 완성." },
  { num: "03", title: "맞춤 주문 신청", desc: "사업자 등록증·통장 사본을 제출하면 맞춤 주문 기능이 활성화됩니다." },
  { num: "04", title: "맞춤 주문 설정", desc: "고객이 꽃·색상·예산을 직접 선택할 수 있게 설정하세요." },
  { num: "05", title: "운영 시작", desc: "링크를 공유하는 순간 예약을 받을 수 있습니다." },
];

const faqs = [
  { q: "앱을 설치해야 하나요?", a: "아니요. 가게 링크를 공유하면 고객은 앱 설치 없이 바로 메뉴를 볼 수 있습니다. 관리자도 웹 브라우저만 있으면 관리할 수 있습니다." },
  { q: "누구나 플로에이드에서 꽃을 판매할 수 있나요?", a: "사업자 등록이 되어 있는 사장님만 판매가 가능합니다. 맞춤 주문 기능을 통해 꽃을 판매하시려면 사업자 등록증과 통장 사본 등의 서류를 제출해 주셔야 합니다." },
  { q: "기존 SNS나 네이버 스마트스토어와 함께 쓸 수 있나요?", a: "네. 플로에이드는 기존 채널을 대체하는 게 아니라 보완하는 도구입니다. 링크만 공유하면 어디서든 연결됩니다." },
  { q: "네이버 예약도 같이 관리할 수 있나요?", a: "네. 네이버 스마트플레이스의 이메일 알림을 매장 전용 주소로 연결하면, 네이버 예약이 확정되거나 손님이 취소할 때 예약 관리에 자동으로 반영됩니다. 확인하지 않은 네이버 예약은 관리자 화면 위쪽 알림으로 알려 드립니다. (Flo.Aide는 네이버(주)와 제휴 관계가 아니며, 네이버 스마트플레이스의 이메일 알림 기능을 이용합니다.)" },
  { q: "상품은 몇 개까지 등록할 수 있나요?", a: "상품은 최대 100개까지 등록 할 수 있습니다." },
  { q: "고객이 예약하면 제가 직접 확정해야 하나요, 아니면 자동으로 되나요?", a: "기본적으로 관리자가 직접 확정하는 방식입니다. 예약 요청이 들어오면 알림을 받고, 관리 페이지에서 판매 가능한 예약건인지 확인 후 확정 또는 취소 처리를 할 수 있습니다." },
  { q: "메뉴에 가격을 표시하지 않을 수 있나요?", a: "네. 상품을 추가할 때 가격을 입력하지 않으면 가격이 표시되지 않습니다." },
  { q: "카카오 알림은 어떻게 작동하나요?", a: "고객이 예약을 완료하면 관리자에게, 관리자가 예약을 확정하거나 취소하면 고객 카카오톡으로 알림이 발송됩니다." },
  { q: "비용은 얼마인가요?", a: `첫 1개월은 카드 등록 없이 무료로 체험할 수 있습니다. 이후 월간 플랜 월 ${PLAN_PRICES.monthly.toLocaleString()}원, 연간 플랜 월 ${PLAN_PRICES.annual.toLocaleString()}원(연 ${PLAN_PRICES.annualTotal.toLocaleString()}원 일괄 결제, 월간 대비 약 ${ANNUAL_DISCOUNT_RATE}% 할인)으로 이용하실 수 있습니다. 두 플랜 모두 맞춤 주문·예약·통계·카카오 알림 등 모든 기능이 포함됩니다. Flo.Aide는 결제 수수료를 따로 받지 않으며, 카드 결제 시 기본 카드 수수료 ${PLATFORM_FEE_PERCENT_LABEL}(부가세 별도)만 발생합니다. 카드 수수료는 정책에 따라 변경될 수 있습니다.` },
];

export default function Landing() {
  const [pricingCycle, setPricingCycle] = useState<"monthly" | "annual">("annual");
  const [scrolled, setScrolled] = useState(false);
  const [activeCap, setActiveCap] = useState(0);
  const capCarouselRef = useRef<HTMLDivElement>(null);
  const [painProgress, setPainProgress] = useState(0);
  const painRef = useRef<HTMLDivElement>(null);

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
    const onScroll = () => {
      const el = painRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / total));
      setPainProgress(progress);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
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
    <div className="bg-white" style={{ overflowX: "clip" }}>
      <link rel="preload" as="image" href="/landing/hero-menu.webp" />

      {/* ── NAV ── */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 transition-all duration-300" style={{ width: "100dvw" }}>
        <header
          className="w-full transition-all duration-300"
          style={{
            maxWidth: scrolled ? 900 : 1152,
            borderRadius: 999,
            background: scrolled
              ? "rgba(255,255,255,0.72)"
              : "rgba(255,255,255,0.08)",
            border: scrolled
              ? "1px solid rgba(0,0,0,0.08)"
              : "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: scrolled
              ? "0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)"
              : "0 2px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <div className="px-4 md:px-7 h-14 md:h-16 flex items-center justify-between relative">
            <a href="/" className="flex items-center shrink-0">
              <Image
                src={scrolled ? "/logo-light.png" : "/logo-dark.png"}
                alt="Flo.Aide"
                width={76}
                height={24}
                className="object-contain md:w-[88px] md:h-[28px]"
              />
            </a>
            <nav className="hidden md:flex items-center gap-9 absolute left-1/2 -translate-x-1/2">
              {[
                { label: "기능", href: "#기능" },
                { label: "효과", href: "#효과" },
                { label: "사용 방법", href: "#사용 방법" },
                { label: "요금제", href: "#요금제" },
                { label: "Q&A", href: "#Q&A" },
              ].map((item) => (
                <a key={item.label} href={item.href}
                  className={`text-[14px] font-medium transition-colors hover:opacity-70 ${scrolled ? "text-neutral-700" : "text-white/85"}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3 shrink-0">
              <a href="/login"
                className={`text-[13px] md:text-[14px] font-medium transition-colors hover:opacity-70 ${scrolled ? "text-neutral-600" : "text-white/80"}`}>
                로그인
              </a>
              <a
                href="/login"
                className="text-[13px] md:text-[14px] px-4 md:px-5 py-2 rounded-full font-semibold transition-all whitespace-nowrap"
                style={{
                  background: scrolled ? "#2c2416" : "rgba(255,255,255,0.9)",
                  color: scrolled ? "white" : "#2c2416",
                }}
              >
                무료 시작
              </a>
            </div>
          </div>
        </header>
      </div>

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


      {/* ── PAIN POINTS + SOLUTION — Scroll Animation ── */}
      <div ref={painRef} style={{ height: "380vh" }}>
        {(() => {
          const flyProgress = Math.max(0, Math.min(1, (painProgress - 0.25) / 0.20));
          const solutionOpacity = Math.max(0, Math.min(1, (painProgress - 0.38) / 0.20));
          const painTitleOpacity = Math.max(0, 1 - flyProgress * 2);
          const zoomProgress = Math.max(0, Math.min(1, (painProgress - 0.68) / 0.32));
          const solutionFadeOut = Math.max(0, Math.min(1, zoomProgress * 2.5));


          return (
            <div className="sticky top-0 h-screen overflow-hidden bg-white">

              {/* 해결 문구 — 포스트잇 뒤에서 점점 드러남 */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center px-6"
                style={{
                  opacity: Math.max(0, solutionOpacity - solutionFadeOut),
                  filter: `blur(${(1 - solutionOpacity) * 8}px)`,
                }}
              >
                <p className="text-[12px] tracking-[0.25em] uppercase mb-4 font-medium" style={{ color: "#c9a96e" }}>Solution</p>
                <h2 className="font-semibold text-center" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", color: "#2c2416", lineHeight: 1.2 }}>
                  상담은 플로에이드가<br />대신 해드릴게요
                </h2>
              </div>

              {/* 포스트잇 — 앞에 떠있다가 날아감 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-6">
                <div
                  className="text-center mb-5 sm:mb-8"
                  style={{ opacity: painTitleOpacity, transform: `translateY(${flyProgress * -24}px)` }}
                >
                  <p className="text-[12px] tracking-[0.25em] uppercase mb-3 font-medium" style={{ color: "#c9a96e" }}>Pain Point</p>
                  <h2 className="font-semibold" style={{ fontSize: "clamp(1.4rem,4vw,2.6rem)", color: "#2c2416", lineHeight: 1.2 }}>
                    꽃집 사장님들의 상담 고민
                  </h2>
                </div>

                {(() => {
                  const allPostIts = [
                    { quote: "같은 질문에\n하루 종일\n답장하고 있어요",          fly: { x: -160, y: -110, r: -28 }, rotate: -8  },
                    { quote: "\"얼마예요?\"\n가격 문의만\n수십 번이에요",       fly: { x: -130, y: -110, r: -30 }, rotate: -2  },
                    { quote: "SNS 사진만으론\n상품 안내가\n부족해요",            fly: { x: 130, y: -110, r: 30 }, rotate: 2.5 },
                    { quote: "사진 찾아서\n보내주는 데만\n한참 걸려요",           fly: { x: 160, y: -110, r: 32 }, rotate: -7   },
                    { quote: "손님이 원하는 걸\n말로 설명하기\n어려워해요",        fly: { x: -160, y: 110, r: -28 }, rotate: 6  },
                    { quote: "\"이 가격이면\n크기가 어느 정도예요?\"\n매번 설명해요", fly: { x: -130, y: 110, r: -25 }, rotate: -1.5 },
                    { quote: "작업 중에도\nDM 답장 때문에\n손이 멈춰요",          fly: { x: 130, y: 110, r: 25 }, rotate: 3   },
                    { quote: "문을 닫은 뒤에도\n상담 문의가\n계속 와요",           fly: { x: 160, y: 110, r: 30 }, rotate: -3   },
                  ];
                  return (
                    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" style={{ maxWidth: "clamp(300px, 78vw, 920px)" }}>
                      {allPostIts.map((item, i) => (
                        <div
                          key={i}
                          className="postit-card"
                          style={{
                            background: "#FFFDE7",
                            borderRadius: 4,
                            aspectRatio: "1 / 1",
                            padding: "clamp(8px, 3%, 20px)",
                            boxShadow: "0 6px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.07)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transform: `translateX(${flyProgress * item.fly.x}vw) translateY(${flyProgress * item.fly.y}vh) rotate(${item.rotate + flyProgress * item.fly.r}deg)`,
                            opacity: Math.max(0, 1 - flyProgress * 1.4),
                            willChange: "transform, opacity",
                          }}
                        >
                          <p style={{ fontSize: "clamp(16px, 3.5vw, 28px)", fontFamily: "'Nanum Pen Script', cursive", fontWeight: 400, color: "#3a2e1e", lineHeight: 1.8, whiteSpace: "pre-line", margin: 0, textAlign: "center" }}>
                            {item.quote}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 스포트라이트 1번 — 맞춤 상담 (포스트잇이 날아간 뒤 가장 먼저 보이는 기능) */}
              <div
                className="spotlight1-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#0c0906",
                  opacity: zoomProgress,
                  pointerEvents: "none",
                  willChange: "opacity",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute" style={{ width: 900, height: 900, top: -200, right: -150, background: "radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 65%)" }} />
                  <div className="absolute" style={{ width: 600, height: 600, bottom: -100, left: -100, background: "radial-gradient(circle, rgba(210,120,130,0.05) 0%, transparent 65%)" }} />
                </div>
                <div className="relative z-10 w-full max-w-300 mx-auto px-6 md:px-8 pt-28 pb-10 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-20 items-center">
                  <div>
            <p className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase mb-3 md:mb-5 font-medium" style={{ color: "#c9a96e" }}>맞춤 상담</p>
            <h2 className="font-semibold text-white leading-[1.15] mb-3 md:mb-6" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", whiteSpace: "pre-line" }}>{"사장님 대신\n상담해 드려요"}</h2>
            <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
              어떤 날 드릴 꽃인지, 어떤 분위기인지, 얼마에 맞출지 — 매번 묻던 질문을 대화로 대신 묻고 주문서까지 정리해요.
            </p>
            <ul className="space-y-2 md:space-y-3">
              {["사장님 스타일·추천·찾아본 사진, 3가지 상담", "볼륨감 사진으로 금액 상담까지", "상담이 끝나면 바로 예약·결제"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] md:text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold" style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 md:mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium" style={{ background: "rgba(201,169,110,0.12)", color: "#c9a96e", border: "1px solid rgba(201,169,110,0.3)" }}>
              <span>📋</span> 사업자 등록증·통장 사본 제출로 신청
            </div>
                  </div>

                  {/* 오른쪽: 매장 첫 화면처럼 대화로 상담하는 모습 (자동 재생) */}
                  <div className="flex justify-center md:justify-end">
                    <ChatDemo />
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* ── FEATURE SPOTLIGHT — 3 핵심 기능 ── */}

      {/* 02 전자 메뉴판 — 맞춤 상담 다음 (상담을 줄이는 두 번째 방법) */}
      <section className="spotlight2-section relative bg-white overflow-hidden" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{ width: 700, height: 700, bottom: -200, right: -100, background: "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 65%)" }} />
          <div className="absolute" style={{ width: 500, height: 500, top: -100, left: -100, background: "radial-gradient(circle, rgba(210,120,130,0.05) 0%, transparent 65%)" }} />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8 w-full pt-28 pb-10 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 items-center">
          <FadeIn>
                    <p className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase mb-3 md:mb-5 font-medium" style={{ color: "#c9a96e" }}>전자 메뉴판</p>
                    <h2 className="font-semibold leading-[1.15] mb-3 md:mb-6" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", color: "#2c2416", whiteSpace: "pre-line" }}>{"\"사진 더 보내주세요\"\n이 질문이 사라져요"}</h2>
                    <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-8 text-neutral-500">
                      사진·가격·설명을 한 번 올려두면, 손님이 링크에서 직접 보고 골라요. 사진을 찾아 보내는 상담이 필요 없어요.
                    </p>
                    <ul className="space-y-2 md:space-y-3">
                      {["상품 사진·가격 문의를 링크 하나로", "색상·분위기·포장 필터로 손님이 직접 찾기", "앱 설치 없이 카톡·인스타에서 바로 열림"].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-[13px] md:text-[14px] text-neutral-600">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold" style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
          </FadeIn>
                  <div className="flex justify-center md:justify-end md:-mr-4">
                    <div className="relative spotlight-wrap" style={{ width: "clamp(260px, 50vw, 420px)", height: 670 }}>
                      {/* 앞 캡처 */}
                      <div className="spotlight-img-wrapper absolute overflow-hidden" style={{ bottom: 0, left: "-10%", width: "78%", borderRadius: 14, transform: "translateY(-8px)", boxShadow: "0 24px 64px rgba(0,0,0,0.14)", border: "1px solid #ede8e0", zIndex: 2 }}>
                        {/* 실제 프리뷰 메뉴판을 휴대폰 화면 그대로 — 직접 눌러 볼 수 있다 */}
                        <div className="spotlight-img" style={{ width: "100%", height: 590 }}>
                          <LiveMenuFrame />
                        </div>
                      </div>

                      {/* 맞춤 상담 버튼 (메뉴판 헤더와 같은 이름) */}
                      <div className="badge-order" style={{ position: "absolute", top: 50, left: -100, zIndex: 10, display: "flex", alignItems: "center", gap: 8, background: "#b8934a", borderRadius: 999, padding: "10px 18px", boxShadow: "0 8px 24px rgba(184,147,74,0.4)", animation: "floatY 4s ease-in-out infinite" }}>
                        <span style={{ fontSize: 15 }}>✨</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>맞춤 상담</span>
                      </div>

                      {/* 색상 필터 뱃지 */}
                      <div className="badge-color" style={{ position: "absolute", bottom: 60, right: 70, zIndex: 10, width: "max-content", whiteSpace: "nowrap", background: "white", borderRadius: 14, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", animation: "floatY 5s ease-in-out infinite 1s" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#b8934a", margin: "0 0 8px", letterSpacing: "0.05em" }}>색상</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {[
                            { label: "핑크색", hex: "#f472b6", active: true },
                            { label: "흰색", hex: "#ffffff", active: false },
                            { label: "보라색", hex: "#a855f7", active: false },
                          ].map((c) => (
                            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 12, border: `1px solid ${c.active ? "#b8934a" : "#e5e7eb"}`, background: c.active ? "#b8934a" : "transparent", color: c.active ? "white" : "#4b5563" }}>
                              <span style={{ width: 10, height: 10, borderRadius: 999, background: c.hex, border: c.hex === "#ffffff" ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.4)", flexShrink: 0, display: "inline-block" }} />
                              {c.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 링크 공유 뱃지 — 데스크탑 전용 */}
                      <div className="badge-desktop-only" style={{ position: "absolute", top: 400, left: -150, zIndex: 10, background: "white", border: "1px solid #ede8e0", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", borderRadius: 10, padding: "8px 14px", animation: "floatY 6s ease-in-out infinite 0.5s" }}>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 3px" }}>공유 링크</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#2c2416", margin: 0 }}>flo-aide.com/<span style={{ color: "#c9a96e" }}>내꽃집</span>/menu</p>
                      </div>
                    </div>
                  </div>
        </div>
      </section>

      {/* 03 예약 관리 */}
      <section className="relative overflow-hidden" style={{ background: "#0c0906" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{ width: 900, height: 900, top: -300, left: -200, background: "radial-gradient(circle, rgba(110,155,110,0.06) 0%, transparent 65%)" }} />
          <div className="absolute" style={{ width: 700, height: 700, bottom: -200, right: -100, background: "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 65%)" }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 w-full pt-28 pb-0 md:pt-24">
          {/* 텍스트 */}
          <FadeIn>
            <div className="max-w-xl mb-10 md:mb-14">
              <p className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase mb-3 md:mb-5 font-medium" style={{ color: "#c9a96e" }}>예약 관리</p>
              <h2 className="font-semibold text-white leading-[1.15] mb-3 md:mb-5" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", whiteSpace: "pre-line" }}>{"상담 끝난 주문은\n한눈에 정리돼요"}</h2>
              <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                상담에서 받은 내용이 그대로 예약에 남아요. 다시 물어볼 필요 없이 확정 버튼 하나면 손님 카카오톡으로 알림이 가요.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["선물 정보·요청 사항까지 예약에 기록", "확정·취소 시 카카오 알림 자동 발송", "네이버 예약도 자동으로 함께 정리", "어떤 상담에서 주문이 나오는지 통계"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[13px] md:text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold" style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* PC 대시보드 이미지 */}
          <FadeIn delay={150}>
            <div className="relative pb-6 md:pb-8 spotlight3-wrap">
              {/* 이미지 */}
              <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 -8px 60px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {/* 실제 프리뷰 예약 관리 화면(PC)을 그대로 — 이미지처럼 보이기만 (누르기·스크롤 안 됨) */}
                <LivePreviewFrame src="/preview/owner?tab=reservations" title="예약 관리 미리보기" viewportWidth={1280} viewportHeight={800} />

                {/* 카카오 알림 뱃지 — 이미지 우상단 */}
                <div className="badge-kakao" style={{ position: "absolute", top: 20, right: 20, zIndex: 10, background: "#FEE500", borderRadius: 14, padding: "10px 14px", boxShadow: "0 8px 24px rgba(254,229,0,0.35)", animation: "floatY 4s ease-in-out infinite 0.8s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💬</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#3C1E1E" }}>예약 확정 알림 발송</div>
                      <div style={{ fontSize: 11, color: "rgba(60,30,30,0.6)" }}>이민준님 · 방금 전</div>
                    </div>
                  </div>
                </div>

                {/* 이번 달 예약 통계 뱃지 — 이미지 좌하단 */}
                <div className="badge-stats" style={{ position: "absolute", bottom: 44, left: 20, zIndex: 10, background: "rgba(20,15,10,0.7)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "12px 18px", animation: "floatY 5s ease-in-out infinite 1.5s" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>이번 달 예약</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "white", lineHeight: 1 }}>28건</div>
                  <div style={{ fontSize: 11, marginTop: 6, color: "#22c55e" }}>▲ 전월 대비 +12%</div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CAPABILITIES (Squarespace-style tabbed carousel) ── */}
      <section id="기능" className="pt-20 pb-16 bg-white" style={{ scrollMarginTop: 64 }}>
        <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
          <FadeIn>
            <p className="text-[13px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Features</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic text-neutral-900 leading-tight">
              상담을 줄여주는 도구들
            </h2>
            <p className="text-[14px] text-neutral-400 mt-3">반복되는 문의는 줄이고, 주문은 더 쉽게</p>
          </FadeIn>
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-8">
          <div
            className="flex overflow-x-auto md:justify-center"
            style={{ scrollbarWidth: "none", borderBottom: "1px solid #e5e5e5", WebkitOverflowScrolling: "touch" }}
          >
            <div className="shrink-0 w-4 md:hidden" />
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
            <div className="shrink-0 w-4 md:hidden" />
          </div>
        </div>

        {/* 카드 캐러셀 */}
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
              <div
                className="relative w-full overflow-hidden"
                style={{ height: "clamp(320px, 60vh, 580px)" }}
              >
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #f0ebe4 0%, #ddd0c4 100%)" }} />
                {cap.img && (
                  <picture className="absolute inset-0">
                    <source media="(min-width: 768px)" srcSet={cap.img} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cap.mobileImg} alt={cap.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
                  </picture>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,7,4,0.75) 0%, rgba(10,7,4,0.2) 40%, transparent 65%)" }} />
                <div className="absolute bottom-0 left-0 p-8 max-w-lg">
                  <h3 className="text-[clamp(1.3rem,2.8vw,1.8rem)] font-semibold text-white leading-snug mb-3">{cap.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>{cap.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section id="효과" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[13px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Before / After</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              상담이 이렇게 줄어듭니다
            </h2>
          </FadeIn>

          {/* 숫자 강조 */}
          <FadeIn>
            <div className="grid grid-cols-2 md:flex md:items-center md:justify-center mb-14">
              {[
                { num: "80%", label: "반복 문의 감소", sub: "상품·가격 질문이 링크로 해결" },
                { num: "0건", label: "놓치는 예약", sub: "모든 예약이 대시보드에 기록" },
                { num: "앱 없이", label: "바로 사용 가능", sub: "앱 다운로드 없이 링크 하나로" },
                { num: "24/7", label: "쉬는 날도 상담·예약", sub: "사장님이 자리를 비워도 OK" },
              ].map(({ num, label }, i) => (
                <div key={label} className="flex md:items-center">
                  <div className={`flex flex-col items-center text-center px-4 py-8 md:px-14 md:py-8 w-full
                    ${i % 2 === 0 ? "border-r border-neutral-200 md:border-r-0" : ""}
                    ${i < 2 ? "border-b border-neutral-200 md:border-b-0" : ""}
                  `}>
                    <div className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-semibold not-italic mb-1.5" style={{ color: "#2c2416" }}>{num}</div>
                    <div className="text-[14px] md:text-[16px] font-medium text-neutral-800">{label}</div>
                  </div>
                  {i < 3 && <div className="hidden md:block w-px h-16 bg-neutral-200 shrink-0" />}
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Before / After 비교 */}
          <FadeIn delay={100}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="rounded-2xl border border-neutral-200 p-7" style={{ background: "#fafafa" }}>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400 mb-5">지금 방식</p>
                <ul className="space-y-4">
                  {[
                    "카카오톡으로 상품 사진 일일이 전송",
                    "\"얼마예요?\" \"크기는요?\" 매번 답장",
                    "원하는 꽃을 하나하나 물어보기",
                    "상담 내용을 메모장에 따로 정리",
                    "쉬는 날엔 상담 및 예약 불가",
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
                    "상품 사진·가격은 메뉴판에서 바로 확인",
                    "대화형 상담이 원하는 꽃을 대신 물어봐요",
                    "상담 내용이 예약에 그대로 남아요",
                    "손님이 날짜·시간까지 직접 선택",
                    "24시간 상담·예약 접수",
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

      {/* ── HOW IT WORKS ── */}
      <section id="사용 방법" className="py-24" style={{ background: "#18130e", scrollMarginTop: 64 }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-[13px] tracking-[0.2em] uppercase mb-4" style={{ color: "rgba(201,169,110,0.7)" }}>How it works</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic text-white leading-tight">
              가입하고 상품 올리면<br />바로 준비 완료
            </h2>
          </FadeIn>
          <div className="relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-8 left-[6%] right-[6%] h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="grid md:grid-cols-5 gap-6 relative z-10">
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

      {/* ── PRICING ── */}
      <section id="요금제" className="py-24 bg-white" style={{ scrollMarginTop: 64 }}>
        <div className="max-w-4xl mx-auto px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-[13px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Pricing</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              합리적인 요금제
            </h2>
          </FadeIn>

          {/* 첫 달 무료 배너 */}
          <FadeIn>
            <div className="rounded-2xl mb-6 py-5 px-6 text-center" style={{ background: "linear-gradient(135deg, #2c2416 0%, #18130e 100%)" }}>
              <p className="text-[15px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "#c9a96e" }}>첫 1개월 무료 체험</p>
              <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.7)" }}>카드 등록 없이 가입만 하면 30일, 모든 기능을 무료로 이용해 보세요</p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="max-w-lg mx-auto">
              <div className="rounded-2xl border p-7 sm:p-10 bg-white" style={{ borderColor: pricingCycle === "annual" ? "#e8ddc9" : "#e5e5e5" }}>

                {/* 토글 */}
                <div className="flex justify-center mb-8">
                  <div className="flex rounded-full p-1" style={{ background: "#f3ede4" }}>
                    {(["monthly", "annual"] as const).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => setPricingCycle(cycle)}
                        className="relative px-6 py-2 rounded-full text-[15px] font-semibold transition-all"
                        style={{
                          background: pricingCycle === cycle ? "#2c2416" : "transparent",
                          color: pricingCycle === cycle ? "white" : "#9a8a7a",
                        }}
                      >
                        {cycle === "monthly" ? "월간" : "연간"}
                        {cycle === "annual" && pricingCycle !== "annual" && (
                          <span className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#c9a96e", color: "white" }}>추천</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 가격 */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-1" style={{ visibility: pricingCycle === "annual" ? "visible" : "hidden" }}>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,169,110,0.15)", color: "#9a7a3a" }}>
                      {ANNUAL_DISCOUNT_RATE}% 할인 · 연 ₩{(PLAN_PRICES.monthly * 12 - PLAN_PRICES.annualTotal).toLocaleString()} 절약
                    </span>
                  </div>
                  <div className="flex items-end justify-center gap-1.5">
                    <span className="text-[3.2rem] font-semibold leading-none" style={{ color: "#2c2416" }}>
                      ₩{(pricingCycle === "annual" ? PLAN_PRICES.annual : PLAN_PRICES.monthly).toLocaleString()}
                    </span>
                    <span className="text-[16px] font-medium text-neutral-400 mb-2">/ 월</span>
                  </div>
                  <p className="text-[13px] text-neutral-400 mt-1.5" style={{ visibility: pricingCycle === "annual" ? "visible" : "hidden" }}>
                    연 ₩{PLAN_PRICES.annualTotal.toLocaleString()} 일괄 결제
                  </p>
                </div>

                {/* 혜택 목록 */}
                <ul className="space-y-3.5 mb-8">
                  {PLAN_FEATURES.map((item, i) => (
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
                  className="block text-center py-3.5 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90"
                  style={{ background: "#2c2416", color: "#fff" }}
                >
                  {pricingCycle === "annual" ? "연간 구독 시작하기" : "월간 구독 시작하기"}
                </a>
                <p className="text-[11px] text-neutral-400 text-center mt-3">카드 수수료는 정책에 따라 변경될 수 있습니다.</p>
              </div>
            </div>

          </FadeIn>
        </div>
      </section>

      {/* ── Q&A ── */}
      <section id="Q&A" className="py-24 bg-white" style={{ scrollMarginTop: 64 }}>
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="mb-12">
            <p className="text-[13px] tracking-[0.2em] uppercase text-neutral-400 mb-3">Q&A</p>
            <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold not-italic leading-tight" style={{ color: "#2c2416" }}>
              자주 묻는 질문
            </h2>
          </FadeIn>
          <div className="bg-white rounded-2xl px-8 py-2" style={{ border: "1px solid #d4d4d4", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {faqs.map((faq, i) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} isLast={i === faqs.length - 1} />
            ))}
          </div>
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
            오늘 무료로<br />우리 가게 상담 링크를 만들어보세요
          </h2>
          <p className="text-[15px] mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
            한달 무료 기간에 모든 혜택을 경험해 보세요
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
              <a href="/refund/subscription" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">구독 환불정책</a>
              <a href="/refund" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">주문 환불정책</a>
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
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap');
        @keyframes fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes revolve {
          0%, 100% { transform: rotateY(-12deg); }
          50% { transform: rotateY(12deg); }
        }
        @media (max-width: 768px) {
          .postit-card { aspect-ratio: 4/3 !important; }
          .spotlight-wrap { height: 450px !important; width: 80% !important; margin: 0 auto !important; }
          .spotlight-img { height: 430px !important; object-fit: contain !important; }
          .badge-desktop-only { display: none !important; }

          /* 이미지 중앙 정렬: width 78% 기준 (100-78)/2 = 11% */
          .spotlight-img-wrapper { left: 11% !important; top: 24px !important; bottom: auto !important; }
          .spotlight1-overlay { align-items: flex-start !important; }
          .spotlight2-section { align-items: flex-start !important; }

          /* Spotlight 2 모바일 compact */
          .spotlight2-container { width: min(68vw, 260px) !important; min-height: clamp(260px, 48vh, 360px) !important; }
          .spotlight2-card { padding: 8px 12px 6px !important; margin-bottom: 4px !important; border-radius: 10px !important; }
          .spotlight2-step { margin-bottom: 1px !important; font-size: 9px !important; }
          .spotlight2-title { font-size: 12px !important; margin-bottom: 6px !important; }
          .spotlight2-item { padding: 5px 7px !important; font-size: 11px !important; }
          .spotlight3-wrap { width: 100% !important; margin: 0 auto !important; }

          /* Spotlight 1 뱃지 모바일 재배치 */
          .badge-order { left: auto !important; right: 120 !important; top: 50px !important; }
          .badge-color { right: auto !important; left: 190px !important; bottom: 24px !important; }

          /* Spotlight 3 뱃지 모바일 재배치 */
          .badge-kakao { top: 14px !important; right: -16px !important; left: auto !important; }
          .badge-stats { bottom: 30px !important; left: -20px !important; }
        }
      `}</style>
    </div>
  );
}
