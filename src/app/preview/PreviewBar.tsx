"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COACH_AVAILABLE_EVENT, COACH_RESTART_EVENT, hasCoach } from "./PreviewCoach";

interface Props {
  /** 이 미리보기의 홈 (예: /preview/customer) */
  homeHref: string;
  homeLabel: string;
}

const itemCls =
  // 모바일도 누르기 편하게 크게 (글자 14px, 버튼 높이 약 40px)
  "flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap";

// 미리보기 화면에 계속 떠 있는 이동 바 — 가운데 아래.
// 모바일 손님 홈만 왼쪽 아래 (오른쪽 아래 맞춤주문·필터 버튼을 피함)
export default function PreviewBar({ homeHref, homeLabel }: Props) {
  const pathname = usePathname();
  const atHome = pathname === homeHref;
  // 지금 화면에 코치마크가 있으면 '설명 다시 보기'를 보여준다
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    const sync = () => setCoach(hasCoach());
    sync();
    window.addEventListener(COACH_AVAILABLE_EVENT, sync);
    return () => window.removeEventListener(COACH_AVAILABLE_EVENT, sync);
  }, []);

  return (
    <div
      className={`fixed z-[46] ${pathname === "/preview/customer/menu" ? "left-4" : "left-1/2 -translate-x-1/2"} md:left-1/2 md:-translate-x-1/2 flex items-center gap-0.5 p-1 rounded-full shadow-xl backdrop-blur-md`}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", background: "rgba(24,19,14,0.88)", border: "1px solid rgba(201,169,110,0.3)" }}
    >
      <Link href="/preview" className={itemCls} aria-label="미리보기 처음으로">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        처음
      </Link>
      {!atHome && (
        <Link href={homeHref} className={itemCls}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5M5 9v11h5v-6h4v6h5V9" />
          </svg>
          {homeLabel}
        </Link>
      )}
      {coach && (
        <button onClick={() => window.dispatchEvent(new Event(COACH_RESTART_EVENT))} className={itemCls}>
          <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] leading-none">?</span>
          설명 다시 보기
        </button>
      )}
    </div>
  );
}
