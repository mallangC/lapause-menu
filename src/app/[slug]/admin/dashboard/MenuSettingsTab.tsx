"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { STORAGE_BUCKET } from "@/lib/constants";
import { normalizeSizeConfig, sizeConfigImages } from "@/lib/sizeTiers";
import { removeStorageFiles } from "@/lib/storageCleanup";
import { PRODUCT_TYPES_CHANGED, sortByOrder } from "@/lib/productTypes";
import SortableChips, { type ChipItem } from "@/components/admin/SortableChips";
import InstantMenuSettings from "./InstantMenuSettings";

interface Props {
  companyId: string;
  initialHiddenProductTypes: string[];
  initialHiddenSeasons: string[];
  onSave: (hiddenProductTypes: string[], hiddenSeasons: string[]) => void;
  /** 유형 삭제로 정리한 매장 설정(당일 준비 시간·볼륨감 참고 이미지)을 공유 설정에도 반영 */
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
  const [showProductTypeForm, setShowProductTypeForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  // 삭제하려는 유형에 연결된 상품이 있을 때 띄우는 안내 (상품은 지우지 않는다)
  const [blockedDelete, setBlockedDelete] = useState<{ name: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  // 사장님이 정한 순서 (메뉴판 탭·필터·상담 유형 선택에 그대로 쓰인다)
  const [productTypeOrder, setProductTypeOrder] = useState<string[]>([]);
  const [seasonOrder, setSeasonOrder] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("company_categories").select("*").eq("company_id", companyId).then(({ data }) => {
      if (data) setCustomCategories(data as CustomCategory[]);
    });
    supabase.from("company_settings").select("product_type_order, season_order").eq("company_id", companyId).maybeSingle().then(({ data }) => {
      setProductTypeOrder((data?.product_type_order as string[] | null) ?? []);
      setSeasonOrder((data?.season_order as string[] | null) ?? []);
    });
  }, [companyId]);

  /** 순서 저장 — 화면에 보이는 이름 순서 그대로 (지운 이름은 남기지 않는다) */
  const saveOrder = async (type: "product_type" | "season", names: string[]) => {
    const column = type === "product_type" ? "product_type_order" : "season_order";
    if (type === "product_type") setProductTypeOrder(names);
    else setSeasonOrder(names);
    const { error } = await supabase.from("company_settings").update({ [column]: names }).eq("company_id", companyId);
    if (!error) {
      notifyMenuChanged();
      window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
    }
  };

  /**
   * 상품 유형 삭제 — 이 유형으로 등록된 상품이 있으면 막고 안내한다.
   * 지우면 그 유형의 유형별 설정(당일 준비 시간·볼륨감 참고 이미지과 참고 사진)도 함께 정리한다. 상품은 건드리지 않는다.
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
      // 지울 사진 — 이 유형의 볼륨감 참고 사진 + 이제 쓰지 않는 예전 '기본' 사진
      const removedImages = sizeConfigImages({ default: size.default, byType: size.byType[name] ? { [name]: size.byType[name] } : {} });
      if (name in lead || size.byType[name]) {
        delete lead[name];
        delete size.byType[name];
        // 볼륨감 참고 이미지는 유형별만 저장한다 ('기본'은 쓰지 않아 비운다)
        const patch = { min_lead_times: lead, size_tiers: { default: [], byType: size.byType } };
        const { error } = await supabase.from("company_settings").update(patch).eq("company_id", companyId);
        if (!error) {
          onSettingsSaved?.(patch);
          removeStorageFiles(supabase, STORAGE_BUCKET, removedImages);
          // 손님 화면 캐시도 정리된 설정으로 (유형 삭제 직후 한 번 갱신했지만 설정은 그 뒤에 바뀌었다)
          notifyMenuChanged();
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

  /** 이름 확인 — 화면에 있는 목록만 보고 바로 판단 (서버 호출 없음). 같은 이름은 띄어쓰기만 달라도 중복 (예: '꽃 다발' = '꽃다발') */
  const checkName = (type: "product_type" | "season", name: string) => {
    const key = name.replace(/\s+/g, "");
    const same = (a: string) => a.replace(/\s+/g, "") === key;
    const builtins = type === "product_type" ? (PRODUCT_TYPES as readonly string[]) : (SEASONS as readonly string[]);
    const hiddenBuiltins = type === "product_type" ? hiddenProductTypes : hiddenSeasons;
    const builtinMatch = key ? builtins.find(same) : undefined;
    const isDuplicate =
      !!key &&
      ((!!builtinMatch && !hiddenBuiltins.includes(builtinMatch)) ||
        customCategories.some((c) => c.category_type === type && same(c.name)));
    return { builtinMatch, isDuplicate };
  };

  const addCategory = async (type: "product_type" | "season", name: string, resetFn: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { builtinMatch, isDuplicate } = checkName(type, trimmed);
    if (isDuplicate) return; // 입력하는 동안 이미 '중복된 이름'을 보여 주고 있다
    // 지웠던 기본 항목과 같은 이름이면 — 새로 만들지 않고 기본 항목을 다시 보이게 (같은 이름이 둘로 갈라지면 숨김 목록과 겹쳐 손님 메뉴에서 상품이 빠진다)
    if (builtinMatch) {
      const order = type === "product_type" ? productTypeOrder : seasonOrder;
      if (order.includes(builtinMatch)) await saveOrder(type, order.filter((n) => n !== builtinMatch));
      if (type === "product_type") {
        await toggleProductType(builtinMatch);
        window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
      } else {
        await toggleSeason(builtinMatch);
      }
      resetFn();
      return;
    }
    const { data, error } = await supabase
      .from("company_categories")
      .insert({ company_id: companyId, category_type: type, name: trimmed, hidden: false })
      .select()
      .single();
    if (!error && data) {
      // 예전에 지운 같은 이름이 순서에 남아 있으면 빼서, 새로 추가한 항목은 맨 뒤에 오게 한다
      const order = type === "product_type" ? productTypeOrder : seasonOrder;
      if (order.includes(trimmed)) await saveOrder(type, order.filter((n) => n !== trimmed));
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
    // 다른 설정 탭(볼륨감 참고 이미지 등)의 '숨김' 표시도 바로 맞춘다
    window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
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

  const customChip = (cat: CustomCategory, onDelete: () => void): ChipItem => ({
    name: cat.name,
    label: (
      <button
        onClick={() => toggleCustomHidden(cat.id)}
        className={`w-full py-2 pl-7 pr-7 rounded-lg border text-sm text-center truncate transition-colors ${
          cat.hidden ? "border-red-300 bg-red-50 text-red-500 font-medium" : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        {cat.hidden ? `${cat.name} (숨김)` : cat.name}
      </button>
    ),
    onDelete,
    deleting: deleting === cat.name,
  });
  const builtinChip = (name: string, onDelete: () => void): ChipItem => ({
    name,
    label: (
      <div className="w-full py-2 pl-7 pr-7 rounded-lg border border-gray-200 text-sm text-gray-700 text-center truncate">{name}</div>
    ),
    onDelete,
    deleting: deleting === name,
  });

  /** 사장님이 정한 순서대로 칩 정렬 (순서에 없는 새 항목은 뒤에) */
  const sortChips = (items: ChipItem[], order: string[]) => {
    const names = sortByOrder(items.map((i) => i.name), order);
    return names.map((n) => items.find((i) => i.name === n)!);
  };
  const productTypeItems = sortChips(
    [
      ...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)).map((t) => builtinChip(t, () => deleteProductType(t, () => toggleProductType(t)))),
      ...customCategories
        .filter((c) => c.category_type === "product_type")
        .map((c) => customChip(c, () => deleteProductType(c.name, () => deleteCategory(c.id)))),
    ],
    productTypeOrder,
  );
  const seasonItems = sortChips(
    [
      ...SEASONS.filter((x) => !hiddenSeasons.includes(x)).map((x) => builtinChip(x, () => toggleSeason(x))),
      ...customCategories.filter((c) => c.category_type === "season").map((c) => customChip(c, () => deleteCategory(c.id))),
    ],
    seasonOrder,
  );

  // 입력하는 동안 바로 확인
  const productTypeDup = checkName("product_type", newProductTypeName).isDuplicate;
  const seasonDup = checkName("season", newSeasonName).isDuplicate;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-medium text-gray-900 mb-1">메뉴 설정</h2>
        <p className="text-xs text-gray-400">직접 추가, 삭제가 가능합니다. 기본 제공 항목도 삭제할 수 있습니다.</p>
        <p className="text-xs text-gray-400">왼쪽 ⠿ 를 끌어 순서를 바꾸면 손님 메뉴판에도 그 순서로 보여요.</p>
      </div>
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="space-y-8">
          {/* 상품 유형 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              상품 유형 <span className="text-gray-400 font-normal">({activeProductTypeCount}/{MAX_PRODUCT_TYPES})</span>
            </p>
            <SortableChips
              items={productTypeItems}
              onReorder={(names) => saveOrder("product_type", names)}
            >
              {showProductTypeForm ? (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={newProductTypeName}
                      onChange={(e) => { setNewProductTypeName(e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addCategory("product_type", newProductTypeName, () => { setNewProductTypeName(""); setShowProductTypeForm(false); }); }
                        if (e.key === "Escape") { setShowProductTypeForm(false); setNewProductTypeName(""); }
                      }}
                      onBlur={() => { if (!newProductTypeName.trim()) setShowProductTypeForm(false); }}
                      placeholder="이름 입력"
                      className={`flex-1 min-w-0 border rounded-lg px-2.5 py-2 text-sm placeholder-gray-300 focus:outline-none ${productTypeDup ? "border-red-400 text-red-500" : "border-gold-400 text-gray-700 focus:border-gold-500"}`}
                    />
                    <button
                      type="button"
                      // 입력칸 포커스를 잃지 않게 (비어 있으면 입력칸이 닫힌다)
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={productTypeDup}
                      onClick={() => addCategory("product_type", newProductTypeName, () => { setNewProductTypeName(""); setShowProductTypeForm(false); })}
                      className="shrink-0 px-2.5 rounded-lg bg-gold-500 text-white text-xs font-medium whitespace-nowrap hover:bg-gold-600 disabled:opacity-40 disabled:hover:bg-gold-500 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {productTypeDup && <p className="text-xs text-red-500 leading-tight">중복된 이름</p>}
                </div>
              ) : activeProductTypeCount < MAX_PRODUCT_TYPES ? (
                <button
                  onClick={() => setShowProductTypeForm(true)}
                  className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
                >
                  +
                </button>
              ) : null}
            </SortableChips>
          </div>

          {/* 시즌 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              시즌 <span className="text-gray-400 font-normal">({activeSeasonCount}/{MAX_SEASONS})</span>
            </p>
            <SortableChips
              items={seasonItems}
              onReorder={(names) => saveOrder("season", names)}
            >
              {showSeasonForm ? (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={newSeasonName}
                      onChange={(e) => { setNewSeasonName(e.target.value); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addCategory("season", newSeasonName, () => { setNewSeasonName(""); setShowSeasonForm(false); }); }
                        if (e.key === "Escape") { setShowSeasonForm(false); setNewSeasonName(""); }
                      }}
                      onBlur={() => { if (!newSeasonName.trim()) setShowSeasonForm(false); }}
                      placeholder="이름 입력"
                      className={`flex-1 min-w-0 border rounded-lg px-2.5 py-2 text-sm placeholder-gray-300 focus:outline-none ${seasonDup ? "border-red-400 text-red-500" : "border-gold-400 text-gray-700 focus:border-gold-500"}`}
                    />
                    <button
                      type="button"
                      // 입력칸 포커스를 잃지 않게 (비어 있으면 입력칸이 닫힌다)
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={seasonDup}
                      onClick={() => addCategory("season", newSeasonName, () => { setNewSeasonName(""); setShowSeasonForm(false); })}
                      className="shrink-0 px-2.5 rounded-lg bg-gold-500 text-white text-xs font-medium whitespace-nowrap hover:bg-gold-600 disabled:opacity-40 disabled:hover:bg-gold-500 transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {seasonDup && <p className="text-xs text-red-500 leading-tight">중복된 이름</p>}
                </div>
              ) : activeSeasonCount < MAX_SEASONS ? (
                <button
                  onClick={() => setShowSeasonForm(true)}
                  className="py-2 px-3 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
                >
                  +
                </button>
              ) : null}
            </SortableChips>
          </div>

          {/* 바로 구매 메뉴 — 이름·보이기만 (무인 픽업 시간은 영업 설정) */}
          <InstantMenuSettings companyId={companyId} onSettingsSaved={onSettingsSaved} />
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
