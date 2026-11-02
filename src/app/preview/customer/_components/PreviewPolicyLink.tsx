"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 미리보기 결제 동의 문구의 정책 링크 — 실제 화면의 <Link href="/privacy|/refund"> 대신 쓴다.
// 누르면 정책 페이지로 이동하지 않고, 실제 페이지에서는 이동한다는 안내만 잠깐 띄운다.
// (동의 체크박스 label 안에 있어서, 눌렀을 때 체크가 바뀌지 않게 기본 동작을 막는다)
export default function PreviewPolicyLink({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2500);
  };

  return (
    <>
      <button type="button" onClick={handleClick} className="underline text-gold-600">
        {label}
      </button>
      {/* 안내 토스트 — 상품 리스트 푸터 링크 안내와 같은 모양, 아래 이동 바 위에 띄운다 */}
      {show && createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[47] w-[calc(100%-32px)] max-w-sm px-4 py-3 rounded-2xl text-center text-[13px] leading-relaxed text-white shadow-xl pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", background: "rgba(24,19,14,0.92)" }}
          role="status"
        >
          실제 페이지에서는 {label} 페이지로 이동해요.
          <br />
          <span className="text-white/60">미리보기라 이동하지 않아요.</span>
        </div>,
        document.body,
      )}
    </>
  );
}
