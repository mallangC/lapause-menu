"use client";

import { useState, useRef, Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { SEASONS } from "@/lib/constants";
import { EMPTY_FILTER } from "@/lib/filter";
import FilterPanel from "./FilterPanel";

interface MainNavProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  setMobileFilterOpen: Dispatch<SetStateAction<boolean>>;
  hiddenProductTypes?: string[];
  hiddenSeasons?: string[];
}

export default function MainNav({ filter, setFilter, setMobileFilterOpen, hiddenProductTypes = [], hiddenSeasons = [] }: MainNavProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (tab: string) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setOpenDropdown(tab);
  };

  const handleLeave = () => {
    dropdownTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const isAll = !filter.featured && !filter.isSeason;
  const isSeason = filter.isSeason;

  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 flex gap-1 justify-center">

        <button
          onClick={() => setFilter({ ...EMPTY_FILTER, featured: true })}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            filter.featured
              ? "border-gold-500 text-gold-500"
              : "border-transparent text-foreground/60 hover:text-foreground"
          }`}
        >
          추천/인기
        </button>

        <div className="relative" onMouseEnter={() => handleEnter("ALL")} onMouseLeave={handleLeave}>
          <button
            onClick={() => { setFilter(EMPTY_FILTER); setMobileFilterOpen(true); }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              isAll
                ? "border-gold-500 text-gold-500"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            모든 상품
          </button>
          {openDropdown === "ALL" && (
            <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
                <FilterPanel filter={filter} setFilter={setFilter} hiddenProductTypes={hiddenProductTypes} />
              </div>
            </div>
          )}
        </div>

        <div className="relative" onMouseEnter={() => handleEnter("시즌")} onMouseLeave={handleLeave}>
          <button
            onClick={() => { if (isSeason) return; setFilter({ ...EMPTY_FILTER, isSeason: true }); }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              isSeason
                ? "border-gold-500 text-gold-500"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            시즌
          </button>
          {openDropdown === "시즌" && (
            <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-36">
                <div className="flex flex-col gap-1">
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
                      className={`text-center text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        filter.seasons.includes(season)
                          ? "border-gold-400 bg-gold-400 text-white font-medium"
                          : "border-gold-500/50 text-foreground hover:bg-gold-500/50"
                      }`}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}
