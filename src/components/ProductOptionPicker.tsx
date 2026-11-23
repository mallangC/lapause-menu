"use client";

import type { ProductOptionGroup } from "@/lib/productOptions";

// 손님 상품 옵션 고르기 — 하나만 고르는 묶음은 동그라미(늘 하나), 여러 개는 네모 체크
export default function ProductOptionPicker({
  groups,
  selected,
  onChange,
}: {
  groups: ProductOptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const pick = (g: ProductOptionGroup, cid: string) => {
    const others = selected.filter((id) => !g.choices.some((c) => c.id === id));
    if (!g.multi) return onChange([...others, cid]);
    onChange(selected.includes(cid) ? selected.filter((id) => id !== cid) : [...selected, cid]);
  };

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <fieldset key={g.id}>
          <legend className="text-sm text-gray-500 mb-2">
            {g.name}
            <span className="ml-1.5 text-xs text-gray-400">{g.multi ? "여러 개 고를 수 있어요" : "하나를 골라 주세요"}</span>
          </legend>
          <div className="space-y-1.5">
            {g.choices.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  role={g.multi ? "checkbox" : "radio"}
                  aria-checked={on}
                  onClick={() => pick(g, c.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                    on ? "border-gold-500 bg-gold-50/40" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`shrink-0 w-4 h-4 flex items-center justify-center border ${g.multi ? "rounded" : "rounded-full"} ${
                      on ? "border-gold-500 bg-gold-500" : "border-gray-300 bg-white"
                    }`}
                  >
                    {on && (g.multi ? (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    ))}
                  </span>
                  <span className={`flex-1 min-w-0 break-keep ${on ? "text-gray-900 font-medium" : "text-gray-700"}`}>{c.name}</span>
                  <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">{c.price > 0 ? `+${c.price.toLocaleString()}원` : "추가 금액 없음"}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
