"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";

interface Props {
  companyId: string;
  initialHiddenProductTypes: string[];
  initialHiddenSeasons: string[];
  onSave: (hiddenProductTypes: string[], hiddenSeasons: string[]) => void;
}

type CustomCategory = { id: string; category_type: "product_type" | "season"; name: string; hidden: boolean };

export default function MenuSettingsTab({ companyId, initialHiddenProductTypes, initialHiddenSeasons, onSave }: Props) {
  const [hiddenProductTypes, setHiddenProductTypes] = useState<string[]>(initialHiddenProductTypes);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>(initialHiddenSeasons);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [duplicateError, setDuplicateError] = useState<"product_type" | "season" | null>(null);
  const [showProductTypeForm, setShowProductTypeForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("company_categories").select("*").eq("company_id", companyId).then(({ data }) => {
      if (data) setCustomCategories(data as CustomCategory[]);
    });
  }, [companyId]);

  const toggleProductType = async (type: string) => {
    const next = hiddenProductTypes.includes(type)
      ? hiddenProductTypes.filter((t) => t !== type)
      : [...hiddenProductTypes, type];
    setHiddenProductTypes(next);
    await supabase.from("company_settings").update({ hidden_product_types: next }).eq("company_id", companyId);
    onSave(next, hiddenSeasons);
  };

  const toggleSeason = async (season: string) => {
    const next = hiddenSeasons.includes(season)
      ? hiddenSeasons.filter((s) => s !== season)
      : [...hiddenSeasons, season];
    setHiddenSeasons(next);
    await supabase.from("company_settings").update({ hidden_seasons: next }).eq("company_id", companyId);
    onSave(hiddenProductTypes, next);
  };

  const addCategory = async (type: "product_type" | "season", name: string, resetFn: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const builtins = type === "product_type" ? (PRODUCT_TYPES as readonly string[]) : (SEASONS as readonly string[]);
    const isDuplicate =
      builtins.includes(trimmed) ||
      customCategories.some((c) => c.category_type === type && c.name === trimmed);
    if (isDuplicate) { setDuplicateError(type); return; }
    setDuplicateError(null);
    const { data, error } = await supabase
      .from("company_categories")
      .insert({ company_id: companyId, category_type: type, name: trimmed, hidden: false })
      .select()
      .single();
    if (!error && data) {
      setCustomCategories((prev) => [...prev, data as CustomCategory]);
      resetFn();
    }
  };

  const toggleCustomHidden = async (id: string) => {
    const cat = customCategories.find((c) => c.id === id);
    if (!cat) return;
    const newHidden = !cat.hidden;
    await supabase.from("company_categories").update({ hidden: newHidden }).eq("id", id);
    setCustomCategories((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: newHidden } : c)));
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("company_categories").delete().eq("id", id);
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium text-gray-900 mb-1">메뉴 설정</h2>
        <p className="text-xs text-gray-400">클릭하면 고객 필터에서 숨깁니다. 직접 추가, 삭제도 가능합니다.</p>
      </div>

      {/* 상품 유형 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">상품 유형</p>
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
          {customCategories.filter((c) => c.category_type === "product_type").map((cat) => (
            <div key={cat.id} className="relative">
              <button
                onClick={() => toggleCustomHidden(cat.id)}
                className={`w-full py-2 px-3 pr-7 rounded-lg border text-sm transition-colors ${
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
          ) : (
            <button
              onClick={() => setShowProductTypeForm(true)}
              className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* 시즌 */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">시즌</p>
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
          {customCategories.filter((c) => c.category_type === "season").map((cat) => (
            <div key={cat.id} className="relative">
              <button
                onClick={() => toggleCustomHidden(cat.id)}
                className={`w-full py-2 px-3 pr-7 rounded-lg border text-sm transition-colors ${
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
          ) : (
            <button
              onClick={() => setShowSeasonForm(true)}
              className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
