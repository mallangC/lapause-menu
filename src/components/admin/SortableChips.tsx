"use client";

import { useState, type ReactNode } from "react";

export type ChipItem = { name: string; label: ReactNode; onDelete: () => void; deleting: boolean };

/**
 * 끌어서 순서를 바꾸는 칩 목록 — 왼쪽 손잡이(⠿)를 누른 채 움직이면 손가락 아래 칩 자리로 옮겨진다.
 * 마우스·터치 모두 포인터 이벤트로 처리 (손잡이는 touch-action: none 이라 끄는 동안 화면이 스크롤되지 않는다)
 */
export default function SortableChips({ items, onReorder, children }: { items: ChipItem[]; onReorder: (names: string[]) => void; children?: ReactNode }) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragName, setDragName] = useState<string | null>(null);
  const names = draft ?? items.map((i) => i.name);
  const byName = new Map(items.map((i) => [i.name, i]));

  // 칩을 옮기면 DOM 순서가 바뀌어 포인터 캡처가 풀리므로, 끄는 동안은 window 에서 움직임을 받는다
  const onDown = (e: React.PointerEvent<HTMLButtonElement>, name: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const start = items.map((i) => i.name);
    let current = start;
    setDraft(start);
    setDragName(name);
    const move = (ev: PointerEvent) => {
      const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-chip]")?.dataset.chip;
      if (!over || over === name || !current.includes(over)) return;
      const next = current.filter((n) => n !== name);
      next.splice(current.indexOf(over), 0, name);
      current = next;
      setDraft(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (current.join("\u0000") !== start.join("\u0000")) onReorder(current);
      setDraft(null);
      setDragName(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {names.map((n) => {
        const item = byName.get(n);
        if (!item) return null;
        return (
          <div
            key={n}
            data-chip={n}
            className={`relative transition-shadow ${dragName === n ? "z-10 rounded-lg shadow-lg ring-2 ring-gold-400 bg-white" : ""}`}
          >
            {item.label}
            <button
              type="button"
              aria-label={`${n} 순서 바꾸기`}
              title="끌어서 순서 바꾸기"
              onPointerDown={(e) => onDown(e, n)}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-5 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none select-none text-sm leading-none"
            >
              ⠿
            </button>
            <button
              onClick={item.onDelete}
              disabled={item.deleting}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none"
              title="삭제"
            >
              ×
            </button>
          </div>
        );
      })}
      {children}
    </div>
  );
}
