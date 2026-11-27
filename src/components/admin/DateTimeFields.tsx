"use client";

// 사장님 화면 공용 날짜·시간 입력 — 영업 설정(휴무일·영업시간 변경), 메뉴 설정(시즌 예약 마감)
import { useEffect, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ko", ko);

const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTES = ["00", "30"];

export function DateField({ value, onChange, placeholder }: { value: Date | null; onChange: (d: Date | null) => void; placeholder?: string }) {
  return (
    <DatePicker
      locale="ko"
      selected={value}
      onChange={onChange}
      dateFormat="yy년 M월 d일 (eee)"
      minDate={new Date()}
      placeholderText={placeholder ?? "날짜를 선택해주세요"}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white cursor-pointer"
      wrapperClassName="w-full"
      calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg admin-modal-datepicker"
      popperPlacement="bottom-start"
      dayClassName={(date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today ? "react-datepicker__day--past" : "";
      }}
      renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
        <div className="flex items-center justify-between px-3 py-1">
          <button type="button" onClick={decreaseMonth} disabled={prevMonthButtonDisabled}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600">‹</button>
          <span className="text-sm font-medium text-gray-800">{date.getMonth() + 1}월</span>
          <button type="button" onClick={increaseMonth} disabled={nextMonthButtonDisabled}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600">›</button>
        </div>
      )}
    />
  );
}

// 시간 선택 — 시·분을 따로 고르지 않고 '09:00' 한 칸에서 고른다 (30분 단위라 목록이 짧고, 칸이 좁아 모바일 한 줄에 들어간다)
const TIME_OPTIONS = HOURS.flatMap((hh) => MINUTES.map((mm) => `${hh}:${mm}`));

export function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // 목록에 없는 값(예: 예전에 저장한 09:15)도 그대로 보이게 앞에 끼워 넣는다
  const options = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [value, ...TIME_OPTIONS];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // 칸이 너무 작아 보이지 않게 최소 너비·여백을 둔다 (모바일 한 줄: 요일·스위치를 빼고 남는 폭 안에 두 칸이 들어가는 크기)
      className="min-w-[92px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
    >
      {options.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

// 하루 전체 30분 단위 (00:00 ~ 23:30)
const DAY_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/**
 * 시간 고르기 (기본 시간 입력 대신 매장 화면 디자인의 목록) — 빈 값('')은 '선택 안 함'
 * emptyLabel: 선택 안 함일 때 칸에 보이는 글 (예: "23:59")
 */
export function TimeDropdown({ value, onChange, disabled, emptyLabel = "선택 안 함" }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const options = !value || DAY_TIME_OPTIONS.includes(value) ? DAY_TIME_OPTIONS : [value, ...DAY_TIME_OPTIONS];

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // 열면 고른 시간(없으면 18:00 근처)이 보이게 스크롤
  useEffect(() => {
    if (!open) return;
    const target = listRef.current?.querySelector<HTMLElement>(`[data-time="${value || "18:00"}"]`);
    if (target && listRef.current) listRef.current.scrollTop = target.offsetTop - listRef.current.clientHeight / 2 + target.clientHeight / 2;
  }, [open, value]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          open ? "border-gray-500" : "border-gray-300"
        }`}
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || emptyLabel}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 left-0 right-0 max-h-56 overflow-y-auto overscroll-contain bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => pick("")}
            className={`w-full px-3 py-2 text-sm text-left transition-colors ${!value ? "bg-gold-50 text-gold-600 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
          >
            선택 안 함
          </button>
          {options.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              data-time={t}
              aria-selected={value === t}
              onClick={() => pick(t)}
              className={`w-full px-3 py-2 text-sm text-left transition-colors ${value === t ? "bg-gold-50 text-gold-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
