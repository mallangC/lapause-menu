"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// 목록 한 줄의 '⋯' 버튼 — 누르면 바로 아래에 작은 메뉴(수정·복제·삭제 등)를 띄운다
// 창은 화면에 고정된 위치라 스크롤·화면 크기가 바뀌면 닫는다

export interface RowAction {
  label: string;
  onClick: () => void;
  /** 빨간 글자 (삭제 등) */
  danger?: boolean;
  icon?: React.ReactNode;
}

const MENU_WIDTH = 120;

export default function RowActionMenu({ actions, label = "관리", busy = false }: { actions: RowAction[]; label?: string; busy?: boolean }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const close = () => setPos(null);

  const toggle = (el: HTMLElement) => {
    if (pos) return close();
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    // 아래 공간이 모자라면 위로
    const below = r.bottom + 4;
    const top = below + actions.length * 40 + 12 > window.innerHeight ? r.top - 4 - (actions.length * 40 + 8) : below;
    setPos({ top, left });
  };

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  if (busy) {
    return (
      <span className="w-7 h-7 flex items-center justify-center" aria-label="처리하는 중">
        <span className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => toggle(e.currentTarget)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        title={label}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${pos ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} />
          <div
            role="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="fixed z-[61] py-1 bg-white rounded-xl shadow-xl border border-gray-100"
          >
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => { close(); a.onClick(); }}
                className={`w-full h-10 flex items-center justify-center gap-2 px-3 text-sm transition-colors ${a.danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {/* 글자는 정가운데, 아이콘은 글자 바로 앞에 붙여서 (아이콘 폭만큼 글자가 밀리지 않게) */}
                <span className="relative">
                  {a.icon && (
                    <span className={`absolute right-full mr-1.5 top-1/2 -translate-y-1/2 w-4 h-4 ${a.danger ? "text-red-400" : "text-gray-400"}`}>{a.icon}</span>
                  )}
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
