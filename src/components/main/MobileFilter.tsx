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
}

export default function MobileFilter({ filter, setFilter, isOpen, onToggle }: MobileFilterProps) {
  const isAll = !filter.featured && !filter.isSeason;
  const isSeason = filter.isSeason;

  return (
    <div className="md:hidden border-b border-gray-100 bg-white">
      <button onClick={onToggle} className="w-full flex items-center justify-end px-4 py-3">
        <span className="text-gold-500 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {isAll && <FilterPanel filter={filter} setFilter={setFilter} />}
          {isSeason && (
            <div className="grid grid-cols-3 gap-1.5">
              {SEASONS.map((season) => (
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
                      : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
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
