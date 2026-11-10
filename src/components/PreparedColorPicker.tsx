"use client";

import { useEffect } from "react";
import { FLOWER_COLOR_MAP } from "@/lib/constants";
import { canPickColor, PREPARED_COLOR_TRUST, TODAY_COLOR_OPTIONS, type ColorPickMode } from "@/lib/todayColors";

// 주문 마지막 페이지 — 날짜 칸 바로 아래에서 꽃 색 고르기 (꼭 골라야 결제 가능). 맞춤주문·장바구니 결제 화면이 함께 쓴다.
// · 받는 날이 '색 맞춤 가능 일수' 안쪽 → 오늘 매장에 있는 색 중에서
// · 그 이후 날짜 → 모든 색 중에서
// · '색 맞춤 최소 금액'보다 상품 금액이 작으면 날짜와 관계없이 색은 흐리게 보이고 '사장님께 맡길게요'로 정해진다
// · 사진 주문은 가까운 날이면 '이 날짜 주문은 아래 색상으로 준비될 예정'으로 안내한다 (사진 색을 그대로 맞출 수 없다는 것)
//   — 사장님이 오늘 색을 아직 안 알려줬으면 색 고르기 없이 안내만 (PhotoOrderColorNotice)

interface Props {
  mode: ColorPickMode;
  todayColors: string[];
  value: string;
  onChange: (v: string) => void;
  /** 결제하기를 눌렀는데 안 골랐을 때 */
  error?: boolean;
  /** 사진이 있는 상품(메뉴판 상품·찾아본 사진)이면 사진과 색이 다를 수 있다고 알린다 */
  hasPhoto?: boolean;
  /** 색 맞춤 최소 금액 (0이면 제한 없음) */
  minPrice?: number;
  /** 이 주문의 상품 금액 (추가 옵션·배송비 제외) */
  amount?: number;
  /** 찾아본 사진 주문인지 — 가까운 날 안내 문구가 다르다 */
  photoOrder?: boolean;
}

export default function PreparedColorPicker({ mode, todayColors, value, onChange, error, hasPhoto, minPrice = 0, amount = 0, photoOrder = false }: Props) {
  const locked = !canPickColor(minPrice, amount);
  const colors = mode === "today" ? todayColors : [...TODAY_COLOR_OPTIONS];
  const options = [...colors, PREPARED_COLOR_TRUST];

  // 최소 금액보다 작은 주문은 사장님께 맡기는 것으로 정해 둔다 (장바구니에서 상품을 빼 금액이 줄어든 경우도)
  // 날짜를 바꿔 고를 수 있는 색이 달라졌으면, 이제 없는 색은 비운다
  useEffect(() => {
    if (locked) {
      if (value !== PREPARED_COLOR_TRUST) onChange(PREPARED_COLOR_TRUST);
    } else if (value && !options.includes(value)) {
      onChange("");
    }
  });

  return (
    <div className={`px-4 py-4 border-t ${error ? "border-red-200 bg-red-50/60" : "border-gray-100 bg-[color-mix(in_srgb,var(--color-gold-500)_5%,#fff)]"}`}>
      <p className={`text-sm font-medium ${error ? "text-red-500" : "text-gray-800"}`}>
        {mode === "today"
          ? photoOrder
            ? "선택하신 날짜 주문은 아래 색상으로 준비될 예정이에요"
            : "이 날짜는 오늘 매장에 있는 꽃으로 준비돼요"
          : "원하는 꽃 색이 있으신가요?"}{" "}
        <span className="text-red-400">*</span>
        {error && <span className="text-xs font-normal"> — 색을 골라주세요</span>}
      </p>
      <p className="text-xs text-gray-500 mt-1 mb-3 break-keep">
        {locked
          ? `원하는 색은 ${minPrice.toLocaleString()}원 이상 주문부터 고를 수 있어요. 이번 주문은 사장님이 어울리는 색으로 준비해 드려요.`
          : mode === "today" && photoOrder
            ? "오늘 매장에 있는 꽃이라 사진과 색이 달라질 수 있어요. 사진 분위기에 가장 가까운 색을 골라주세요."
            : `${mode === "today" ? "원하는 색을 골라주세요." : "날짜 여유가 있어 원하는 색으로 준비해 드릴 수 있어요."}${hasPhoto ? " 사진과 꽃 색이 달라질 수 있어요." : ""}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = value === c;
          const trust = c === PREPARED_COLOR_TRUST;
          const disabled = locked && !trust;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                on ? "border-gold-500 bg-gold-500 text-white font-medium" : "border-gray-200 bg-white text-gray-700 hover:border-gold-400 disabled:hover:border-gray-200"
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

/** 사진 주문 · 가까운 날인데 사장님이 오늘 색을 아직 알려주지 않았을 때 — 색 고르기 없이 안내만 */
export function PhotoOrderColorNotice() {
  return (
    <div className="px-4 py-4 border-t border-gray-100 bg-[color-mix(in_srgb,var(--color-gold-500)_5%,#fff)]">
      <p className="text-sm font-medium text-gray-800">선택하신 날짜 주문은 매장에 준비된 꽃으로 제작돼요</p>
      <p className="text-xs text-gray-500 mt-1 break-keep">사진과 꽃 색이 달라질 수 있지만, 사진 분위기에 맞춰 최대한 예쁘게 제작해 드릴게요.</p>
    </div>
  );
}
