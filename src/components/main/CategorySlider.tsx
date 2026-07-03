"use client";

import { Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { PRODUCT_TYPES } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, string> = {
  "다발": "💐",
  "바구니": "🧺",
  "센터피스": "🌺",
  "화병꽂이": "🏺",
  "식물": "🌿",
  "조화": "🌹",
};

interface CategorySliderProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  hiddenProductTypes?: string[];
  customProductTypes?: string[];
}

export default function CategorySlider({ filter, setFilter, hiddenProductTypes = [], customProductTypes = [] }: CategorySliderProps) {
  const allTypes = [
    ...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)),
    ...customProductTypes,
  ];

  const isAllSelected = filter.productTypes.length === 0;

  const toggleType = (type: string) => {
    setFilter((f) => ({
      ...f,
      featured: false,
      isSeason: false,
      productTypes: f.productTypes.includes(type)
        ? f.productTypes.filter((t) => t !== type)
        : [...f.productTypes, type],
    }));
  };

  const selectAll = () => {
    setFilter((f) => ({ ...f, productTypes: [], featured: false, isSeason: false }));
  };

  return (
    <div className="flex gap-5 overflow-x-auto px-4 py-5 no-scrollbar">
      <button onClick={selectAll} className="flex flex-col items-center gap-2 shrink-0">
        <span
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
            isAllSelected ? "border-gold-500 bg-gold-50 shadow-sm" : "border-gray-200 bg-white"
          }`}
        >
          🌸
        </span>
        <span className={`text-xs font-medium ${isAllSelected ? "text-gold-500" : "text-gray-500"}`}>전체</span>
      </button>

      {allTypes.map((type) => {
        const isSelected = filter.productTypes.includes(type);
        return (
          <button key={type} onClick={() => toggleType(type)} className="flex flex-col items-center gap-2 shrink-0">
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                isSelected ? "border-gold-500 bg-gold-50 shadow-sm" : "border-gray-200 bg-white"
              }`}
            >
              {CATEGORY_ICONS[type] ?? "🌷"}
            </span>
            <span className={`text-xs font-medium whitespace-nowrap ${isSelected ? "text-gold-500" : "text-gray-500"}`}>
              {type}
            </span>
          </button>
        );
      })}
    </div>
  );
}
