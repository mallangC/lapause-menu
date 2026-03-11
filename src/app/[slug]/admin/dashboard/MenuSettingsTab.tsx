"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";

interface Props {
  companyId: string;
  initialHiddenProductTypes: string[];
  initialHiddenSeasons: string[];
  onSave: (hiddenProductTypes: string[], hiddenSeasons: string[]) => void;
}

export default function MenuSettingsTab({ companyId, initialHiddenProductTypes, initialHiddenSeasons, onSave }: Props) {
  const [hiddenProductTypes, setHiddenProductTypes] = useState<string[]>(initialHiddenProductTypes);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>(initialHiddenSeasons);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const toggleProductType = (type: string) => {
    setHiddenProductTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setSaved(false);
  };

  const toggleSeason = (season: string) => {
    setHiddenSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from("companies")
      .update({ hidden_product_types: hiddenProductTypes, hidden_seasons: hiddenSeasons })
      .eq("id", companyId);
    setSaving(false);
    setSaved(true);
    onSave(hiddenProductTypes, hiddenSeasons);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-1">메뉴 설정</h2>
        <p className="text-sm text-gray-400">고객 화면의 필터에서 숨길 항목을 선택하세요.</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">상품 유형 숨김</h3>
        <p className="text-xs text-gray-400 mb-3">선택한 유형은 고객 필터에서 보이지 않습니다.</p>
        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_TYPES.map((type) => {
            const isHidden = hiddenProductTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleProductType(type)}
                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                  isHidden
                    ? "border-red-300 bg-red-50 text-red-500 font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {isHidden ? `${type} (숨김)` : type}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">시즌 숨김</h3>
        <p className="text-xs text-gray-400 mb-3">선택한 시즌은 고객 필터에서 보이지 않습니다.</p>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map((season) => {
            const isHidden = hiddenSeasons.includes(season);
            return (
              <button
                key={season}
                onClick={() => toggleSeason(season)}
                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                  isHidden
                    ? "border-red-300 bg-red-50 text-red-500 font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {isHidden ? `${season} (숨김)` : season}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-gold-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50"
      >
        {saving ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
      </button>
    </div>
  );
}
