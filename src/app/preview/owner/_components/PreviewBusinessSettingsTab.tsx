"use client";

import { useState } from "react";
import type { DayHours, BusinessHours, DateOverrides } from "@/lib/businessHours";
import SaveButton from "@/components/admin/SaveButton";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { PREVIEW_TODAY } from "../_mockReservations";

registerLocale("ko", ko);

interface Props {
  /** 미리보기 — 저장 대신 안내 */
  onNotice: (message: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTES = ["00", "30"];

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 오늘보다 이전 날짜의 영업시간 변경 내역은 더 이상 쓸모가 없으므로 정리한다.
const pruneOverrides = (overrides: DateOverrides): DateOverrides => {
  const todayStr = toDateStr(PREVIEW_TODAY);
  return Object.fromEntries(Object.entries(overrides).filter(([date]) => date >= todayStr));
};

function DateField({ value, onChange, placeholder }: { value: Date | null; onChange: (d: Date | null) => void; placeholder?: string }) {
  return (
    <DatePicker
      locale="ko"
      selected={value}
      onChange={onChange}
      dateFormat="yy년 M월 d일 (eee)"
      minDate={PREVIEW_TODAY}
      placeholderText={placeholder ?? "날짜를 선택해주세요"}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white cursor-pointer"
      wrapperClassName="w-full"
      calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg admin-modal-datepicker"
      popperPlacement="bottom-start"
      dayClassName={(date) => {
        const today = new Date(PREVIEW_TODAY);
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

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

// 미리보기 매장 설정 (목업) — 월요일 정기 휴무, 일요일은 짧게, 크리스마스 이브는 늦게까지
const MOCK_HOURS: BusinessHours = {
  "0": { closed: false, open: "11:00", close: "17:00" },
  "1": { closed: true, open: "10:00", close: "20:00" },
  "2": { closed: false, open: "10:00", close: "20:00" },
  "3": { closed: false, open: "10:00", close: "20:00" },
  "4": { closed: false, open: "10:00", close: "20:00" },
  "5": { closed: false, open: "10:00", close: "20:00" },
  "6": { closed: false, open: "10:00", close: "20:00" },
};
const MOCK_CLOSED_DATES = ["2026-11-24", "2027-01-01"];
const MOCK_OVERRIDES: DateOverrides = {
  "2026-12-24": { open: "09:00", close: "22:00" },
  "2026-12-31": { open: "10:00", close: "17:00" },
};
const MOCK_LEAD_TIMES: Record<string, string> = { 꽃다발: "2", 꽃바구니: "3", 센터피스: "4", 화병꽂이: "3", 기타: "2" };

// 미리보기 영업 설정 — 실제 BusinessSettingsTab 복사본. 목업 매장 설정을 쓰고 저장은 하지 않는다 (오늘 = 2026-11-10)
export default function PreviewBusinessSettingsTab({ onNotice }: Props) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>(MOCK_HOURS);
  const [closedDates, setClosedDates] = useState<string[]>(MOCK_CLOSED_DATES);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [dateOverrides, setDateOverrides] = useState<DateOverrides>(MOCK_OVERRIDES);
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [overrideOpen, setOverrideOpen] = useState("09:00");
  const [overrideClose, setOverrideClose] = useState("18:00");
  const [minLeadTimes, setMinLeadTimes] = useState<Record<string, string>>(MOCK_LEAD_TIMES);
  const error: string | null = null;

  const updateDay = (day: number, patch: Partial<DayHours>) => {
    setBusinessHours((prev) => ({
      ...prev,
      [String(day)]: { ...prev[String(day)], ...patch },
    }));
  };

  const addClosedDate = () => {
    if (!newDate) return;
    const dateStr = toDateStr(newDate);
    if (closedDates.includes(dateStr)) return;
    setClosedDates((prev) => [...prev, dateStr].sort());
    setNewDate(null);
  };

  const removeClosedDate = (date: string) => {
    setClosedDates((prev) => prev.filter((d) => d !== date));
  };

  const handleOverrideDateChange = (d: Date | null) => {
    setOverrideDate(d);
    if (!d) return;
    const existing = dateOverrides[toDateStr(d)];
    if (existing) {
      setOverrideOpen(existing.open);
      setOverrideClose(existing.close);
    }
  };

  const addDateOverride = () => {
    if (!overrideDate) return;
    const dateStr = toDateStr(overrideDate);
    setDateOverrides((prev) => pruneOverrides({ ...prev, [dateStr]: { open: overrideOpen, close: overrideClose } }));
    setOverrideDate(null);
    setOverrideOpen("09:00");
    setOverrideClose("18:00");
  };

  const removeDateOverride = (date: string) => {
    setDateOverrides((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  // 미리보기 — 저장하지 않고 안내만
  const handleSave = async () => {
    onNotice("미리보기라 실제로 저장되지는 않아요.");
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  };

  return (
    // 통계 화면처럼 섹션마다 흰 카드로 나눠 회색 바탕이 굵은 구분선처럼 보이게 한다
    <div className="space-y-3">
      <h2 className="text-xl font-medium text-gray-900">영업 설정</h2>
      {/* 첫 카드(당일 예약 시간 설정) — 모바일은 목록 박스가 없어 '기타' 줄 아래 카드 여백을 없앤다 (목록 마지막 줄 여백으로 끝) */}
      <div className="bg-white -mx-4 md:mx-0 pt-5 pb-0 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          {/* 당일 예약 시간 설정 */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">당일 예약 시간 설정</h3>
              <p className="text-xs text-gray-400 mt-0.5">유형별로 제작에 최소 몇 시간이 필요한지 입력하세요. (기본값: 2시간)</p>
            </div>
            {/* 코치마크는 제목·안내 글을 빼고 유형별 시간 목록만 감싼다
                모바일: 박스 없이 맨 위·줄 사이 모두 옅은 선, 줄 왼쪽 끝을 제목에 맞춤 / PC: 지금처럼 박스 */}
            <div data-coach="bz-lead" className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
              {["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "기타"].map((type) => (
                <div key={type} className="flex items-center justify-between px-0 md:px-4 py-3 bg-white">
                  <span className="text-sm text-gray-700">{type}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minLeadTimes[type] ?? "2"}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                        const clamped = digits === "" ? "" : String(Math.min(72, Number(digits)));
                        setMinLeadTimes((prev) => ({ ...prev, [type]: clamped }));
                      }}
                      onBlur={() => {
                        if ((minLeadTimes[type] ?? "") === "") {
                          setMinLeadTimes((prev) => ({ ...prev, [type]: "0" }));
                        }
                      }}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-gray-400 bg-white"
                    />
                    <span className="text-xs text-gray-400">시간</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-6">
          {/* 요일별 영업 시간 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">요일별 영업 시간</h3>
            {/* 코치마크는 제목을 빼고 요일 목록만 감싼다
                모바일: 박스 없이 옅은 선으로만 나누고 왼쪽 끝을 제목에 맞춘다. 한 줄 = 요일(휴무면 '휴무') … 시간 · 스위치(오른쪽 끝)
                PC: 지금처럼 박스 안 한 줄 (요일 · 스위치 · 영업/휴무 · 시간) — 순서는 order로 바꾼다 */}
            <div data-coach="bz-hours" className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
              {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                const label = WEEKDAYS[i];
                const day = businessHours[String(i)] ?? { closed: false, open: "09:00", close: "18:00" };
                return (
                  <div key={i} data-coach={i === 4 ? "bz-hours-thu" : undefined} className={`flex items-center gap-3 px-0 md:px-4 py-3 bg-white ${day.closed ? "md:bg-gray-50" : ""}`}>
                    <span className={`order-1 w-6 text-sm font-medium shrink-0 ${day.closed ? "text-gray-300" : "text-gray-700"}`}>
                      {label}
                    </span>
                    {/* 영업/휴무 글자 — 모바일은 휴무일 때만 요일 옆에, PC는 스위치 오른쪽에 항상 */}
                    <span className={`order-2 md:order-3 text-xs shrink-0 w-6 ${day.closed ? "text-gray-300" : "hidden md:inline text-gray-400"}`}>
                      {day.closed ? "휴무" : "영업"}
                    </span>
                    {/* 스위치 — 모바일은 시간 오른쪽(줄 끝), PC는 요일 바로 옆. 휴무면 모바일에서 시간이 없어 스스로 오른쪽 끝으로 */}
                    <button
                      type="button"
                      onClick={() => updateDay(i, { closed: !day.closed })}
                      className={`order-4 md:order-2 ${day.closed ? "ml-auto" : ""} md:ml-0 shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                        day.closed ? "bg-gray-200" : "bg-gold-500"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          day.closed ? "left-0.5" : "left-6"
                        }`}
                      />
                    </button>
                    {day.closed ? (
                      // 휴무 표시 '—'는 PC에서만 (모바일은 요일 옆 '휴무'로 충분)
                      <span className="order-4 hidden md:inline text-sm text-gray-300 ml-auto">—</span>
                    ) : (
                      // 모바일: 스위치 바로 왼쪽 / PC: 줄 오른쪽 끝
                      <div className="order-3 md:order-4 flex items-center gap-2 ml-auto">
                        <TimeSelect value={day.open} onChange={(v) => updateDay(i, { open: v })} />
                        <span className="text-gray-300 text-sm">~</span>
                        <TimeSelect value={day.close} onChange={(v) => updateDay(i, { close: v })} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-6">
          {/* 특정 휴무일 */}
          <div className="space-y-3" data-coach="bz-closed">
            <h3 className="text-sm font-medium text-gray-700">휴무일 설정</h3>
            <p className="text-xs text-gray-400">공휴일, 임시 휴무일 등을 직접 지정합니다.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <DateField value={newDate} onChange={setNewDate} />
              </div>
              <button
                type="button"
                onClick={addClosedDate}
                disabled={!newDate}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                추가
              </button>
            </div>
            {closedDates.length > 0 && (
              <ul className="space-y-1.5">
                {closedDates.map((date) => (
                  <li key={date} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-sm text-gray-700">{formatDate(date)}</span>
                    <button
                      type="button"
                      onClick={() => removeClosedDate(date)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm ml-4"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* 마지막 카드 — 아래 저장 줄과 붙여서 한 카드처럼 보이게 아래 모서리는 각지게.
          Tailwind v4의 space-y는 앞 요소 아래 여백(margin-bottom)으로 간격을 두므로 !mb-0으로 틈을 없앤다 */}
      <div className="!mb-0 bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:rounded-b-none md:p-6">
        <div className="max-w-lg space-y-6">
          {/* 특정 날짜 영업시간 변경 */}
          <div className="space-y-3" data-coach="bz-override">
            <h3 className="text-sm font-medium text-gray-700">영업시간 변경</h3>
            <p className="text-xs text-gray-400">특정 날짜만 영업시간을 다르게 적용합니다. 기본 요일별 영업시간은 그대로 유지됩니다.</p>
            <div className="flex flex-col gap-2">
              <DateField value={overrideDate} onChange={handleOverrideDateChange} />
              <div className="flex items-center gap-2">
                <TimeSelect value={overrideOpen} onChange={setOverrideOpen} />
                <span className="text-gray-300 text-sm">~</span>
                <TimeSelect value={overrideClose} onChange={setOverrideClose} />
                <button
                  type="button"
                  onClick={addDateOverride}
                  disabled={!overrideDate}
                  className="ml-auto px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  추가
                </button>
              </div>
              {overrideDate && dateOverrides[toDateStr(overrideDate)] && (
                <p className="text-xs text-gold-600">이미 등록된 날짜입니다. 추가하면 기존 시간을 덮어씁니다.</p>
              )}
            </div>
            {Object.keys(dateOverrides).length > 0 && (
              <ul className="space-y-1.5">
                {Object.entries(dateOverrides).sort(([a], [b]) => a.localeCompare(b)).map(([date, hours]) => (
                  <li key={date} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-700">
                      {formatDate(date)}
                      <span className="text-gray-400 ml-2">{hours.open}~{hours.close}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDateOverride(date)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm ml-4"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* 저장 — 카드 밖에 두어 어느 섹션을 보고 있어도 화면 아래에 붙어 있게 한다 */}
      {/* 위 카드와 회색 틈 없이 붙이고 옅은 회색 선으로만 구분 */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 -mx-4 md:mx-0 px-4 md:px-6 py-3 md:rounded-b-2xl flex items-center gap-3">
        <SaveButton
          onSave={handleSave}
          className="text-sm font-medium text-white bg-gold-500 hover:bg-gold-600"
        />
      </div>
    </div>
  );
}
