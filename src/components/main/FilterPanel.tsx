"use client";

import { Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, FLOWER_COLOR_MAP, WRAPPING_COLORS, MOODS } from "@/lib/constants";
import { EMPTY_FILTER } from "@/lib/filter";

interface FilterPanelProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  hiddenProductTypes?: string[];
}

export default function FilterPanel({ filter, setFilter, hiddenProductTypes = [] }: FilterPanelProps) {
  const hasFilter =
    filter.productTypes.length > 0 ||
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0 ||
    filter.moods.length > 0;

  const toggleProductType = (type: string) =>
    setFilter((f) => ({
      ...f,
      featured: false,
      seasons: [],
      productTypes: f.productTypes.includes(type)
        ? f.productTypes.filter((t) => t !== type)
        : [...f.productTypes, type],
    }));

  const toggleFlowerColor = (color: string) =>
    setFilter((f) => ({
      ...f,
      featured: false,
      seasons: [],
      flowerColors: f.flowerColors.includes(color)
        ? f.flowerColors.filter((c) => c !== color)
        : [...f.flowerColors, color],
    }));

  const toggleWrappingColor = (wc: string) =>
    setFilter((f) => ({
      ...f,
      featured: false,
      seasons: [],
      wrappingColors: f.wrappingColors.includes(wc)
        ? f.wrappingColors.filter((c) => c !== wc)
        : [...f.wrappingColors, wc],
    }));

  const toggleMood = (mood: string) =>
    setFilter((f) => ({
      ...f,
      featured: false,
      seasons: [],
      moods: f.moods.includes(mood)
        ? f.moods.filter((m) => m !== mood)
        : [...f.moods, mood],
    }));

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">상품 유형</h3>
        <div className="grid grid-cols-2 gap-1">
          {PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)).map((type) => (
            <button
              key={type}
              onClick={() => toggleProductType(type)}
              className={`text-center text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                filter.productTypes.includes(type)
                  ? "border-gold-400 bg-gold-400 text-white font-medium"
                  : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">꽃 색상</h3>
        <div className="flex flex-wrap gap-2">
          {FLOWER_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => toggleFlowerColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                filter.flowerColors.includes(color)
                  ? "border-gold-500 scale-110"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
              title={color}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">포장지 색상</h3>
        <div className="grid grid-cols-3 gap-1">
          {WRAPPING_COLORS.map((wc) => (
            <button
              key={wc}
              onClick={() => toggleWrappingColor(wc)}
              className={`text-center text-sm px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                filter.wrappingColors.includes(wc)
                  ? "border-gold-400 bg-gold-400 text-white font-medium"
                  : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
              }`}
            >
              {wc}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">분위기</h3>
        <div className="grid grid-cols-1 gap-1">
          {MOODS.map((mood) => (
            <button
              key={mood}
              onClick={() => toggleMood(mood)}
              className={`text-left text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                filter.moods.includes(mood)
                  ? "border-gold-400 bg-gold-400 text-white font-medium"
                  : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {hasFilter && (
        <button
          onClick={() => setFilter(EMPTY_FILTER)}
          className="mt-3 w-full text-xs py-1.5 rounded-lg border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white transition-colors"
        >
          필터 해제
        </button>
      )}
    </div>
  );
}
