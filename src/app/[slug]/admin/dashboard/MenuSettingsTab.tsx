"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { STORAGE_BUCKET } from "@/lib/constants";
import { normalizeSizeConfig, sizeConfigImages } from "@/lib/sizeTiers";
import { removeStorageFiles } from "@/lib/storageCleanup";
import { PRODUCT_TYPES_CHANGED } from "./useStoreProductTypes";

interface Props {
  companyId: string;
  initialHiddenProductTypes: string[];
  initialHiddenSeasons: string[];
  onSave: (hiddenProductTypes: string[], hiddenSeasons: string[]) => void;
  /** 유형 삭제로 정리한 매장 설정(당일 준비 시간·크기 기준)을 공유 설정에도 반영 */
  onSettingsSaved?: (patch: Record<string, unknown>) => void;
}

type CustomCategory = { id: string; category_type: "product_type" | "season"; name: string; hidden: boolean };

const MAX_PRODUCT_TYPES = 10;
const MAX_SEASONS = 5;

export default function MenuSettingsTab({ companyId, initialHiddenProductTypes, initialHiddenSeasons, onSave, onSettingsSaved }: Props) {
  const [hiddenProductTypes, setHiddenProductTypes] = useState<string[]>(initialHiddenProductTypes);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>(initialHiddenSeasons);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [duplicateError, setDuplicateError] = useState<"product_type" | "season" | null>(null);
  const [showProductTypeForm, setShowProductTypeForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  // 삭제하려는 유형에 연결된 상품이 있을 때 띄우는 안내 (상품은 지우지 않는다)
  const [blockedDelete, setBlockedDelete] = useState<{ name: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("company_categories").select("*").eq("company_id", companyId).then(({ data }) => {
      if (data) setCustomCategories(data as CustomCategory[]);
    });
  }, [companyId]);

  /**
   * 상품 유형 삭제 — 이 유형으로 등록된 상품이 있으면 막고 안내한다.
   * 지우면 그 유형의 유형별 설정(당일 준비 시간·크기 기준과 참고 사진)도 함께 정리한다. 상품은 건드리지 않는다.
   */
  const deleteProductType = async (name: string, remove: () => Promise<void>) => {
    if (deleting) return;
    setDeleting(name);
    try {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("product_type", name);
      if ((count ?? 0) > 0) {
        setBlockedDelete({ name, count: count ?? 0 });
        return;
      }
      await remove();
      // 유형별 설정 정리
      const { data: row } = await supabase.from("company_settings").select("min_lead_times, size_tiers").eq("company_id", companyId).single();
      const lead = { ...((row?.min_lead_times as Record<string, number> | null) ?? {}) };
      const size = normalizeSizeConfig(row?.size_tiers);
      const removedImages = size.byType[name] ? sizeConfigImages({ default: [], byType: { [name]: size.byType[name] } }) : [];
      if (name in lead || size.byType[name]) {
        delete lead[name];
        delete size.byType[name];
        const patch = { min_lead_times: lead, size_tiers: size };
        const { error } = await supabase.from("company_settings").update(patch).eq("company_id", companyId);
        if (!error) {
          onSettingsSaved?.(patch);
          removeStorageFiles(supabase, STORAGE_BUCKET, removedImages);
        }
      }
      window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
    } finally {
      setDeleting(null);
    }
  };

  const toggleProductType = async (type: string) => {
    const next = hiddenProductTypes.includes(type)
      ? hiddenProductTypes.filter((t) => t !== type)
      : [...hiddenProductTypes, type];
    setHiddenProductTypes(next);
    await supabase.from("company_settings").update({ hidden_product_types: next }).eq("company_id", companyId);
    notifyMenuChanged();
    onSave(next, hiddenSeasons);
  };

  const toggleSeason = async (season: string) => {
    const next = hiddenSeasons.includes(season)
      ? hiddenSeasons.filter((s) => s !== season)
      : [...hiddenSeasons, season];
    setHiddenSeasons(next);
    await supabase.from("company_settings").update({ hidden_seasons: next }).eq("company_id", companyId);
    notifyMenuChanged();
    onSave(hiddenProductTypes, next);
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
    const { data, error } = await supabase
      .from("company_categories")
      .insert({ company_id: companyId, category_type: type, name: trimmed, hidden: false })
      .select()
      .single();
    if (!error && data) {
      notifyMenuChanged();
      setCustomCategories((prev) => [...prev, data as CustomCategory]);
      if (type === "product_type") window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
      resetFn();
    }
  };

  const toggleCustomHidden = async (id: string) => {
    const cat = customCategories.find((c) => c.id === id);
    if (!cat) return;
    const newHidden = !cat.hidden;
    await supabase.from("company_categories").update({ hidden: newHidden }).eq("id", id);
    notifyMenuChanged();
    setCustomCategories((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: newHidden } : c)));
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("company_categories").delete().eq("id", id);
    notifyMenuChanged();
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
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
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
                    onClick={() => deleteProductType(type, () => toggleProductType(type))}
                    disabled={deleting === type}
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
                    onClick={() => deleteProductType(cat.name, () => deleteCategory(cat.id))}
                    disabled={deleting === cat.name}
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

      {/* 연결된 상품이 있어 유형을 지울 수 없을 때 */}
      {blockedDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40" onClick={() => setBlockedDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              <p className="text-base font-semibold text-gray-900">‘{blockedDelete.name}’ 유형을 삭제할 수 없어요</p>
              <p className="text-sm text-gray-500 break-keep">
                이 유형으로 등록된 상품이 {blockedDelete.count}개 있어요. 상품 관리에서 해당 상품의 유형을 다른 유형으로 바꾼 뒤 삭제해 주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBlockedDelete(null)}
              className="w-full bg-gold-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-gold-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
