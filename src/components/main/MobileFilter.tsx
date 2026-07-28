"use client";

import { Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import { EMPTY_FILTER } from "@/lib/filter";

interface MobileFilterProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  isOpen: boolean;
  onClose: () => void;
  hasFilter: boolean;
}

export default function MobileFilter({ filter, setFilter, isOpen, onClose, hasFilter }: MobileFilterProps) {
  const toggle = (key: keyof FilterState, value: string) =>
    setFilter((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        featured: false,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">필터</span>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button
                onClick={() => setFilter(EMPTY_FILTER)}
                className="text-xs text-gold-500 hover:text-gold-600 transition-colors"
              >
                초기화
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 필터 내용 */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* 색상 */}
          <div>
            <p className="text-xs font-semibold text-gold-500 mb-2.5">색상</p>
            <div className="flex flex-wrap gap-2">
              {[...FLOWER_COLORS].map((color) => (
                <button
                  key={color}
                  onClick={() => toggle("flowerColors", color)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    filter.flowerColors.includes(color)
                      ? "bg-gold-500 border-gold-500 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gold-400"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                    style={{ backgroundColor: FLOWER_COLOR_MAP[color] }}
                  />
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* 포장지 */}
          <div>
            <p className="text-xs font-semibold text-gold-500 mb-2.5">포장지</p>
            <div className="flex flex-wrap gap-2">
              {[...WRAPPING_COLORS].map((wc) => (
                <button
                  key={wc}
                  onClick={() => toggle("wrappingColors", wc)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    filter.wrappingColors.includes(wc)
                      ? "bg-gold-500 border-gold-500 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gold-400"
                  }`}
                >
                  {wc}
                </button>
              ))}
            </div>
          </div>

          {/* 분위기 */}
          <div>
            <p className="text-xs font-semibold text-gold-500 mb-2.5">분위기</p>
            <div className="flex flex-wrap gap-2">
              {[...MOODS].map((mood) => (
                <button
                  key={mood}
                  onClick={() => toggle("moods", mood)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    filter.moods.includes(mood)
                      ? "bg-gold-500 border-gold-500 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gold-400"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gold-500 text-white text-sm font-medium rounded-xl hover:bg-gold-600 transition-colors"
          >
            적용하기
          </button>
        </div>
      </div>
    </>
  );
}
