import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "미리보기 | Flo.Aide",
  description: "손님이 보는 메뉴판과 사장님이 쓰는 관리 화면을 직접 눌러보며 둘러보세요.",
  alternates: { canonical: "/preview" },
};

const GOLD = "#c9a96e";

const PATHS = [
  {
    href: "/preview/customer",
    tag: "Customer",
    title: "손님 화면",
    desc: "링크 하나로 메뉴판을 보고\n맞춤 주문부터 결제까지",
    points: ["전자 메뉴판", "맞춤 주문 추천", "장바구니 · 결제"],
    img: "/preview/cover-customer.webp",
    alt: "손님이 보는 메뉴판 화면",
  },
  {
    href: "/preview/owner",
    tag: "Owner",
    title: "사장님 화면",
    desc: "들어온 예약을 확인하고\n매출과 정산까지 한눈에",
    points: ["예약 확정 · 상태 관리", "통계 · 유입 분석", "정산"],
    img: "/preview/cover-owner.webp",
    alt: "사장님이 쓰는 예약 관리 화면",
  },
];

// 미리보기 시작 화면 — 손님 화면 / 사장님 화면 중 하나를 골라 둘러본다
export default function PreviewPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden" style={{ background: "#18130e" }}>
      {/* 보케 블롭 (랜딩 히어로와 같은 톤) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: "-12%", left: "-10%", background: "radial-gradient(circle, rgba(210,120,130,0.18) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute rounded-full" style={{ width: 520, height: 520, bottom: "-15%", left: "20%", background: "radial-gradient(circle, rgba(110,155,110,0.14) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute rounded-full" style={{ width: 460, height: 460, top: "10%", right: "-8%", background: "radial-gradient(circle, rgba(201,169,110,0.16) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image src="/logo-dark.png" alt="Flo.Aide" width={84} height={27} className="object-contain" />
        </Link>
        <Link
          href="/login"
          className="text-[13px] px-4 py-2 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{ background: "white", color: "#18130e" }}
        >
          무료로 시작하기
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-14 pb-16 md:pb-24">
        {/* 타이틀 */}
        <div className="text-center mb-10 md:mb-14">
          <div
            className="inline-block text-[12px] tracking-[0.2em] uppercase mb-5 px-3 py-1 rounded-full"
            style={{ color: "rgba(201,169,110,0.95)", border: "1px solid rgba(201,169,110,0.35)" }}
          >
            Preview
          </div>
          <h1 className="text-white font-semibold leading-[1.18] mb-4" style={{ fontSize: "clamp(1.9rem,5.5vw,3.4rem)" }}>
            직접 눌러보며
            <br />
            둘러보세요
          </h1>
          <p className="text-[14px] md:text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            실제 화면 그대로, 단계별 설명과 함께 보여드려요.
            <br />
            어떤 화면부터 볼까요?
          </p>
        </div>

        {/* 선택 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {PATHS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="px-6 md:px-8 pt-7 md:pt-8">
                <p className="text-[11px] tracking-[0.25em] uppercase font-medium mb-2" style={{ color: GOLD }}>{p.tag}</p>
                <h2 className="text-white text-[22px] md:text-[26px] font-semibold mb-2">{p.title}</h2>
                <p className="text-[13px] md:text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {p.desc}
                </p>
                <ul className="flex flex-wrap gap-1.5 mt-4">
                  {p.points.map((pt) => (
                    <li
                      key={pt}
                      className="text-[11px] px-2.5 py-1 rounded-full"
                      style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.07)" }}
                    >
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 휴대폰 화면 미리보기 — 아래쪽은 카드 밖으로 잘림 */}
              <div className="relative mt-7 h-[230px] md:h-[300px] flex justify-center">
                <div
                  className="absolute top-0 w-[190px] md:w-[230px] rounded-t-[18px] overflow-hidden transition-transform duration-500 group-hover:-translate-y-2"
                  style={{ border: "6px solid #2a2219", borderBottom: "none", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}
                >
                  <Image src={p.img} alt={p.alt} width={391} height={686} className="w-full h-auto block" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(24,19,14,0.85))" }} />
              </div>

              {/* 진입 버튼 */}
              <div className="absolute right-5 bottom-5 md:right-6 md:bottom-6 z-10">
                <span
                  className="flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2.5 rounded-full transition-all group-hover:gap-2.5"
                  style={{ background: "white", color: "#18130e" }}
                >
                  둘러보기 <span aria-hidden>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-[12px] mt-10" style={{ color: "rgba(255,255,255,0.35)" }}>
          미리보기에서 누른 내용은 저장되지 않아요. 마음껏 눌러보세요.
        </p>
      </main>
    </div>
  );
}
