"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DayHours, BusinessHours, DateOverrides } from "@/lib/businessHours";
import SaveButton from "@/components/admin/SaveButton";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import type { CompanySettings } from "./companySettings";
import { useSettingsSync } from "./useSettingsSync";
import { DEFAULT_COLOR_LEAD_DAYS } from "@/lib/todayColors";
import { DEFAULT_TYPE_KEY } from "@/lib/productTypes";
import { useStoreProductTypes } from "./useStoreProductTypes";
import { AFTER_HOURS_END_OPTIONS, AFTER_HOURS_NOTE_MAX, AFTER_HOURS_START_OPTIONS, DEFAULT_AFTER_HOURS_END, DEFAULT_AFTER_HOURS_START } from "@/lib/afterHours";

registerLocale("ko", ko);

interface Props {
  companyId: string;
  settings: CompanySettings;
  onSettingsSaved: (patch: CompanySettings) => void;
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

const DEFAULT_HOURS: BusinessHours = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [String(i), { closed: i === 0, open: "09:00", close: "18:00" }])
);

export default function BusinessSettingsTab({ companyId, settings, onSettingsSaved }: Props) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [dateOverrides, setDateOverrides] = useState<DateOverrides>({});
  const [overrideDate, setOverrideDate] = useState<Date | null>(null);
  const [overrideOpen, setOverrideOpen] = useState("09:00");
  const [overrideClose, setOverrideClose] = useState("18:00");
  const [minLeadTimes, setMinLeadTimes] = useState<Record<string, string>>({});
  // 매장 유형 목록 (당일 예약 시간 줄)
  const productTypes = useStoreProductTypes(companyId, settings.hidden_product_types);
  // 기본 값 — 예전에 '기타'로 저장했으면 그 값을 기본으로
  const defaultLead = minLeadTimes[DEFAULT_TYPE_KEY] ?? minLeadTimes["기타"] ?? "2";
  // 색 맞춤 가능 일수 — 이보다 가까운 날짜 주문은 그날 매장에 있는 색으로 준비
  const [colorLeadDays, setColorLeadDays] = useState(String(DEFAULT_COLOR_LEAD_DAYS));
  // 영업시간 외 수령 — 켜면 이 범위 중 영업시간 앞뒤도 손님이 수령 시간으로 고를 수 있다 (추가 요금 없음)
  const [afterHoursEnabled, setAfterHoursEnabled] = useState(false);
  const [afterHoursStart, setAfterHoursStart] = useState(DEFAULT_AFTER_HOURS_START);
  const [afterHoursEnd, setAfterHoursEnd] = useState(DEFAULT_AFTER_HOURS_END);
  // 마감 후에도 매장에서 준비할 수 있는지 (끄면 준비는 마감 전까지 끝나야 하는 시간만 열린다)
  const [afterHoursPrepAnytime, setAfterHoursPrepAnytime] = useState(false);
  // 영업시간 외 수령 손님에게 전할 안내 (찾아가는 방법 등)
  const [afterHoursNote, setAfterHoursNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // 매장 설정은 대시보드가 한 번 받아둔 값을 사용 (DB 재조회 없음)
  const markOwnSave = useSettingsSync(settings, (data) => {
    if (data.business_hours && Object.keys(data.business_hours).length > 0)
      setBusinessHours(data.business_hours as BusinessHours);
    if (data.closed_dates) setClosedDates(data.closed_dates);
    if (data.date_overrides && typeof data.date_overrides === "object")
      setDateOverrides(pruneOverrides(data.date_overrides as DateOverrides));
    if (typeof data.color_lead_days === "number") setColorLeadDays(String(data.color_lead_days));
    if (typeof data.after_hours_enabled === "boolean") setAfterHoursEnabled(data.after_hours_enabled);
    if (typeof data.after_hours_start === "string") setAfterHoursStart(data.after_hours_start);
    if (typeof data.after_hours_end === "string") setAfterHoursEnd(data.after_hours_end);
    setAfterHoursPrepAnytime(data.after_hours_prep_anytime === true);
    setAfterHoursNote(typeof data.after_hours_note === "string" ? data.after_hours_note : "");
    if (data.min_lead_times && typeof data.min_lead_times === "object")
      setMinLeadTimes(
        Object.fromEntries(
          Object.entries(data.min_lead_times as Record<string, number>).map(([k, v]) => [k, String(v)])
        )
      );
  });
  // 이 탭에서 저장한 값을 공유 설정에도 반영 (다른 탭이 최신 값을 보도록)
  const saveShared = (patch: CompanySettings) => { markOwnSave(); onSettingsSaved(patch); };

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
    setError(null);
    if (afterHoursEnabled && afterHoursStart >= afterHoursEnd) {
      setError("영업시간 외 수령: 끝나는 시간이 시작 시간보다 늦어야 해요.");
      return false;
    }
    const prunedOverrides = pruneOverrides(dateOverrides);
    setDateOverrides(prunedOverrides);
    const patch = {
        business_hours: businessHours,
        closed_dates: closedDates,
        date_overrides: prunedOverrides,
        // 기본 + 값을 넣은 매장 유형만 (비운 유형은 기본을 따르고, 없어진 유형·예전 '기타'는 저장하지 않는다)
        min_lead_times: {
          [DEFAULT_TYPE_KEY]: Number(defaultLead) || 0,
          ...Object.fromEntries(
            productTypes.filter((t) => (minLeadTimes[t] ?? "") !== "").map((t) => [t, Number(minLeadTimes[t]) || 0])
          ),
        },
        color_lead_days: Number(colorLeadDays) || 0,
        after_hours_enabled: afterHoursEnabled,
        after_hours_start: afterHoursStart,
        after_hours_end: afterHoursEnd,
        after_hours_prep_anytime: afterHoursPrepAnytime,
        after_hours_note: afterHoursNote.trim() || null,
      };
    const { error: err } = await supabase
      .from("company_settings")
      .update(patch)
      .eq("company_id", companyId);
    if (err) {
      setError(err.message);
      return false;
    }
    saveShared(patch);
    notifyMenuChanged();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  };

  return (
    // 섹션마다 흰 카드로 나눠 회색 바탕이 굵은 구분선처럼 보이게 한다 (통계 화면과 같은 방식)
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
              <p className="text-xs text-gray-400 mt-0.5 break-keep">제작에 최소 몇 시간이 필요한지 입력하세요. 유형을 비워 두면 기본 시간을 따라요.</p>
            </div>
            {/* 모바일: 박스 없이 맨 위·줄 사이 모두 옅은 선, 줄 왼쪽 끝을 제목에 맞춤 / PC: 박스
                맨 위 '기본'은 따로 정하지 않은 유형이 따라가는 값, 그 아래는 매장 유형 (비워 두면 기본) */}
            <div className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
              {[DEFAULT_TYPE_KEY, ...productTypes].map((type) => {
                const isDefault = type === DEFAULT_TYPE_KEY;
                return (
                  <div key={type} className="flex items-center justify-between px-0 md:px-4 py-3 bg-white">
                    <span className={`text-sm ${isDefault ? "font-medium text-gray-800" : "text-gray-700"}`}>{type}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={isDefault ? defaultLead : minLeadTimes[type] ?? ""}
                        placeholder={isDefault ? "2" : defaultLead || "2"}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                          const clamped = digits === "" ? "" : String(Math.min(72, Number(digits)));
                          setMinLeadTimes((prev) => ({ ...prev, [type]: clamped }));
                        }}
                        onBlur={() => {
                          // 기본은 비울 수 없다 (0시간이면 0) / 유형은 비우면 기본을 따른다
                          if (isDefault && defaultLead === "") setMinLeadTimes((prev) => ({ ...prev, [DEFAULT_TYPE_KEY]: "0" }));
                        }}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-gray-400 bg-white placeholder:text-gray-300"
                      />
                      <span className="text-xs text-gray-400">시간</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 색 맞춤 가능 일수 — 당일 예약 시간처럼 '얼마나 미리 주문해야 하나'를 정하는 값이라 바로 아래에 */}
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-700">색 맞춤 가능 일수</h3>
            <p className="text-xs text-gray-400 mt-0.5 break-keep">
              원하는 색 꽃을 따로 들여오려면 며칠이 필요한지 입력하세요. 입력한 시간보다 가까운 날짜의 주문은<br />대시보드에서 고른 &lsquo;오늘 들어온 꽃 색상&rsquo; 중에서 손님이 고르게 돼요.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl px-0 md:px-4 py-3">
            <span className="text-sm text-gray-700">원하는 색으로 준비 가능</span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={colorLeadDays}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setColorLeadDays(digits === "" ? "" : String(Math.min(30, Number(digits))));
                }}
                onBlur={() => {
                  if (colorLeadDays === "") setColorLeadDays("0");
                }}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-gray-400 bg-white"
              />
              <span className="text-xs text-gray-400">일 전 주문부터</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-6">
          {/* 요일별 영업 시간 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">요일별 영업 시간</h3>
            {/* 모바일: 박스 없이 옅은 선으로만 나누고 왼쪽 끝을 제목에 맞춘다. 한 줄 = 요일(휴무면 '휴무') … 시간 · 스위치(오른쪽 끝)
                PC: 지금처럼 박스 안 한 줄 (요일 · 스위치 · 영업/휴무 · 시간) — 순서는 order로 바꾼다 */}
            <div className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
              {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                const label = WEEKDAYS[i];
                const day = businessHours[String(i)] ?? { closed: false, open: "09:00", close: "18:00" };
                return (
                  <div key={i} className={`flex items-center gap-3 px-0 md:px-4 py-3 bg-white ${day.closed ? "md:bg-gray-50" : ""}`}>
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

      {/* 영업시간 외 수령 — 요일별 영업 시간 바로 아래 (영업시간 앞뒤로 얼마나 더 받을지) */}
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">영업시간 외 수령</h3>
              <p className="text-xs text-gray-400 mt-0.5 break-keep">
                받을 수 있는 시간을 정하면 그중 영업시간 앞뒤도 손님이 수령 시간으로 고를 수 있어요. 추가 요금은 없고, 다른 예약처럼 확인 후 확정·취소하면 돼요.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={afterHoursEnabled}
              onClick={() => setAfterHoursEnabled((v) => !v)}
              className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${afterHoursEnabled ? "bg-gold-500" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${afterHoursEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
          {afterHoursEnabled && (
            <div className="space-y-2">
              {/* 받을 수 있는 시간 범위 — 영업시간과 겹쳐도 된다 (겹친 부분은 원래 영업시간) */}
              <div className="flex items-center justify-between border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl px-0 md:px-4 py-3">
                <span className="text-sm text-gray-700">받을 수 있는 시간</span>
                <div className="flex items-center gap-2">
                  {[
                    { value: afterHoursStart, set: setAfterHoursStart, options: AFTER_HOURS_START_OPTIONS },
                    { value: afterHoursEnd, set: setAfterHoursEnd, options: AFTER_HOURS_END_OPTIONS },
                  ].map((f, i) => (
                    <span key={i} className="flex items-center gap-2">
                      {i > 0 && <span className="text-gray-300 text-sm">~</span>}
                      <select
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="min-w-[92px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
                      >
                        {f.options.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </span>
                  ))}
                </div>
              </div>
              {afterHoursStart >= afterHoursEnd ? (
                <p className="text-xs text-red-500">끝나는 시간이 시작 시간보다 늦어야 해요.</p>
              ) : (
                <p className="text-xs text-gray-400 break-keep">
                  예) 영업 09:00~19:00, 받을 수 있는 시간 04:00~24:00 → 04:00~08:30, 19:30~24:00이 영업시간 외 수령으로 열려요.
                </p>
              )}

              {/* 마감 후 준비 — 끄면 준비가 마감 전에 끝나는 시간만 손님에게 열린다 */}
              <div className="flex items-start justify-between gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-700">마감 후 상품 준비 가능</p>
                  <p className="text-xs text-gray-400 mt-0.5 break-keep">
                    {afterHoursPrepAnytime
                      ? "영업 시간이 지나도 영업시간 외 주문을 받아요."
                      : "비활성화하면 준비가 마감 전에 끝나는 주문만 받아요. (마감 후 다음 날 영업 시작 시간 까지 예약 불가)"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={afterHoursPrepAnytime}
                  onClick={() => setAfterHoursPrepAnytime((v) => !v)}
                  className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${afterHoursPrepAnytime ? "bg-gold-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${afterHoursPrepAnytime ? "left-6" : "left-0.5"}`} />
                </button>
              </div>

              {/* 손님에게 전할 안내 — 영업시간 외 시간을 고르면 주문 화면에 보인다 */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-700">영업시간 외 픽업 안내</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-2 break-keep">영업시간 외 픽업을 고른 손님에게 픽업 방법에 대해서 알림톡으로 전달해요.</p>
                <textarea
                  value={afterHoursNote}
                  onChange={(e) => setAfterHoursNote(e.target.value.slice(0, AFTER_HOURS_NOTE_MAX))}
                  rows={4}
                  placeholder="예) 가게 앞 보관함에 이름표 붙여 둘게요. 도착하시면 문자 주세요."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-400 bg-white placeholder:text-gray-300"
                />
                <p className="text-right text-[11px] text-gray-300">{afterHoursNote.length}/{AFTER_HOURS_NOTE_MAX}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-lg space-y-6">
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

        </div>
      </div>

      {/* 마지막 카드 — 아래 저장 줄과 붙여서 한 카드처럼 보이게 아래 모서리는 각지게.
          Tailwind v4의 space-y는 앞 요소 아래 여백(margin-bottom)으로 간격을 두므로 !mb-0으로 틈을 없앤다 */}
      <div className="!mb-0 bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:rounded-b-none md:p-6">
        <div className="max-w-lg space-y-6">
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

        </div>
      </div>

      {/* 저장 — 카드 밖에 두어 어느 섹션을 보고 있어도 화면 아래에 붙어 있게 하고, 위 카드와는 옅은 회색 선으로만 구분 */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 -mx-4 md:mx-0 px-4 md:px-6 py-3 md:rounded-b-2xl flex items-center gap-3">
        <SaveButton
          onSave={handleSave}
          className="text-sm font-medium text-white bg-gold-500 hover:bg-gold-600"
        />
      </div>
    </div>
  );
}
