"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PLAN_PRICES, PLAN_FEATURES } from "@/lib/constants";

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
const hero = { tag: "전자 메뉴판 & 예약 관리", headline: "상담 시간은 줄이고\n예약은 편리하게", sub: "링크 하나로 상품을 소개하고\n예약을 받으세요.", bg: "/landing/hero-menu.webp" };

const capabilities = [
  { title: "전자 메뉴판", desc: "앱 없이 링크만으로 상품 카탈로그를 공유하세요.", img: "/landing/cap-menu.webp", mobileImg: "/landing/cap-menu-m.webp" },
  { title: "맞춤 주문", desc: "고객이 직접 꽃 종류, 예산, 색상을 선택합니다.", img: "/landing/cap-order.webp", mobileImg: "/landing/cap-order-m.webp" },
  { title: "링크결제", desc: "전화·DM으로 받은 주문도 결제 링크 하나로 카드 결제까지 받으세요.", img: "", mobileImg: "" },
  { title: "예약 관리", desc: "월별로 모든 예약을 한눈에 확인하세요.", img: "/landing/cap-reservation.webp", mobileImg: "/landing/cap-reservation-m.webp" },
  { title: "카카오 알림", desc: "예약 확인, 확정, 취소 알림을 자동으로 발송합니다.", img: "/landing/cap-kakao.webp", mobileImg: "/landing/cap-kakao-m.webp" },
  { title: "매출 분석", desc: "어떤 상품이 잘 팔리는지 데이터로 확인하세요.", img: "/landing/cap-stats.webp", mobileImg: "/landing/cap-stats-m.webp" },
  { title: "나만의 링크", desc: "flo-aide.com/내가게주소로 브랜드를 만드세요.", img: "/landing/cap-link.webp", mobileImg: "/landing/cap-link-m.webp" },
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
  { q: "상품은 몇 개까지 등록할 수 있나요?", a: "상품은 최대 100개까지 등록 할 수 있습니다." },
  { q: "고객이 예약하면 제가 직접 확정해야 하나요, 아니면 자동으로 되나요?", a: "기본적으로 관리자가 직접 확정하는 방식입니다. 예약 요청이 들어오면 알림을 받고, 관리 페이지에서 판매 가능한 예약건인지 확인 후 확정 또는 취소 처리를 할 수 있습니다." },
  { q: "메뉴에 가격을 표시하지 않을 수 있나요?", a: "네. 상품을 추가할 때 가격을 입력하지 않으면 가격이 표시되지 않습니다." },
  { q: "카카오 알림은 어떻게 작동하나요?", a: "고객이 예약을 완료하면 관리자에게, 관리자가 예약을 확정하거나 취소하면 고객 카카오톡으로 알림이 발송됩니다." },
  { q: "비용은 얼마인가요?", a: `첫 1개월은 무료 체험입니다. 이후 월간 플랜 월 ${PLAN_PRICES.monthly.toLocaleString()}원, 연간 플랜 월 ${PLAN_PRICES.annual.toLocaleString()}원(연 ${PLAN_PRICES.annualTotal.toLocaleString()}원 일괄 결제)으로 이용하실 수 있습니다. 두 플랜 모두 맞춤 주문·예약·통계·카카오 알림 등 모든 기능이 포함되며, 결제 수수료는 2%(카드 수수료 포함)이고 정책에 따라 변경될 수 있습니다.` },
];

export default function Landing() {
  const [pricingCycle, setPricingCycle] = useState<"monthly" | "annual">("annual");
  const [scrolled, setScrolled] = useState(false);
  const [activeCap, setActiveCap] = useState(0);
  const capCarouselRef = useRef<HTMLDivElement>(null);
  const [painProgress, setPainProgress] = useState(0);
  const painRef = useRef<HTMLDivElement>(null);
  const [step2Visible, setStep2Visible] = useState(false);
  const [step3Visible, setStep3Visible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [cursorPos, setCursorPos] = useState<{ y: number; clicking: boolean } | null>(null);
  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cardsWrapperRef = useRef<HTMLDivElement>(null);

  const getOptY = (cardIdx: number, optIdx: number): number => {
    const wrapper = cardsWrapperRef.current;
    if (!wrapper) return 200;
    const card = wrapper.querySelector(`[data-card="${cardIdx}"]`) as HTMLElement;
    if (!card) return 200;
    const opt = card.querySelector(`[data-opt="${optIdx}"]`) as HTMLElement;
    if (!opt) return 200;
    return card.offsetTop + opt.offsetTop + opt.offsetHeight / 2;
  };

  useEffect(() => {
    const push = (fn: () => void, delay: number) => {
      animTimers.current.push(setTimeout(fn, delay));
    };
    const start = () => {
      animTimers.current.forEach(clearTimeout);
      animTimers.current = [];
      setStep2Visible(false);
      setStep3Visible(false);
      setImageVisible(false);
      setSelected({});
      push(() => setCursorPos({ y: getOptY(0, 0) - 80, clicking: false }), 0);

      // STEP 1: 클릭 후 그 자리에서 대기
      push(() => setCursorPos({ y: getOptY(0, 0), clicking: false }), 150);
      push(() => setCursorPos({ y: getOptY(0, 0), clicking: true }), 600);
      push(() => { setSelected((s) => ({ ...s, 0: 0 })); setCursorPos({ y: getOptY(0, 0), clicking: false }); }, 750);
      // 300ms 후 STEP 2 등장 → 이동
      push(() => setStep2Visible(true), 1050);
      push(() => setCursorPos({ y: getOptY(1, 0), clicking: false }), 1250);
      // STEP 2: 클릭
      push(() => setCursorPos({ y: getOptY(1, 0), clicking: true }), 1750);
      push(() => { setSelected((s) => ({ ...s, 1: 0 })); setCursorPos({ y: getOptY(1, 0), clicking: false }); }, 1900);
      // 300ms 후 STEP 3 등장 → 이동
      push(() => setStep3Visible(true), 2200);
      push(() => setCursorPos({ y: getOptY(2, 2), clicking: false }), 2400);
      // STEP 3: 클릭 후 0.5초 대기
      push(() => setCursorPos({ y: getOptY(2, 2), clicking: true }), 2900);
      push(() => { setSelected((s) => ({ ...s, 2: 2 })); setCursorPos({ y: getOptY(2, 2), clicking: false }); }, 3050);
      // 이미지 슬라이드
      push(() => setImageVisible(true), 3550);
      push(() => setCursorPos(null), 3650);
      push(() => start(), 6200);
    };
    start();
    return () => animTimers.current.forEach(clearTimeout);
  }, []);

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
                  플로에이드가<br />해결해드립니다
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
                    꽃집 사장님들의 불편함
                  </h2>
                </div>

                {(() => {
                  const allPostIts = [
                    { quote: "내 홈페이지를\n가지고 싶어요",                       fly: { x: -160, y: -110, r: -28 }, rotate: -8  },
                    { quote: "비슷한 내용의\n상담에 시간을\n많이 쓰고 있어요",        fly: { x: -130, y: -110, r: -30 }, rotate: -2  },
                    { quote: "손님이 상품을\n문의할 때마다\n사진 찾는 게 번거로워요",   fly: { x: 130, y: -110, r: 30 }, rotate: 2.5 },
                    { quote: "색감별로 또는\n분위기별로 상품을\n한번에 안내하고 싶어요", fly: { x: 160, y: -110, r: 32 }, rotate: -7   },
                    { quote: "영업 중에도\n문의가 너무\n많아요",                   fly: { x: -160, y: 110, r: -28 }, rotate: 6  },
                    { quote: "상품을 한번에\n소개할 수 있는\n메뉴판이 필요해요",       fly: { x: -130, y: 110, r: -25 }, rotate: -1.5 },
                    { quote: "흩어진 예약 정보를\n한 곳에서\n보고 싶어요",           fly: { x: 130, y: 110, r: 25 }, rotate: 3   },
                    { quote: "SNS 사진만으론\n상품 안내가\n부족해요",              fly: { x: 160, y: 110, r: 30 }, rotate: -3   },
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

              {/* 스포트라이트 1번 — 페이드인 오버레이 */}
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
                    <p className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase mb-3 md:mb-5 font-medium" style={{ color: "#c9a96e" }}>전자 메뉴판</p>
                    <h2 className="font-semibold text-white leading-[1.15] mb-3 md:mb-6" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", whiteSpace: "pre-line" }}>{"어플 설치 없이\n링크 하나로 충분합니다"}</h2>
                    <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                      사진·가격·설명을 한 번 등록하면, 고객은 링크를 열어 직접 보고 고릅니다.
                    </p>
                    <ul className="space-y-2 md:space-y-3">
                      {["앱 설치 없이 링크만으로 바로 접속", "색상·분위기·포장 필터로 원하는 상품 탐색", "PC·모바일 모두 지원 — 어떤 기기에서나 바로 사용"].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-[13px] md:text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold" style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-center md:justify-end md:-mr-4">
                    <div className="relative spotlight-wrap" style={{ width: "clamp(260px, 50vw, 420px)", height: 760 }}>
                      {/* 앞 캡처 */}
                      <div className="spotlight-img-wrapper absolute overflow-hidden" style={{ bottom: 0, left: "-10%", width: "78%", borderRadius: 14, transform: "translateY(-8px)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)", zIndex: 2 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="spotlight-img" src="/landing/screen-menu1.webp" alt="전자 메뉴판 화면" loading="lazy" style={{ width: "100%", height: 680, objectFit: "cover", objectPosition: "top", display: "block" }} />
                      </div>

                      {/* 맞춤 주문 버튼 */}
                      <div className="badge-order" style={{ position: "absolute", top: 50, left: -100, zIndex: 10, display: "flex", alignItems: "center", gap: 8, background: "#b8934a", borderRadius: 999, padding: "10px 18px", boxShadow: "0 8px 24px rgba(184,147,74,0.4)", animation: "floatY 4s ease-in-out infinite" }}>
                        <span style={{ fontSize: 15 }}>✨</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>맞춤 주문하기</span>
                      </div>

                      {/* 색상 필터 뱃지 */}
                      <div className="badge-color" style={{ position: "absolute", bottom: 60, right: 70, zIndex: 10, background: "white", borderRadius: 14, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", animation: "floatY 5s ease-in-out infinite 1s" }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "#b8934a", margin: "0 0 8px", letterSpacing: "0.05em" }}>색상</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {[
                            { label: "핑크색", hex: "#f472b6", active: true },
                            { label: "하얀색", hex: "#f5f5f5", active: false },
                            { label: "보라색", hex: "#a855f7", active: false },
                          ].map((c) => (
                            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 12, border: `1px solid ${c.active ? "#b8934a" : "#e5e7eb"}`, background: c.active ? "#b8934a" : "transparent", color: c.active ? "white" : "#4b5563" }}>
                              <span style={{ width: 10, height: 10, borderRadius: 999, background: c.hex, border: "1px solid rgba(255,255,255,0.4)", flexShrink: 0, display: "inline-block" }} />
                              {c.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 링크 공유 뱃지 — 데스크탑 전용 */}
                      <div className="badge-desktop-only" style={{ position: "absolute", top: 400, left: -150, zIndex: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(12px)", borderRadius: 10, padding: "8px 14px", animation: "floatY 6s ease-in-out infinite 0.5s" }}>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: "0 0 3px" }}>공유 링크</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "white", margin: 0 }}>flo-aide.com/<span style={{ color: "#c9a96e" }}>내꽃집</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* ── FEATURE SPOTLIGHT — 3 핵심 기능 ── */}

      {/* 02 맞춤 주문 — 자동 애니메이션 */}
      <section className="spotlight2-section relative bg-white overflow-hidden" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{ width: 700, height: 700, bottom: -200, right: -100, background: "radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 65%)" }} />
          <div className="absolute" style={{ width: 500, height: 500, top: -100, left: -100, background: "radial-gradient(circle, rgba(210,120,130,0.05) 0%, transparent 65%)" }} />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8 w-full pt-28 pb-10 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 items-center">
          <FadeIn>
            <p className="text-[11px] md:text-[12px] tracking-[0.3em] uppercase mb-3 md:mb-5 font-medium" style={{ color: "#c9a96e" }}>맞춤 주문</p>
            <h2 className="font-semibold leading-[1.15] mb-3 md:mb-6" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", color: "#2c2416", whiteSpace: "pre-line" }}>{"고객이 직접 고르고\n주문하도록 하세요"}</h2>
            <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-8 text-neutral-500">
              꽃 종류, 색상, 포장, 예산, 원하는 분위기까지 — 고객이 단계별로 직접 선택합니다.
            </p>
            <ul className="space-y-2 md:space-y-3">
              {["꽃·색상·포장·예산·분위기 선택 폼 제공", "주문 접수 즉시 관리자에게 알림"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-[13px] md:text-[14px] text-neutral-600">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold" style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 md:mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium" style={{ background: "rgba(201,169,110,0.1)", color: "#9a7a3a", border: "1px solid rgba(201,169,110,0.3)" }}>
              <span>📋</span> 사업자 등록증·통장 사본 제출로 신청
            </div>
          </FadeIn>

          {/* 오른쪽: 자동 애니메이션 */}
          {(() => {
            const cardData = [
              { step: "STEP 1", title: "상품 형태", visible: true, items: ["꽃다발", "꽃바구니", "센터피스", "화병꽂이"], active: "꽃다발" },
              { step: "STEP 2", title: "선호하는 분위기", visible: step2Visible, items: ["화사한 파스텔톤", "깔끔한 화이트", "차분한 딥컬러"], active: "화사한 파스텔톤" },
              { step: "STEP 3", title: "희망 예산", visible: step3Visible, items: ["5만원", "7만원", "10만원"], active: "7만원" },
            ];
            return (
              <div className="flex justify-center">
                <div className="spotlight2-container" style={{ width: "clamp(260px, 50vw, 360px)", position: "relative", overflow: "hidden", minHeight: "clamp(280px, 50vh, 460px)" }}>
                  {/* 스텝 카드 — 이미지가 오면 왼쪽으로 밀려남 */}
                  <div ref={cardsWrapperRef} style={{
                    transform: imageVisible ? "translateX(-110%)" : "translateX(0%)",
                    transition: "transform 0.65s cubic-bezier(0.4,0,0.2,1)",
                    willChange: "transform",
                  }}>
                    {cardData.map((card, cardIdx) => (
                      <div
                        key={card.step}
                        data-card={cardIdx}
                        className="spotlight2-card"
                        style={{
                          background: "white",
                          border: "1px solid #ede8e0",
                          borderRadius: 16,
                          padding: "16px 20px 14px",
                          marginBottom: 10,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                          opacity: card.visible ? 1 : 0,
                          transform: card.visible ? "translateY(0)" : "translateY(18px)",
                          transition: "opacity 0.4s ease, transform 0.4s ease",
                          willChange: "transform, opacity",
                        }}
                      >
                        <p className="spotlight2-step" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c9a96e", marginBottom: 4 }}>{card.step}</p>
                        <p className="spotlight2-title" style={{ fontSize: 15, fontWeight: 600, color: "#2c2416", marginBottom: 12 }}>{card.title}</p>
                        {card.items.map((v, optIdx) => {
                          const isChosen = selected[cardIdx] === optIdx;
                          return (
                            <div
                              key={v}
                              data-opt={optIdx}
                              className="spotlight2-item"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "9px 10px",
                                borderTop: optIdx === 0 ? "none" : "1px solid #e8e0d5",
                              }}
                            >
                              <span style={{ fontSize: 13, color: isChosen ? "#2c2416" : "#b0a090", fontWeight: isChosen ? 600 : 400, transition: "color 0.3s ease" }}>{v}</span>
                              {isChosen
                                ? <span style={{ width: 18, height: 18, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: "#2c2416", color: "white", flexShrink: 0 }}>✓</span>
                                : <span style={{ width: 18, height: 18, borderRadius: 999, border: "1.5px solid #d8d0c8", display: "inline-block", flexShrink: 0 }} />
                              }
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {/* 터치 인디케이터 */}
                  {cursorPos && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: cursorPos.y,
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.22)",
                        transform: `translate(-50%, -50%) scale(${cursorPos.clicking ? 0.6 : 1})`,
                        transition: "top 0.45s cubic-bezier(0.25,0.1,0.25,1), transform 0.12s ease",
                        pointerEvents: "none",
                        zIndex: 30,
                      }}
                    />
                  )}

                  {/* 이미지 — 오른쪽에서 스윽 */}
                  <div style={{
                    position: "absolute", inset: 0,
                    transform: imageVisible ? "translateX(0%)" : "translateX(110%)",
                    transition: "transform 0.65s cubic-bezier(0.4,0,0.2,1)",
                    borderRadius: 16, overflow: "hidden",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
                    willChange: "transform",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/landing/screen-consult.webp" alt="맞춤 주문 화면" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
                  </div>
                </div>
              </div>
            );
          })()}
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
              <h2 className="font-semibold text-white leading-[1.15] mb-3 md:mb-5" style={{ fontSize: "clamp(1.5rem,4.5vw,3.4rem)", whiteSpace: "pre-line" }}>{"모든 예약을\n한눈에 관리하세요"}</h2>
              <p className="text-[13px] md:text-[15px] leading-relaxed mb-4 md:mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
                언제 예약이 몰리는지 파악하고, 예약 확정·취소를 버튼 하나로 처리합니다. 확정하면 고객 카카오톡으로 알림이 자동 발송됩니다.
              </p>
              <ul className="space-y-2 md:space-y-3">
                {["월별로 예약 현황 한눈에 파악", "예약 확정 시 카카오 알림 자동 발송", "인기 상품·매출 통계 분석"].map((item) => (
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
                <picture>
                  <source media="(min-width: 768px)" srcSet="/landing/screen-reservation1.webp" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="spotlight3-img"
                    src="/landing/screen-reservation1-m.webp"
                    alt="예약 관리 대시보드"
                    loading="lazy"
                    style={{ width: "100%", display: "block", objectFit: "cover", objectPosition: "top" }}
                  />
                </picture>

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
              꽃집 운영에 필요한 모든 도구
            </h2>
            <p className="text-[14px] text-neutral-400 mt-3">하나의 플랫폼에서 누리는 올인원 솔루션</p>
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
              하루가 이렇게 바뀝니다
            </h2>
          </FadeIn>

          {/* 숫자 강조 */}
          <FadeIn>
            <div className="grid grid-cols-2 md:flex md:items-center md:justify-center mb-14">
              {[
                { num: "80%", label: "반복 문의 감소", sub: "상품·가격 질문이 링크로 해결" },
                { num: "0건", label: "놓치는 예약", sub: "모든 예약이 대시보드에 기록" },
                { num: "앱 없이", label: "바로 사용 가능", sub: "앱 다운로드 없이 링크 하나로" },
                { num: "24/7", label: "쉬는 날도 예약 접수", sub: "관리자가 자리를 비워도 OK" },
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
                    "\"얼마예요?\" 질문에 매번 답장",
                    "예약 날짜·시간 수동으로 조율",
                    "메모장·엑셀로 예약 관리",
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
              <p className="text-[16px]" style={{ color: "rgba(255,255,255,0.7)" }}>카드 등록 후 30일, 구독료 없이 모든 기능을 이용해 보세요</p>
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
                      연 ₩60,000 절약
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
                <p className="text-[11px] text-neutral-400 text-center mt-3">결제 수수료는 정책에 따라 변경될 수 있습니다.</p>
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
            오늘 무료로<br />꽃집 메뉴판을 만들어보세요
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
          .spotlight-wrap { height: 500px !important; width: 80% !important; margin: 0 auto !important; }
          .spotlight-img { height: 490px !important; object-fit: contain !important; }
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
          .spotlight3-wrap { width: 68% !important; margin: 0 auto !important; }
          .spotlight3-img { object-fit: contain !important; max-height: 60vh !important; }

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
