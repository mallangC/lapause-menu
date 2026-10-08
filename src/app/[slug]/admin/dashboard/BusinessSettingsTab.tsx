"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DayHours, BusinessHours, DateOverrides } from "@/lib/businessHours";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ko", ko);

interface Props {
  companyId: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTES = ["00", "30"];

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// 오늘보다 이전 날짜의 영업시간 변경 내역은 더 이상 쓸모가 없으므로 정리한다.
const pruneOverrides = (overrides: DateOverrides): DateOverrides => {
  const todayStr = toDateStr(new Date());
  return Object.fromEntries(Object.entries(overrides).filter(([date]) => date >= todayStr));
};

function DateField({ value, onChange, placeholder }: { value: Date | null; onChange: (d: Date | null) => void; placeholder?: string }) {
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

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(":");
  return (
    <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        className="px-2 py-1.5 text-sm text-gray-700 focus:outline-none bg-transparent cursor-pointer"
      >
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>{hh}</option>
        ))}
      </select>
      <span className="text-gray-300 text-sm select-none">:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className="px-2 py-1.5 text-sm text-gray-700 focus:outline-none bg-transparent cursor-pointer"
      >
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>{mm}</option>
        ))}
      </select>
    </div>
  );
}

const DEFAULT_HOURS: BusinessHours = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [String(i), { closed: i === 0, open: "09:00", close: "18:00" }])
);

export default function BusinessSettingsTab({ companyId }: Props) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [dateOverrides, setDateOverrides] = useState<DateOverrides>({});
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [overrideOpen, setOverrideOpen] = useState("09:00");
  const [overrideClose, setOverrideClose] = useState("18:00");
  const [minLeadTimes, setMinLeadTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("business_hours, closed_dates, date_overrides, min_lead_times")
      .eq("company_id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.business_hours && Object.keys(data.business_hours).length > 0)
          setBusinessHours(data.business_hours as BusinessHours);
        if (data.closed_dates) setClosedDates(data.closed_dates);
        if (data.date_overrides && typeof data.date_overrides === "object")
          setDateOverrides(pruneOverrides(data.date_overrides as DateOverrides));
        if (data.min_lead_times && typeof data.min_lead_times === "object")
          setMinLeadTimes(data.min_lead_times as Record<string, number>);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const prunedOverrides = pruneOverrides(dateOverrides);
    setDateOverrides(prunedOverrides);
    const { error: err } = await supabase
      .from("company_settings")
      .update({
        business_hours: businessHours,
        closed_dates: closedDates,
        date_overrides: prunedOverrides,
        min_lead_times: minLeadTimes,
      })
      .eq("company_id", companyId);
    if (err) setError(err.message);
    else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-medium text-gray-900">영업 설정</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {/* 당일 예약 시간 설정 */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700">당일 예약 시간 설정</h3>
          <p className="text-xs text-gray-400 mt-0.5">현재 시각 기준 몇 시간 이후부터 예약 가능한지 설정합니다. (기본값: 2시간)</p>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "기타"].map((type) => (
            <div key={type} className="flex items-center justify-between px-4 py-3 bg-white">
              <span className="text-sm text-gray-700">{type}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={minLeadTimes[type] ?? 2}
                  onChange={(e) => setMinLeadTimes((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-gray-400 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-400">시간</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 요일별 영업 시간 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">요일별 영업 시간</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6, 0].map((i) => {
            const label = WEEKDAYS[i];
            const day = businessHours[String(i)] ?? { closed: false, open: "09:00", close: "18:00" };
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${day.closed ? "bg-gray-50" : "bg-white"}`}>
                <span className={`w-6 text-sm font-medium shrink-0 ${day.closed ? "text-gray-300" : "text-gray-700"}`}>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => updateDay(i, { closed: !day.closed })}
                  className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                    day.closed ? "bg-gray-200" : "bg-gold-500"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      day.closed ? "left-0.5" : "left-6"
                    }`}
                  />
                </button>
                <span className={`text-xs shrink-0 w-6 ${day.closed ? "text-gray-300" : "text-gray-400"}`}>
                  {day.closed ? "휴무" : "영업"}
                </span>
                {day.closed ? (
                  <span className="text-sm text-gray-300 ml-auto">—</span>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
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

      {/* 특정 휴무일 */}
      <div className="space-y-3">
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

      {/* 특정 날짜 영업시간 변경 */}
      <div className="space-y-3">
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

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-0 pt-4 pb-1 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        {success && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            저장되었습니다.
          </span>
        )}
      </div>
    </div>
  );
}
