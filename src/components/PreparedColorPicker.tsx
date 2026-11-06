"use client";

import { FLOWER_COLOR_MAP } from "@/lib/constants";
import { PREPARED_COLOR_TRUST } from "@/lib/todayColors";

// 주문 마지막 페이지 — 받는 날이 '색 맞춤 가능 일수' 안쪽이면 오늘 매장에 있는 색 중에서 고르게 한다
// (모달 없이 날짜 칸 바로 아래에, 꼭 골라야 결제 가능). 맞춤주문·장바구니 결제 화면이 함께 쓴다.

interface Props {
  todayColors: string[];
  value: string;
  onChange: (v: string) => void;
  /** 결제하기를 눌렀는데 안 골랐을 때 */
  error?: boolean;
  /** 사진이 있는 상품(메뉴판 상품·찾아본 사진)이면 사진과 색이 다를 수 있다고 알린다 */
  hasPhoto?: boolean;
}

export default function PreparedColorPicker({ todayColors, value, onChange, error, hasPhoto }: Props) {
  const options = [...todayColors, PREPARED_COLOR_TRUST];
  return (
    <div className={`px-4 py-4 border-t ${error ? "border-red-200 bg-red-50/60" : "border-gray-100 bg-[color-mix(in_srgb,var(--color-gold-500)_5%,#fff)]"}`}>
      <p className={`text-sm font-medium ${error ? "text-red-500" : "text-gray-800"}`}>
        이 날짜는 오늘 매장에 있는 꽃으로 준비돼요 <span className="text-red-400">*</span>
        {error && <span className="text-xs font-normal"> — 색을 골라주세요</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1 mb-3 break-keep">
        원하는 색을 골라주세요.{hasPhoto ? " 사진과 꽃 색이 달라질 수 있어요." : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = value === c;
          const trust = c === PREPARED_COLOR_TRUST;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-colors ${
                on ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 bg-white text-gray-700 hover:border-gold-400"
              }`}
            >
              {!trust && <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ background: FLOWER_COLOR_MAP[c] }} />}
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
