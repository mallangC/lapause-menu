"use client";

// 주문 마지막 페이지 수령 시간 칸 — 영업시간과 영업시간 외 시간을 한 격자에 시간 순으로 합쳐 보여준다.
// 영업시간 외 시간은 흰 바탕 + 점선 테두리로 구분하고, 위에 설명 한 줄을 둔다 (영업시간 외 시간이 있는 날만).
// 맞춤주문·장바구니 결제 화면이 함께 쓴다.

interface Props {
  /** 영업시간 안 시간 */
  slots: string[];
  /** 영업시간 외 시간 */
  extraSlots: string[];
  value: string;
  onSelect: (slot: string) => void;
  /** 결제하기를 눌렀는데 시간을 안 골랐을 때 */
  error?: boolean;
}

export default function TimeSlotGrid({ slots, extraSlots, value, onSelect, error }: Props) {
  const all = [...slots, ...extraSlots].sort();
  const isExtra = (s: string) => extraSlots.includes(s);
  return (
    <>
      {extraSlots.length > 0 && (
        <p className="text-xs text-gray-500 bg-[color-mix(in_srgb,var(--color-gold-500)_6%,#fff)] rounded-lg px-3 py-2 break-keep">
          <span className="inline-block w-5 h-3 align-[-1px] rounded-[3px] border border-dashed border-gold-400 bg-white mr-1" aria-hidden />
          점선 시간은 영업시간 외 수령이에요.
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {all.map((slot) => {
          const extra = isExtra(slot);
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelect(slot)}
              className={`py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                value === slot
                  ? "bg-gold-500 text-white border-gold-500"
                  : error
                  ? `bg-red-50 text-gray-700 hover:bg-red-100 ${extra ? "border-dashed border-red-300" : "border-red-200"}`
                  : extra
                  ? "bg-white border-dashed border-gold-400 text-gray-700 hover:bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]"
                  : "border-transparent bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] text-gray-700 hover:bg-[color-mix(in_srgb,var(--color-gold-500)_18%,#fff)]"
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </>
  );
}
