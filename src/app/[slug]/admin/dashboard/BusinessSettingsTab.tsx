"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  companyId: string;
}

interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

type BusinessHours = Record<string, DayHours>;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0"));
const MINUTES = ["00", "30"];

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
  const [newDate, setNewDate] = useState("");
  const [minLeadTimes, setMinLeadTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("business_hours, closed_dates, min_lead_times")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.business_hours && Object.keys(data.business_hours).length > 0)
          setBusinessHours(data.business_hours as BusinessHours);
        if (data.closed_dates) setClosedDates(data.closed_dates);
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
    if (!newDate || closedDates.includes(newDate)) return;
    setClosedDates((prev) => [...prev, newDate].sort());
    setNewDate("");
  };

  const removeClosedDate = (date: string) => {
    setClosedDates((prev) => prev.filter((d) => d !== date));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await supabase
      .from("companies")
      .update({
        business_hours: businessHours,
        closed_dates: closedDates,
        min_lead_times: minLeadTimes,
      })
      .eq("id", companyId);
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
          {["꽃다발", "바구니", "센터피스", "화병꽂이", "기타"].map((type) => (
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
        <h3 className="text-sm font-medium text-gray-700">특정 휴무일</h3>
        <p className="text-xs text-gray-400">공휴일, 임시 휴무일 등을 직접 지정합니다.</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={newDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
          />
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
