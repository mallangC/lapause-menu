"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  companyId: string;
  onConsultToggle?: (enabled: boolean) => void;
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

export default function ReservationSettingsTab({ companyId, onConsultToggle }: Props) {
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState("");
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState("");
  const [minLeadTimes, setMinLeadTimes] = useState<Record<string, number>>({});
  const [consultNotice, setConsultNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBankInfo, setHasBankInfo] = useState(false);
  const [showBankWarning, setShowBankWarning] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("consult_enabled, business_hours, closed_dates, message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price, bank_name, bank_account, bank_holder, phone, address, min_lead_times, consult_notice")
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
        setHasBankInfo(!!(data.phone && data.address && data.bank_name && data.bank_account && data.bank_holder));
        if (data.min_lead_times && typeof data.min_lead_times === "object") setMinLeadTimes(data.min_lead_times as Record<string, number>);
        if (data.consult_notice) setConsultNotice(data.consult_notice);
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
        min_lead_times: minLeadTimes,
        consult_notice: consultNotice || null,
      })
      .eq("id", companyId);
    if (err) setError(err.message);
    else {
      setSuccess(true);
      onConsultToggle?.(consultEnabled);
    }
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
          onClick={() => {
            if (!consultEnabled && !hasBankInfo) {
              setShowBankWarning(true);
              return;
            }
            setConsultEnabled((prev) => !prev);
          }}
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

      {/* 계좌 정보 미입력 경고 팝업 */}
      {showBankWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowBankWarning(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">계좌 정보를 먼저 입력해주세요</p>
                <p className="text-xs text-gray-400 mt-0.5">맞춤 주문 기능을 활성화하려면 계좌 정보가 필요합니다.</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p>
                맞춤 주문 기능을 활성화하려면<br />
                <span className="font-medium text-gray-700">회사 정보 탭 &gt; 예약 알림 정보</span>에서<br />
                매장 전화번호, 매장 주소, 은행, 계좌번호, 예금주을 모두 입력해주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBankWarning(false)}
              className="w-full bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 메시지 카드 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">메시지 카드</p>
          <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 메시지 카드 옵션을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {messageCardEnabled && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={messageCardPrice}
                onChange={(e) => setMessageCardPrice(e.target.value)}
                placeholder="0"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-400 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-gray-400">원</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMessageCardEnabled((prev) => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative ${messageCardEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${messageCardEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 쇼핑백 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">쇼핑백</p>
          <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 쇼핑백 옵션을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {shoppingBagEnabled && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={shoppingBagPrice}
                onChange={(e) => setShoppingBagPrice(e.target.value)}
                placeholder="0"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-400 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-gray-400">원</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShoppingBagEnabled((prev) => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative ${shoppingBagEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${shoppingBagEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

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

      {/* 예약 확인 안내 문구 */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-gray-700">예약 확인 안내 문구</h3>
          <p className="text-xs text-gray-400 mt-0.5">고객이 예약을 완료하기 직전 확인 화면 상단에 표시됩니다.</p>
        </div>
        <textarea
          value={consultNotice}
          onChange={(e) => setConsultNotice(e.target.value)}
          placeholder={"예) 주문 후 입금까지 완료되어야 예약이 확정됩니다.\n당일 취소는 불가하오니 신중히 주문해주세요."}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none bg-white"
        />
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
