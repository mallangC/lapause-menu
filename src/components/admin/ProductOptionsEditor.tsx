"use client";

import { useState } from "react";
import {
  newOptionId,
  OPTION_CHOICE_MAX,
  OPTION_GROUP_MAX,
  OPTION_PRICE_MAX,
  type ProductOptionChoice,
  type ProductOptionGroup,
} from "@/lib/productOptions";

// 상품 옵션 만들기 — 옵션(이름·단일/복수 선택·선택/필수) 안에 항목(이름·추가 금액·품절)
// 예: [포장지 · 단일 선택 · 필수] 기본 포장 0원 / 고급 포장 +5,000원
// 기본 선택은 두지 않는다 — 손님이 직접 고른 것만 주문에 들어간다

const emptyChoice = (): ProductOptionChoice => ({ id: newOptionId(), name: "", price: 0 });

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

  // 항목 순서 바꾸기 — 왼쪽 ⠿ 를 누른 채 움직이면 손가락·마우스 아래 항목 자리로 옮긴다 (메뉴 설정 칩과 같은 방식)
  const [dragging, setDragging] = useState<string | null>(null);
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>, g: ProductOptionGroup, cid: string) => {
    if (e.button !== 0 || g.choices.length < 2) return;
    e.preventDefault();
    let current = g.choices;
    setDragging(cid);
    const move = (ev: PointerEvent) => {
      const row = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>(`[data-choice-of="${g.id}"]`);
      const over = row?.dataset.choice;
      if (!over || over === cid) return;
      const from = current.findIndex((c) => c.id === cid);
      const to = current.findIndex((c) => c.id === over);
      if (from < 0 || to < 0) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      current = next;
      onChange(groupsRef.map((x) => (x.id === g.id ? { ...x, choices: next } : x)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const groupsRef = groups;

  const addGroup = () =>
    onChange([...groups, { id: newOptionId(), name: "", multi: false, required: false, choices: [emptyChoice(), emptyChoice()] }]);

  const setMulti = (g: ProductOptionGroup, multi: boolean) => {
    if (multi !== g.multi) setGroup(g.id, { multi });
  };

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              value={g.name}
              onChange={(e) => setGroup(g.id, { name: e.target.value })}
              placeholder="옵션 이름 (예: 포장지)"
              maxLength={30}
              className={`${inputCls} flex-1 min-w-0`}
            />
            <button
              type="button"
              onClick={() => onChange(groups.filter((x) => x.id !== g.id))}
              aria-label="옵션 지우기"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>

          {/* 단일 / 복수 · 필수 / 선택 */}
          {/* 두 칸을 반씩 — 포장지 색상 선택과 같은 모양 (회색 바탕 안에서 반반, 고른 쪽은 색 없이 흰색으로 띄움) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { v: false, label: "단일 선택" },
                { v: true, label: "복수 선택" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setMulti(g, o.v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${g.multi === o.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-500"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { v: false, label: "선택" },
                { v: true, label: "필수" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setGroup(g.id, { required: o.v })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${g.required === o.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-500"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-1.5">
            {g.choices.map((c) => (
              <li
                key={c.id}
                data-choice={c.id}
                data-choice-of={g.id}
                className={`flex items-center gap-1.5 rounded-lg transition-shadow ${dragging === c.id ? "relative z-10 bg-white shadow-lg ring-2 ring-gold-400" : ""}`}
              >
                <button
                  type="button"
                  aria-label="끌어서 순서 바꾸기"
                  title="끌어서 순서 바꾸기"
                  onPointerDown={(e) => onHandleDown(e, g, c.id)}
                  className="shrink-0 w-5 h-[38px] flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-grab active:cursor-grabbing touch-none select-none text-sm leading-none"
                >
                  ⠿
                </button>
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
                  onClick={() => setChoice(g.id, c.id, { soldOut: !c.soldOut })}
                  title="품절이면 손님이 고를 수 없어요"
                  className={`shrink-0 h-[38px] px-2 rounded-lg border text-xs whitespace-nowrap transition-colors ${
                    c.soldOut ? "border-red-300 bg-red-50 text-red-500 font-medium" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  품절
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
              // 옵션 추가 버튼과 같은 모양 (작은 글자 링크는 누르기 어려워서)
              className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gold-400 hover:text-gold-600 transition-colors"
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
          + 옵션 추가
        </button>
      )}
      <p className="text-xs text-gray-400 break-keep">
        추가 금액은 0원도 돼요. 필수 옵션은 고르지 않으면 주문할 수 없고, 품절 항목은 손님이 고를 수 없어요.
      </p>
    </div>
  );
}
