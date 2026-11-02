"use client";

import { useState } from "react";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";

type CustomCategory = { id: string; category_type: "product_type" | "season"; name: string; hidden: boolean };

const MAX_PRODUCT_TYPES = 10;
const MAX_SEASONS = 5;

// 미리보기 목업 — 조화·어버이날·현장 판매는 지운 상태(시즌은 크리스마스만), 매장이 직접 만든 상품 유형(웨딩 부케) 하나
const MOCK_CUSTOM: CustomCategory[] = [
  { id: "c1", category_type: "product_type", name: "웨딩 부케", hidden: false },
];

// 미리보기 메뉴 설정 — 실제 MenuSettingsTab 복사본. 추가·숨김·삭제가 화면 안에서만 바뀐다 (DB 없음)
export default function PreviewMenuSettingsTab() {
  const [hiddenProductTypes, setHiddenProductTypes] = useState<string[]>(["조화"]);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>(["어버이날", "현장 판매"]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(MOCK_CUSTOM);
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [duplicateError, setDuplicateError] = useState<"product_type" | "season" | null>(null);
  const [showProductTypeForm, setShowProductTypeForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);

  const toggleProductType = async (type: string) => {
    const next = hiddenProductTypes.includes(type)
      ? hiddenProductTypes.filter((t) => t !== type)
      : [...hiddenProductTypes, type];
    setHiddenProductTypes(next);
  };

  const toggleSeason = async (season: string) => {
    const next = hiddenSeasons.includes(season)
      ? hiddenSeasons.filter((s) => s !== season)
      : [...hiddenSeasons, season];
    setHiddenSeasons(next);
  };

  const addCategory = async (type: "product_type" | "season", name: string, resetFn: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const builtins = type === "product_type" ? (PRODUCT_TYPES as readonly string[]) : (SEASONS as readonly string[]);
    const hiddenBuiltins = type === "product_type" ? hiddenProductTypes : hiddenSeasons;
    const isDuplicate =
      (builtins.includes(trimmed) && !hiddenBuiltins.includes(trimmed)) ||
      customCategories.some((c) => c.category_type === type && c.name === trimmed);
    if (isDuplicate) { setDuplicateError(type); return; }
    setDuplicateError(null);
    setCustomCategories((prev) => [...prev, { id: `added-${Date.now()}`, category_type: type, name: trimmed, hidden: false }]);
    resetFn();
  };

  const toggleCustomHidden = async (id: string) => {
    const cat = customCategories.find((c) => c.id === id);
    if (!cat) return;
    const newHidden = !cat.hidden;
    setCustomCategories((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: newHidden } : c)));
  };

  const deleteCategory = async (id: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const activeProductTypeCount =
    PRODUCT_TYPES.filter((type) => !hiddenProductTypes.includes(type)).length +
    customCategories.filter((c) => c.category_type === "product_type" && !c.hidden).length;
  const activeSeasonCount =
    SEASONS.filter((season) => !hiddenSeasons.includes(season)).length +
    customCategories.filter((c) => c.category_type === "season" && !c.hidden).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-medium text-gray-900 mb-1">메뉴 설정</h2>
        <p className="text-xs text-gray-400">직접 추가, 삭제가 가능합니다. 기본 제공 항목도 삭제할 수 있습니다.</p>
      </div>
      <div data-coach="mn-all" className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="space-y-8">
          {/* 상품 유형 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              상품 유형 <span className="text-gray-400 font-normal">({activeProductTypeCount}/{MAX_PRODUCT_TYPES})</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PRODUCT_TYPES.filter((type) => !hiddenProductTypes.includes(type)).map((type) => (
                <div key={type} className="relative flex items-center justify-center py-2 px-3 pr-7 rounded-lg border border-gray-200 text-sm text-gray-700">
                  <span className="truncate">{type}</span>
                  <button
                    onClick={() => toggleProductType(type)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
              {customCategories.filter((c) => c.category_type === "product_type").map((cat) => (
                <div key={cat.id} className="relative">
                  <button
                    onClick={() => toggleCustomHidden(cat.id)}
                    className={`w-full py-2 px-3 pr-7 rounded-lg border text-sm text-center truncate transition-colors ${
                      cat.hidden
                        ? "border-red-300 bg-red-50 text-red-500 font-medium"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {cat.hidden ? `${cat.name} (숨김)` : cat.name}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
              {showProductTypeForm ? (
                <div className="space-y-1">
                  <input
                    autoFocus
                    value={newProductTypeName}
                    onChange={(e) => { setNewProductTypeName(e.target.value); if (duplicateError === "product_type") setDuplicateError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addCategory("product_type", newProductTypeName, () => { setNewProductTypeName(""); setShowProductTypeForm(false); }); }
                      if (e.key === "Escape") { setShowProductTypeForm(false); setNewProductTypeName(""); setDuplicateError(null); }
                    }}
                    onBlur={() => { if (!newProductTypeName.trim()) { setShowProductTypeForm(false); setDuplicateError(null); } }}
                    placeholder="이름 입력 후 엔터"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm placeholder-gray-300 focus:outline-none ${duplicateError === "product_type" ? "border-red-400 text-red-500" : "border-gold-400 text-gray-700 focus:border-gold-500"}`}
                  />
                  {duplicateError === "product_type" && <p className="text-xs text-red-500 leading-tight">중복된 이름</p>}
                </div>
              ) : activeProductTypeCount < MAX_PRODUCT_TYPES ? (
                <button
                  onClick={() => setShowProductTypeForm(true)}
                  className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
                >
                  +
                </button>
              ) : null}
            </div>
          </div>

          {/* 시즌 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              시즌 <span className="text-gray-400 font-normal">({activeSeasonCount}/{MAX_SEASONS})</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SEASONS.filter((season) => !hiddenSeasons.includes(season)).map((season) => (
                <div key={season} className="relative flex items-center justify-center py-2 px-3 pr-7 rounded-lg border border-gray-200 text-sm text-gray-700">
                  <span className="truncate">{season}</span>
                  <button
                    onClick={() => toggleSeason(season)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
              {customCategories.filter((c) => c.category_type === "season").map((cat) => (
                <div key={cat.id} className="relative">
                  <button
                    onClick={() => toggleCustomHidden(cat.id)}
                    className={`w-full py-2 px-3 pr-7 rounded-lg border text-sm text-center truncate transition-colors ${
                      cat.hidden
                        ? "border-red-300 bg-red-50 text-red-500 font-medium"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {cat.hidden ? `${cat.name} (숨김)` : cat.name}
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-base leading-none"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
              {showSeasonForm ? (
                <div className="space-y-1">
                  <input
                    autoFocus
                    value={newSeasonName}
                    onChange={(e) => { setNewSeasonName(e.target.value); if (duplicateError === "season") setDuplicateError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addCategory("season", newSeasonName, () => { setNewSeasonName(""); setShowSeasonForm(false); }); }
                      if (e.key === "Escape") { setShowSeasonForm(false); setNewSeasonName(""); setDuplicateError(null); }
                    }}
                    onBlur={() => { if (!newSeasonName.trim()) { setShowSeasonForm(false); setDuplicateError(null); } }}
                    placeholder="이름 입력 후 엔터"
                    className={`w-full border rounded-lg px-2.5 py-2 text-sm placeholder-gray-300 focus:outline-none ${duplicateError === "season" ? "border-red-400 text-red-500" : "border-gold-400 text-gray-700 focus:border-gold-500"}`}
                  />
                  {duplicateError === "season" && <p className="text-xs text-red-500 leading-tight">중복된 이름</p>}
                </div>
              ) : activeSeasonCount < MAX_SEASONS ? (
                <button
                  onClick={() => setShowSeasonForm(true)}
                  className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
                >
                  +
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
