"use client";

import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { FilterState } from "@/types";
import { EMPTY_FILTER } from "@/lib/filter";

interface MainNavProps {
  filter: FilterState;
  setFilter: Dispatch<SetStateAction<FilterState>>;
  consultEnabled?: boolean;
  slug?: string;
}

export default function MainNav({ filter, setFilter, consultEnabled = false, slug }: MainNavProps) {
  const isAll = !filter.featured && !filter.isSeason;
  const isFeatured = filter.featured;
  const isSeason = filter.isSeason;

  const tabClass = (active: boolean) =>
    `px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? "border-gold-500 text-gold-500" : "border-transparent text-gray-500 hover:text-gray-800"
    }`;

  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-2 flex justify-center gap-0">
        <button onClick={() => setFilter(EMPTY_FILTER)} className={tabClass(isAll)}>
          전체
        </button>
        <button onClick={() => setFilter({ ...EMPTY_FILTER, featured: true })} className={tabClass(isFeatured)}>
          추천/인기
        </button>
        <button onClick={() => setFilter({ ...EMPTY_FILTER, isSeason: true })} className={tabClass(isSeason)}>
          시즌
        </button>
        {consultEnabled && slug && (
          <Link href={`/${slug}/consult`} className={tabClass(false)}>
            맞춤주문
          </Link>
        )}
      </div>
    </nav>
  );
}
