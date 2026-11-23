"use client";

import { useEffect, useState } from "react";
import type { ProductOptionGroup } from "@/lib/productOptions";

// 손님 상품 옵션 고르기 — 추가 옵션(메시지 카드·쇼핑백, CheckoutOptions)과 같은 모양의 카드, 옵션마다 한 장
// 접힌 상태: 옵션 이름 + 고른 항목만 / 누르면 펼쳐져 항목 목록 (이름 · 금액은 이름 옆, 오른쪽 끝에 동그라미 체크)
// 단일 선택은 고르면 바로 접히고, 복수 선택은 펼친 채로 여러 개 고른 뒤 제목을 눌러 접는다
// 필수 옵션은 제목 옆에 '필수' — 고르지 않고 주문하려 하면 invalid 로 받아 빨갛게 펼쳐 보여 준다
export default function ProductOptionPicker({
  groups,
  selected,
  onChange,
  cardClassName = "bg-white rounded-2xl overflow-hidden",
  invalid = [],
}: {
  groups: ProductOptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** 옵션 카드 모양 — 옵션마다 카드를 따로 두고 사이를 띄워 구분한다 */
  cardClassName?: string;
  /** 고르지 않은 필수 옵션 id — 빨갛게 표시하고 펼친다 */
  invalid?: string[];
}) {
  const [open, setOpen] = useState<string[]>([]);
  const invalidKey = invalid.join(",");
  useEffect(() => {
    if (invalid.length) setOpen((prev) => [...new Set([...prev, ...invalid])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidKey]);
  const toggleOpen = (gid: string) => setOpen((prev) => (prev.includes(gid) ? prev.filter((x) => x !== gid) : [...prev, gid]));

  const pick = (g: ProductOptionGroup, cid: string) => {
    const others = selected.filter((id) => !g.choices.some((c) => c.id === id));
    if (!g.multi) {
      // 단일 선택 — 고른 걸 다시 누르면 풀린다(선택 옵션만), 고르면 접는다
      const already = selected.includes(cid);
      onChange(already && !g.required ? others : [...others, cid]);
      setOpen((prev) => prev.filter((x) => x !== g.id));
      return;
    }
    onChange(selected.includes(cid) ? selected.filter((id) => id !== cid) : [...selected, cid]);
  };

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const isOpen = open.includes(g.id);
        const picked = g.choices.filter((c) => selected.includes(c.id));
        const bad = invalid.includes(g.id) && picked.length === 0;
        const summary = picked.length
          ? picked.map((c) => (c.price > 0 ? `${c.name} (+${c.price.toLocaleString()}원)` : c.name)).join(", ")
          : g.required ? "골라 주세요" : "선택 안 함";
        return (
          <div key={g.id} className={`${cardClassName} ${bad ? "ring-1 ring-red-300" : ""}`}>
            <button
              type="button"
              onClick={() => toggleOpen(g.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="shrink-0 text-sm font-medium text-gray-700">
                {g.name}
                {g.required && <span className="ml-1 text-[11px] font-medium text-red-500">필수</span>}
              </span>
              <span className={`flex-1 min-w-0 text-right text-sm truncate ${picked.length ? "text-gold-600 font-medium" : bad ? "text-red-500" : "text-gray-400"}`}>
                {summary}
              </span>
              <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-100" role={g.multi ? "group" : "radiogroup"} aria-label={g.name}>
                {g.multi && <p className="px-4 pt-2.5 pb-1 text-xs text-gray-400">여러 개 고를 수 있어요</p>}
                {g.choices.map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role={g.multi ? "checkbox" : "radio"}
                      aria-checked={on}
                      onClick={() => pick(g, c.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${on ? "bg-white" : "hover:bg-gray-50"}`}
                    >
                      <div className="min-w-0">
                        <span className={`text-sm break-keep ${on ? "text-gold-600 font-medium" : "text-gray-800"}`}>{c.name}</span>
                        {c.price > 0 && <span className="ml-2 text-xs text-gold-500 whitespace-nowrap">+{c.price.toLocaleString()}원</span>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${on ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                        {on && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
