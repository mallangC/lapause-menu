"use client";

import { useState } from "react";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import { sortByOrder } from "@/lib/productTypes";
import SortableChips, { type ChipItem } from "@/components/admin/SortableChips";

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
  // 기본 항목 중 '삭제'한 것 (숨김 목록에도 들어 있다) — 실제와 같게
  const [removedProductTypes, setRemovedProductTypes] = useState<string[]>(["조화"]);
  const [removedSeasons, setRemovedSeasons] = useState<string[]>(["어버이날", "현장 판매"]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(MOCK_CUSTOM);
  const [newProductTypeName, setNewProductTypeName] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [showProductTypeForm, setShowProductTypeForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  // 끌어서 바꾼 순서 (화면 안에서만)
  const [productTypeOrder, setProductTypeOrder] = useState<string[]>([]);
  const [seasonOrder, setSeasonOrder] = useState<string[]>([]);

  /** 기본 항목 상태 — hidden: 메뉴판에서 숨김 / removed: 목록에서도 빠짐(삭제) */
  const setBuiltin = async (type: "product_type" | "season", name: string, next: { hidden: boolean; removed: boolean }) => {
    const isType = type === "product_type";
    const hiddenList = isType ? hiddenProductTypes : hiddenSeasons;
    const removedList = isType ? removedProductTypes : removedSeasons;
    const hidden = next.hidden || next.removed ? [...new Set([...hiddenList, name])] : hiddenList.filter((n) => n !== name);
    const removed = next.removed ? [...new Set([...removedList, name])] : removedList.filter((n) => n !== name);
    if (isType) { setHiddenProductTypes(hidden); setRemovedProductTypes(removed); }
    else { setHiddenSeasons(hidden); setRemovedSeasons(removed); }
  };
  const toggleBuiltinHidden = (type: "product_type" | "season", name: string) =>
    setBuiltin(type, name, { hidden: !(type === "product_type" ? hiddenProductTypes : hiddenSeasons).includes(name), removed: false });

  /** 이름 확인 — 화면에 있는 목록만 보고 바로 판단 (서버 호출 없음). 같은 이름은 띄어쓰기만 달라도 중복 (예: '꽃 다발' = '꽃다발') */
  const checkName = (type: "product_type" | "season", name: string) => {
    const key = name.replace(/\s+/g, "");
    const same = (a: string) => a.replace(/\s+/g, "") === key;
    const builtins = type === "product_type" ? (PRODUCT_TYPES as readonly string[]) : (SEASONS as readonly string[]);
    const removedBuiltins = type === "product_type" ? removedProductTypes : removedSeasons;
    const builtinMatch = key ? builtins.find(same) : undefined;
    const isDuplicate =
      !!key &&
      ((!!builtinMatch && !removedBuiltins.includes(builtinMatch)) ||
        customCategories.some((c) => c.category_type === type && same(c.name)));
    return { builtinMatch, isDuplicate };
  };

  const addCategory = async (type: "product_type" | "season", name: string, resetFn: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { builtinMatch, isDuplicate } = checkName(type, trimmed);
    if (isDuplicate) return; // 입력하는 동안 이미 '중복된 이름'을 보여 주고 있다
    // 지웠던 기본 항목과 같은 이름이면 기본 항목을 다시 보이게 (실제 화면과 같게)
    if (builtinMatch) {
      await setBuiltin(type, builtinMatch, { hidden: false, removed: false });
      resetFn();
      return;
    }
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

  /** 칩 — 누르면 숨김/보이기 (기본 항목·직접 추가한 항목 모두 같게) */
  const chip = (name: string, hidden: boolean, onToggle: () => void, onDelete: () => void): ChipItem => ({
    name,
    label: (
      <button
        type="button"
        onClick={onToggle}
        title={hidden ? "누르면 메뉴판에 다시 보여요" : "누르면 메뉴판에서 숨겨요"}
        className={`w-full py-2 pl-7 pr-7 rounded-lg border text-sm text-center truncate transition-colors ${
          hidden ? "border-red-300 bg-red-50 text-red-500 font-medium" : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        {hidden ? `${name} (숨김)` : name}
      </button>
    ),
    onDelete,
    deleting: false,
  });
  const customChip = (cat: CustomCategory) => chip(cat.name, cat.hidden, () => toggleCustomHidden(cat.id), () => deleteCategory(cat.id));
  const sortChips = (items: ChipItem[], order: string[]) =>
    sortByOrder(items.map((i) => i.name), order).map((n) => items.find((i) => i.name === n)!);
  const productTypeItems = sortChips(
    [
      ...PRODUCT_TYPES.filter((t) => !removedProductTypes.includes(t)).map((t) =>
        chip(t, hiddenProductTypes.includes(t), () => toggleBuiltinHidden("product_type", t), () => setBuiltin("product_type", t, { hidden: true, removed: true })),
      ),
      ...customCategories.filter((c) => c.category_type === "product_type").map(customChip),
    ],
    productTypeOrder,
  );
  const seasonItems = sortChips(
    [
      ...SEASONS.filter((x) => !removedSeasons.includes(x)).map((x) =>
        chip(x, hiddenSeasons.includes(x), () => toggleBuiltinHidden("season", x), () => setBuiltin("season", x, { hidden: true, removed: true })),
      ),
      ...customCategories.filter((c) => c.category_type === "season").map(customChip),
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
        <p className="text-xs text-gray-400 break-keep">누르면 메뉴판에서 숨김 · 왼쪽 ⠿를 끌어서 순서 변경</p>
      </div>
      <div data-coach="mn-all" className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="space-y-8">
          {/* 상품 유형 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              상품 유형 <span className="text-gray-400 font-normal">({activeProductTypeCount}/{MAX_PRODUCT_TYPES})</span>
            </p>
            <SortableChips items={productTypeItems} onReorder={setProductTypeOrder}>
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
            <SortableChips items={seasonItems} onReorder={setSeasonOrder}>
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
        </div>
      </div>
    </div>
  );
}
