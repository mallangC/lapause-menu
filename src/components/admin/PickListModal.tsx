"use client";

import { useState } from "react";
import StoreImage from "@/components/StoreImage";

// 목록에서 하나 고르는 창 — 브라우저 기본 선택 상자 대신 (상품은 사진·이름·가격까지 보여 준다)
// 다른 창 위에 뜬다 (z-[60])

export interface PickItem {
  value: string;
  label: string;
  /** 상품 사진 */
  image?: string | null;
  /** 오른쪽 작은 글 (가격 등) */
  sub?: string | null;
}

export default function PickListModal({
  title,
  items,
  selected,
  onPick,
  onClose,
}: {
  title: string;
  items: PickItem[];
  selected?: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const withImage = items.some((i) => i.image !== undefined);
  // 많으면 검색 칸 (이름으로 찾기 — 띄어쓰기 무시)
  const [q, setQ] = useState("");
  const key = q.replace(/\s+/g, "").toLowerCase();
  const shown = key ? items.filter((i) => i.label.replace(/\s+/g, "").toLowerCase().includes(key)) : items;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[75vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {items.length > 8 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름으로 찾기"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
        )}
        <ul className="overflow-y-auto divide-y divide-gray-50">
          {shown.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-400">찾는 항목이 없어요.</li>}
          {shown.map((it) => {
            const on = it.value === selected;
            return (
              <li key={it.value}>
                <button
                  type="button"
                  onClick={() => onPick(it.value)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${on ? "bg-gold-50" : "hover:bg-gray-50"}`}
                >
                  {withImage && (
                    <span className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-beige-100">
                      {it.image && <StoreImage thumb src={it.image} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                  )}
                  <span className={`flex-1 min-w-0 text-sm break-keep ${on ? "text-gold-600 font-medium" : "text-gray-800"}`}>{it.label}</span>
                  {it.sub && <span className="shrink-0 text-xs text-gray-500">{it.sub}</span>}
                  {on && (
                    <svg className="w-4 h-4 shrink-0 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
