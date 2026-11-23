"use client";

import {
  newOptionId,
  OPTION_CHOICE_MAX,
  OPTION_GROUP_MAX,
  OPTION_PRICE_MAX,
  type ProductOptionChoice,
  type ProductOptionGroup,
} from "@/lib/productOptions";

// 상품 옵션 만들기 — 묶음(이름·하나만/여러 개) 안에 항목(이름·추가 금액·기본 선택)
// 예: [포장지 · 하나만] 기본 포장 0원(기본) / 고급 포장 +5,000원

const emptyChoice = (): ProductOptionChoice => ({ id: newOptionId(), name: "", price: 0, default: false });

export default function ProductOptionsEditor({
  groups,
  onChange,
  inputCls,
}: {
  groups: ProductOptionGroup[];
  onChange: (next: ProductOptionGroup[]) => void;
  inputCls: string;
}) {
  const setGroup = (gid: string, patch: Partial<ProductOptionGroup>) =>
    onChange(groups.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  const setChoice = (gid: string, cid: string, patch: Partial<ProductOptionChoice>) =>
    onChange(groups.map((g) => (g.id === gid ? { ...g, choices: g.choices.map((c) => (c.id === cid ? { ...c, ...patch } : c)) } : g)));

  const addGroup = () =>
    onChange([...groups, { id: newOptionId(), name: "", multi: false, choices: [{ ...emptyChoice(), default: true }, emptyChoice()] }]);

  // 하나만 고르는 묶음은 기본 선택이 하나 — 다른 항목을 기본으로 하면 앞의 기본은 풀린다
  const toggleDefault = (g: ProductOptionGroup, cid: string) => {
    if (g.multi) return setChoice(g.id, cid, { default: !g.choices.find((c) => c.id === cid)?.default });
    setGroup(g.id, { choices: g.choices.map((c) => ({ ...c, default: c.id === cid })) });
  };

  const setMulti = (g: ProductOptionGroup, multi: boolean) => {
    if (multi === g.multi) return;
    // 하나만으로 바꾸면 기본 선택을 하나만 남긴다 (없으면 첫 항목)
    if (!multi) {
      const keep = g.choices.find((c) => c.default)?.id ?? g.choices[0]?.id;
      return setGroup(g.id, { multi, choices: g.choices.map((c) => ({ ...c, default: c.id === keep })) });
    }
    setGroup(g.id, { multi });
  };

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              value={g.name}
              onChange={(e) => setGroup(g.id, { name: e.target.value })}
              placeholder="묶음 이름 (예: 포장지)"
              maxLength={30}
              className={`${inputCls} flex-1 min-w-0`}
            />
            <button
              type="button"
              onClick={() => onChange(groups.filter((x) => x.id !== g.id))}
              aria-label="옵션 묶음 지우기"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>

          {/* 하나만 / 여러 개 */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs w-fit">
            {[
              { v: false, label: "하나만 고르기" },
              { v: true, label: "여러 개 고르기" },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setMulti(g, o.v)}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${g.multi === o.v ? "bg-white text-gray-900 font-medium shadow-sm" : "text-gray-500"}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <ul className="space-y-1.5">
            {g.choices.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <input
                  value={c.name}
                  onChange={(e) => setChoice(g.id, c.id, { name: e.target.value })}
                  placeholder="항목 (예: 고급 포장)"
                  maxLength={30}
                  className={`${inputCls} flex-1 min-w-0`}
                />
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">+</span>
                  <input
                    inputMode="numeric"
                    value={c.price ? c.price.toLocaleString("ko-KR") : ""}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                      setChoice(g.id, c.id, { price: Math.min(n, OPTION_PRICE_MAX) });
                    }}
                    placeholder="0"
                    className={`${inputCls} pl-5 pr-6 text-right`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDefault(g, c.id)}
                  title="손님 화면에서 처음부터 골라져 있어요"
                  className={`shrink-0 h-[38px] px-2 rounded-lg border text-xs whitespace-nowrap transition-colors ${
                    c.default ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  기본
                </button>
                <button
                  type="button"
                  disabled={g.choices.length <= 1}
                  onClick={() => setGroup(g.id, { choices: g.choices.filter((x) => x.id !== c.id) })}
                  aria-label="항목 지우기"
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {g.choices.length < OPTION_CHOICE_MAX && (
            <button
              type="button"
              onClick={() => setGroup(g.id, { choices: [...g.choices, emptyChoice()] })}
              className="text-xs text-gold-600 font-medium hover:underline"
            >
              + 항목 추가
            </button>
          )}
        </div>
      ))}

      {groups.length < OPTION_GROUP_MAX && (
        <button
          type="button"
          onClick={addGroup}
          className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gold-400 hover:text-gold-600 transition-colors"
        >
          + 옵션 묶음 추가
        </button>
      )}
      <p className="text-xs text-gray-400 break-keep">
        추가 금액은 0원도 돼요. &lsquo;기본&rsquo;으로 둔 항목은 손님 화면에서 처음부터 골라져 있어요.
      </p>
    </div>
  );
}
