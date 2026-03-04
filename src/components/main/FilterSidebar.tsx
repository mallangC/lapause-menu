import { FilterState } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP, SEASONS } from "@/lib/constants";

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onSeasonSelect: (season: string) => void;
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
  onSeasonSelect,
  onClearAll,
  mobileOpen,
  onMobileToggle,
}: FilterSidebarProps) {
  const hasFilter =
    filter.productTypes.length > 0 ||
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0 ||
    filter.seasons.length > 0;

  const filterContent = (
    <div className="space-y-6">
      {/* 상품 유형 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">
          상품 유형
        </h3>
        <div className="flex flex-col gap-1">
          {PRODUCT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  productTypes: toggleItem(filter.productTypes, type),
                })
              }
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                filter.productTypes.includes(type)
                  ? "bg-gold-400 text-white font-medium"
                  : "text-foreground hover:bg-beige-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 꽃 색상 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">
          꽃 색상
        </h3>
        <div className="flex flex-wrap gap-2">
          {FLOWER_COLORS.map((color) => (
            <button
              key={color}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  flowerColors: toggleItem(filter.flowerColors, color),
                })
              }
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
              onClick={() =>
                onFilterChange({
                  ...filter,
                  wrappingColors: toggleItem(filter.wrappingColors, wc),
                })
              }
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

      {/* 시즌 */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-500 mb-2">
          시즌
        </h3>
        <div className="flex flex-col gap-1">
          {SEASONS.map((season) => (
            <button
              key={season}
              onClick={() => onSeasonSelect(season)}
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                filter.seasons.includes(season)
                  ? "bg-gold-400 text-white font-medium"
                  : "text-foreground hover:bg-beige-200"
              }`}
            >
              {season}
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
        {/* 필터 내용 - 열렸을 때만 표시 */}
        {mobileOpen && (
          <div className="px-4 pt-4 pb-2 max-h-[60vh] overflow-y-auto">
            {filterContent}
          </div>
        )}

        {/* 토글 버튼 */}
        <button
          onClick={onMobileToggle}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2">
            <span className="text-gold-500 font-semibold tracking-wider text-xs uppercase">
              필터
            </span>
            {hasFilter && (
              <span className="bg-gold-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                ON
              </span>
            )}
          </span>
          <span className="text-gold-500 text-lg leading-none">
            {mobileOpen ? "▼" : "▲"}
          </span>
        </button>
      </div>
    </>
  );
}
