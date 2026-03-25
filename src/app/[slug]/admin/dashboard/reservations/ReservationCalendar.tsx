"use client";

import React from "react";
import { WEEKDAYS } from "./constants";

interface Props {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  dayCounts: Record<string, number>;
  unconfirmedDays?: Set<string>;
}

export default function ReservationCalendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
  dayCounts,
  unconfirmedDays,
}: Props) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = i - firstDow + 1;
    const isValid = d >= 1 && d <= daysInMonth;
    const dateStr = isValid
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      : null;
    const count = dateStr ? (dayCounts[dateStr] ?? 0) : 0;
    const isSelected = dateStr !== null && dateStr === selectedDay;
    const isToday = dateStr === todayStr;
    const dow = i % 7;
    const isLastRow = i >= totalCells - 7;
    const hasUnconfirmed = dateStr ? (unconfirmedDays?.has(dateStr) ?? false) : false;

    cells.push(
      <button
        key={i}
        type="button"
        disabled={!isValid}
        onClick={() => isValid && dateStr && onSelectDay(isSelected ? null : dateStr)}
        className={`relative flex flex-col items-center h-14 border-b border-r border-gray-200 text-xs transition-all
          ${isLastRow ? "border-b-0" : ""}
          ${dow === 6 ? "border-r-0" : ""}
          ${isSelected ? "bg-gold-500 text-white" : isValid ? "hover:bg-gray-50" : "bg-gray-100"}
          pt-1.5`}
      >
        {isValid && (
          <>
            <span className={`leading-none text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${
              isSelected ? "text-white" :
              isToday ? "bg-gold-500 text-white" :
              dow === 0 ? "text-red-400" :
              dow === 6 ? "text-blue-400" :
              "text-gray-700"
            }`}>{d}</span>
            {hasUnconfirmed && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
            {count > 0 && (
              <span className={`absolute inset-0 flex items-end justify-center pb-1 text-xs font-semibold ${isSelected ? "text-white" : "text-gold-500"}`}>
                {count}
              </span>
            )}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-700">{year}년 {month + 1}월</span>
        <button
          onClick={onNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border border-b-0 border-gray-200 rounded-t-xl overflow-hidden">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1.5 bg-gray-50 border-r border-gray-200
              ${i === 6 ? "border-r-0" : ""}
              ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="border border-gray-200 rounded-b-xl overflow-hidden">
        <div className="grid grid-cols-7">{cells}</div>
      </div>

      {/* 필터 표시 */}
      {selectedDay && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{selectedDay.slice(5).replace("-", "월 ")}일</span> 예약만 표시 중
          </span>
          <button
            onClick={() => onSelectDay(null)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            필터 해제
          </button>
        </div>
      )}
    </div>
  );
}
