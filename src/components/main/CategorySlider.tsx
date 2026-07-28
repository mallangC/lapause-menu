"use client";

const CATEGORY_ICONS: Record<string, string> = {
  "다발": "💐",
  "바구니": "🧺",
  "센터피스": "🌺",
  "화병꽂이": "🏺",
  "식물": "🌿",
  "조화": "🌹",
};

const DISPLAY_NAMES: Record<string, string> = {
  "다발": "꽃다발",
  "바구니": "꽃바구니",
};

interface CategorySliderProps {
  types: string[];
  selectedTypes: string[];
  onSelect: (type: string) => void;
}

export default function CategorySlider({ types, selectedTypes, onSelect }: CategorySliderProps) {
  return (
    <div className="flex gap-5 overflow-x-auto px-4 py-5 no-scrollbar justify-center">
      {types.map((type) => {
        const isSelected = selectedTypes.includes(type);
        return (
          <button key={type} onClick={() => onSelect(type)} className="flex flex-col items-center gap-2 shrink-0">
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                isSelected ? "border-gold-500 bg-gold-50 shadow-sm" : "border-gray-200 bg-white"
              }`}
            >
              {CATEGORY_ICONS[type] ?? "🌷"}
            </span>
            <span className={`text-xs font-medium whitespace-nowrap ${isSelected ? "text-gold-500" : "text-gray-500"}`}>
              {DISPLAY_NAMES[type] ?? type}
            </span>
          </button>
        );
      })}
    </div>
  );
}
