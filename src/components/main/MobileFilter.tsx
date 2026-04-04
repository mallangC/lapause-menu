"use client";

import { Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { SEASONS } from "@/lib/constants";
import { EMPTY_FILTER } from "@/lib/filter";
import FilterPanel from "./FilterPanel";

interface MobileFilterProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  isOpen: boolean;
  onToggle: () => void;
  hiddenProductTypes?: string[];
  hiddenSeasons?: string[];
}

export default function MobileFilter({ filter, setFilter, isOpen, onToggle, hiddenProductTypes = [], hiddenSeasons = [] }: MobileFilterProps) {
  const isAll = !filter.featured && !filter.isSeason;
  const isSeason = filter.isSeason;

  return (
    <div className="md:hidden border-b border-gray-100 bg-white">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <span className="text-xs font-medium text-gold-500">필터</span>
        <span className="text-gold-500 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {isAll && <FilterPanel filter={filter} setFilter={setFilter} hiddenProductTypes={hiddenProductTypes} />}
          {isSeason && (
            <div className="grid grid-cols-3 gap-1.5">
              {SEASONS.filter((s) => !hiddenSeasons.includes(s)).map((season) => (
                <button
                  key={season}
                  onClick={() =>
                    setFilter({
                      ...EMPTY_FILTER,
                      isSeason: true,
                      seasons: filter.seasons.length === 1 && filter.seasons.includes(season) ? [] : [season],
                    })
                  }
                  className={`text-center text-sm py-2 rounded-lg border transition-colors ${
                    filter.seasons.includes(season)
                      ? "border-gold-400 bg-gold-400 text-white font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-500"
                  }`}
                >
                  {season}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
