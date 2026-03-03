import { FilterState } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP } from "@/lib/constants";

interface FilterSidebarProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onClearAll: () => void;
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export default function FilterSidebar({
  filter,
  onFilterChange,
  onClearAll,
}: FilterSidebarProps) {
  const hasFilter =
    filter.productTypes.length > 0 ||
    filter.flowerColors.length > 0 ||
    filter.wrappingColors.length > 0;

  return (
    <aside className="w-48 shrink-0">
      <div className="sticky top-6 space-y-6">
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
                style={{
                  backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e",
                }}
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
    </aside>
  );
}
