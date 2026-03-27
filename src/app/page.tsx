"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FloAideFooter from "@/components/FloAideFooter";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-light tracking-widest text-gold-500">Flo.Aide</span>
          <Link href="/login" className="text-sm bg-gold-500 text-white px-4 py-2 rounded-lg hover:bg-gold-600 transition-colors">
            로그인
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative bg-beige-50 overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold-400/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-beige-200/60 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-36">
          <div className="max-w-2xl">
            {/* 배지 */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(12px)",
                transition: "opacity 0.5s ease 0ms, transform 0.5s ease 0ms",
              }}
              className="inline-flex items-center gap-2 bg-white border border-beige-200 rounded-full px-4 py-1.5 mb-6 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">꽃집 사장님을 위한 서비스</span>
            </div>

            <h1
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 100ms, transform 0.6s ease 100ms",
              }}
              className="text-4xl md:text-5xl font-light text-gray-900 leading-tight mb-6"
            >
              매일 반복되는 상담,<br />
              <span className="text-gold-500">이제 줄일 수 있습니다</span>
            </h1>

            <p
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 200ms, transform 0.6s ease 200ms",
              }}
              className="text-gray-500 text-lg leading-relaxed mb-10"
            >
              나만의 전자 메뉴판으로 손님이 직접 상품을 확인하고,<br className="hidden sm:block" />
              예약부터 매출까지 한 곳에서 관리하세요.
            </p>

            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 300ms, transform 0.6s ease 300ms",
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-gold-500 text-white px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors shadow-md shadow-gold-200"
              >
                시작하기
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* 플로팅 카드 */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s ease 400ms, transform 0.8s ease 400ms",
            }}
            className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-3 w-56"
          >
            {[
              { icon: "🌸", label: "전자 메뉴판", sub: "링크 하나로 공유" },
              { icon: "📅", label: "예약 관리", sub: "달력 뷰 제공" },
              { icon: "📊", label: "매출 통계", sub: "채널별 분석" },
            ].map(({ icon, label, sub }, i) => (
              <div
                key={label}
                className="bg-white border border-beige-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3"
                style={{ transform: `translateX(${i % 2 === 1 ? "12px" : "0"})` }}
              >
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900">{label}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 숫자로 보는 효과 */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { value: "2분", label: "평균 상품 등록 시간" },
              { value: "링크 1개", label: "손님 공유에 필요한 것" },
              { value: "한 곳에서", label: "모든 예약·매출 관리" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-4 py-2">
                <p className="text-2xl font-light text-gold-500 mb-1">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 핵심 기능 3가지 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeIn className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Core Features</p>
          <h2 className="text-2xl font-light text-gray-900">핵심 기능 3가지</h2>
        </FadeIn>

        <div className="space-y-6">
          {[
            {
              tag: "전자 메뉴판",
              title: "나만의 사이트를\n가질 수 있어요",
              desc: "앱 설치 없이 링크 하나로 손님에게 상품을 소개합니다. 이미지·가격·시즌 정보를 깔끔하게 정리하고, 카카오·인스타·네이버 채널 버튼도 함께 노출할 수 있습니다.",
              points: ["상품 사진·가격·유형·시즌 관리", "추천·시즌·전체 카테고리 분류", "SNS·채널 버튼 연결"],
              color: "bg-amber-50 border-amber-100",
              emoji: "🌿",
            },
            {
              tag: "맞춤 주문 예약",
              title: "반복 상담 시간을\n줄여드립니다",
              desc: "\"꽃을 만들려고 꽃집을 차렸지, 상담하려고 차린 건 아닌데...\"라는 생각, 해보셨나요? \"얼마예요?\", \"n만원 샘플 이미지좀 보내주세요\" 같은 반복 질문이 줄어듭니다. 손님이 직접 원하는 스타일·예산·날짜를 선택해 예약하면 관리자에게 알림이 전송됩니다.",
              points: ["원하는 상품·분위기·예산 선택", "희망 날짜 및 수령 방법 선택", "예약 접수 시 이메일 알림"],
              color: "bg-rose-50 border-rose-100",
              emoji: "💌",
            },
            {
              tag: "예약·매출 관리",
              title: "흩어진 내역을\n한 곳에서 정리",
              desc: "네이버·카카오·워크인 등 여러 채널의 예약을 하나의 대시보드에서 관리합니다. 예약 상태 변경, 결제 관리, 월별 매출 통계까지 한눈에 확인하세요.",
              points: ["채널별 예약 구분 관리", "월별 매출 차트 및 통계", "고객 프로필 자동 생성"],
              color: "bg-sky-50 border-sky-100",
              emoji: "📋",
            },
          ].map(({ tag, title, desc, points, color, emoji }, i) => (
            <FadeIn key={tag} delay={i * 100}>
              <div className={`border rounded-2xl p-8 md:p-10 ${color}`}>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                    <span className="inline-block text-xs font-semibold tracking-widest text-gold-500 uppercase mb-3">{tag}</span>
                    <h3 className="text-2xl font-light text-gray-900 mb-4 whitespace-pre-line">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">{desc}</p>
                    <ul className="space-y-2">
                      {points.map(p => (
                        <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:w-48 flex items-center justify-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/70 border border-white shadow-sm flex items-center justify-center text-6xl">
                      {emoji}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 이런 순서로 사용해요 */}
      <section className="bg-beige-50 border-y border-beige-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">How It Works</p>
            <h2 className="text-2xl font-light text-gray-900">이렇게 시작하세요</h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "계정 발급", desc: "운영자에게 계정을 받고 로그인합니다." },
              { step: "02", title: "상품 등록", desc: "판매 중인 상품을 사진·가격과 함께 등록합니다." },
              { step: "03", title: "링크 공유", desc: "나만의 메뉴 URL을 SNS·카카오톡에 공유합니다." },
              { step: "04", title: "예약 관리", desc: "들어오는 예약을 대시보드에서 한눈에 관리합니다." },
            ].map(({ step, title, desc }, i) => (
              <FadeIn key={step} delay={i * 100}>
                <div className="bg-white border border-beige-200 rounded-2xl p-6 relative">
                  <span className="text-4xl font-light text-beige-200 absolute top-4 right-5">{step}</span>
                  <p className="text-sm font-medium text-gray-900 mb-2 mt-1">{title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 부가 기능 */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeIn className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">More Features</p>
          <h2 className="text-2xl font-light text-gray-900">그 밖에도 이런 기능이 있어요</h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: "🗓", title: "달력 뷰", desc: "월별 달력으로 날짜별 예약 현황을 한눈에 확인합니다." },
            { icon: "👤", title: "고객 프로필", desc: "전화번호 기준으로 단골 고객을 인식하고 이력을 관리합니다." },
            { icon: "📦", title: "상품 상태 관리", desc: "활성·비활성·품절 전환으로 메뉴를 실시간으로 조절합니다." },
            { icon: "🎨", title: "테마 커스텀", desc: "내 가게 분위기에 맞게 사이트 색상을 자유롭게 설정합니다." },
            { icon: "🔔", title: "예약 알림", desc: "새 예약이 들어오면 이메일로 즉시 알림을 받습니다." },
            { icon: "📍", title: "매장 정보 연결", desc: "네이버 지도, 카카오맵 링크를 연결해 위치를 안내합니다." },
          ].map(({ icon, title, desc }, i) => (
            <FadeIn key={title} delay={i * 60}>
              <div className="border border-gray-100 rounded-xl p-5 hover:border-beige-300 hover:bg-beige-50 transition-colors">
                <span className="text-2xl block mb-3">{icon}</span>
                <p className="text-sm font-medium text-gray-900 mb-1">{title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* QnA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeIn className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">FAQ</p>
          <h2 className="text-2xl font-light text-gray-900">자주 묻는 질문</h2>
        </FadeIn>

        <div className="space-y-3 max-w-2xl mx-auto">
          {[
            {
              q: "앱을 따로 설치해야 하나요?",
              a: "아니요. 손님은 링크만 클릭하면 바로 메뉴를 볼 수 있습니다. 사장님도 웹 브라우저에서 바로 관리할 수 있어 별도 앱 설치가 필요 없습니다.",
            },
            {
              q: "네이버 스마트스토어나 카카오 예약과 함께 쓸 수 있나요?",
              a: "네, 기존 채널을 그대로 유지하면서 함께 사용할 수 있습니다. 네이버·카카오·워크인 예약을 Flo.Aide에서 한 번에 모아서 관리할 수 있습니다.",
            },
            {
              q: "상품 등록이 어렵지 않나요?",
              a: "사진·이름·가격·유형을 입력하면 끝입니다. 평균 2분 내로 등록할 수 있으며, 이후 수정·삭제도 간편합니다.",
            },
            {
              q: "모바일에서도 사용할 수 있나요?",
              a: "네, 손님 메뉴 화면과 관리자 대시보드 모두 모바일에 최적화되어 있습니다. 스마트폰으로도 예약 확인, 상태 변경, 상품 관리를 편하게 할 수 있습니다.",
            },
            {
              q: "요금은 어떻게 되나요?",
              a: "현재는 운영자를 통해 계정을 발급받는 방식으로 운영됩니다. 자세한 요금은 도입 문의를 통해 안내드립니다.",
            },
          ].map(({ q, a }, i) => (
            <FadeIn key={q} delay={i * 60}>
              <div className="border border-gray-100 rounded-xl p-6 hover:border-beige-300 transition-colors">
                <p className="text-sm font-medium text-gray-900 mb-2 flex items-start gap-2">
                  <span className="text-gold-400 shrink-0">Q.</span>{q}
                </p>
                <p className="text-sm text-gray-400 leading-relaxed pl-5">{a}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-beige-50 border-y border-beige-100">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <FadeIn>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-4">Get Started</p>
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              지금 바로 시작해보세요
            </h2>
            <p className="text-sm text-gray-400 mb-10 leading-relaxed">
              서비스 도입 문의는 아래 이메일로 연락해주세요.<br />
              빠르게 계정을 발급해드립니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gold-500 text-white px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors shadow-md shadow-gold-200"
              >
                로그인하기
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href="mailto:kk3500@naver.com"
                className="inline-flex items-center gap-2 border border-beige-300 text-gray-600 px-8 py-3.5 rounded-xl text-sm font-medium hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                도입 문의하기
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 푸터 */}
      <div className="bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <FloAideFooter />
        </div>
      </div>

    </div>
  );
}
