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

const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0")); // 06~23
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

export default function ReservationSettingsTab({ companyId }: Props) {
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState("");
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("consult_enabled, business_hours, closed_dates, message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.consult_enabled) setConsultEnabled(data.consult_enabled);
        if (data.business_hours && Object.keys(data.business_hours).length > 0)
          setBusinessHours(data.business_hours as BusinessHours);
        if (data.closed_dates) setClosedDates(data.closed_dates);
        setMessageCardEnabled(data.message_card_enabled ?? false);
        setMessageCardPrice(data.message_card_price ? String(data.message_card_price) : "");
        setShoppingBagEnabled(data.shopping_bag_enabled ?? false);
        setShoppingBagPrice(data.shopping_bag_price ? String(data.shopping_bag_price) : "");
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
        consult_enabled: consultEnabled,
        business_hours: businessHours,
        closed_dates: closedDates,
        message_card_enabled: messageCardEnabled,
        message_card_price: messageCardEnabled ? (Number(messageCardPrice) || 0) : 0,
        shopping_bag_enabled: shoppingBagEnabled,
        shopping_bag_price: shoppingBagEnabled ? (Number(shoppingBagPrice) || 0) : 0,
      })
      .eq("id", companyId);
    if (err) setError(err.message);
    else setSuccess(true);
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-medium text-gray-900">예약 설정</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">저장되었습니다.</div>
      )}

      {/* 맞춤 주문 기능 활성화 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">맞춤 주문 기능</p>
          <p className="text-xs text-gray-400 mt-0.5">홈 화면에 &#34;맞춤 주문하기&#34; 버튼을 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setConsultEnabled((prev) => !prev)}
          className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${
            consultEnabled ? "bg-gold-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              consultEnabled ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* 메시지 카드 */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">메시지 카드</p>
            <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 메시지 카드 옵션을 표시합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setMessageCardEnabled((prev) => !prev)}
            className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${messageCardEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${messageCardEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
        {messageCardEnabled && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <label className="block text-xs text-gray-500 mt-3 mb-1">추가 금액 (원)</label>
            <input
              type="number"
              value={messageCardPrice}
              onChange={(e) => setMessageCardPrice(e.target.value)}
              placeholder="예: 2000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
            />
          </div>
        )}
      </div>

      {/* 쇼핑백 */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-gray-800">쇼핑백</p>
            <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 쇼핑백 옵션을 표시합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setShoppingBagEnabled((prev) => !prev)}
            className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${shoppingBagEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${shoppingBagEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
        {shoppingBagEnabled && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <label className="block text-xs text-gray-500 mt-3 mb-1">추가 금액 (원)</label>
            <input
              type="number"
              value={shoppingBagPrice}
              onChange={(e) => setShoppingBagPrice(e.target.value)}
              placeholder="예: 2000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
            />
          </div>
        )}
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
                {/* 요일 */}
                <span className={`w-6 text-sm font-medium shrink-0 ${day.closed ? "text-gray-300" : "text-gray-700"}`}>
                  {label}
                </span>

                {/* 휴무 토글 */}
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

                {/* 시간 입력 */}
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

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
