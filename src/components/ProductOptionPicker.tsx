"use client";

import type { ProductOptionGroup } from "@/lib/productOptions";

// 손님 상품 옵션 고르기 — 추가 옵션(메시지 카드·쇼핑백, CheckoutOptions)과 같은 모양
// 묶음마다 카드 하나(사이를 띄워 구분) — 제목 줄 + 항목 줄 (이름 · 금액은 이름 옆, 오른쪽 끝에 동그라미 체크)
// 하나만 고르는 묶음은 늘 하나가 골라져 있고, 여러 개 묶음은 눌러서 넣고 뺀다
export default function ProductOptionPicker({
  groups,
  selected,
  onChange,
  cardClassName = "bg-white rounded-2xl overflow-hidden",
}: {
  groups: ProductOptionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** 묶음 카드 모양 — 묶음마다 카드를 따로 두고 사이를 띄워 구분한다 */
  cardClassName?: string;
}) {
  const pick = (g: ProductOptionGroup, cid: string) => {
    const others = selected.filter((id) => !g.choices.some((c) => c.id === id));
    if (!g.multi) return onChange([...others, cid]);
    onChange(selected.includes(cid) ? selected.filter((id) => id !== cid) : [...selected, cid]);
  };

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.id} className={cardClassName}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-baseline gap-2">
            <h3 className="text-sm font-medium text-gray-700">{g.name}</h3>
            <span className="text-xs text-gray-400">{g.multi ? "여러 개 고를 수 있어요" : "하나를 골라 주세요"}</span>
          </div>
          <div className="divide-y divide-gray-100" role={g.multi ? "group" : "radiogroup"} aria-label={g.name}>
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
        </div>
      ))}
    </div>
  );
}
