"use client";

import { FilterState } from "@/types";
import { FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP } from "@/lib/constants";

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onClearAll: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
}
function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export default function FilterSidebar({
  filter,
  onFilterChange,
  onClearAll,
  mobileOpen,
  onMobileToggle,
}: FilterSidebarProps) {
  const hasFilter =
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0;

  // 일반 필터: 시즌·featured 유지
  const setNormal = (partial: Partial<FilterState>) =>
    onFilterChange({ ...filter, ...partial });

  const filterContent = (
    <div className="space-y-6">
      {/* 꽃 색상 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">
          꽃 색상
        </h3>
        <div className="flex flex-wrap gap-2">
          {FLOWER_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setNormal({ flowerColors: toggleItem(filter.flowerColors, color) })}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                filter.flowerColors.includes(color)
                  ? "border-gold-500 scale-110"
                  : "border-beige-300 hover:border-beige-400"
              }`}
              style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* 포장 색상 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">
          포장지 색상
        </h3>
        <div className="flex flex-col gap-1">
          {WRAPPING_COLORS.map((wc) => (
            <button
              key={wc}
              onClick={() => setNormal({ wrappingColors: toggleItem(filter.wrappingColors, wc) })}
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                filter.wrappingColors.includes(wc)
                  ? "bg-gold-400 text-white font-medium"
                  : "text-foreground hover:bg-beige-200"
              }`}
            >
              {wc}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 해제 */}
      {hasFilter && (
        <button
          onClick={onClearAll}
          className="w-full text-sm py-2 rounded-lg border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white transition-colors"
        >
          필터 전체 해제
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:block w-48 shrink-0">
        <div className="sticky top-6">{filterContent}</div>
      </aside>

      {/* 모바일 하단 고정 패널 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-beige-50 border-t border-beige-200 shadow-lg">
        {mobileOpen && (
          <div className="px-4 pt-4 pb-2 max-h-[60vh] overflow-y-auto">
            {filterContent}
          </div>
        )}
        <button
          onClick={onMobileToggle}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2">
            <span className="text-gold-500 font-semibold tracking-wider text-xs uppercase">필터</span>
            {hasFilter && (
              <span className="bg-gold-400 text-white text-xs px-1.5 py-0.5 rounded-full">ON</span>
            )}
          </span>
          <span className="text-gold-500 text-lg leading-none">{mobileOpen ? "▼" : "▲"}</span>
        </button>
      </div>
    </>
  );
}
