"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { PRODUCT_TYPES_CHANGED } from "@/lib/productTypes";
import { DEFAULT_INSTANT_MENU_NAME, INSTANT_MENU_NAME_MAX } from "@/lib/afterHours";

// 메뉴 설정 — 바로 구매 메뉴 (상품 유형·시즌 아래, 같은 모양의 칩 하나)
// · 칩을 누르면 손님 메뉴판에서 숨김/보이기 (추가한 유형·시즌 칩과 같다)
// · ✎ 로 이름 바꾸기 (이름 입력 후 엔터)
// 영업시간 밖 판매(무인 픽업)는 영업 설정의 '영업시간 외 수령 및 판매'를 따른다

export default function InstantMenuSettings({
  companyId,
  onSettingsSaved,
}: {
  companyId: string;
  onSettingsSaved?: (patch: Record<string, unknown>) => void;
}) {
  const supabase = createClient();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("instant_menu_name, instant_menu_hidden")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        setName(((data?.instant_menu_name as string | null) ?? "").trim());
        setHidden(data?.instant_menu_hidden === true);
        setLoaded(true);
      });
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("instant", true)
      .then(({ count: n }) => setCount(n ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await supabase.from("company_settings").update(patch).eq("company_id", companyId);
    setBusy(false);
    if (error) {
      alert("저장하지 못했어요. 다시 시도해 주세요.");
      return false;
    }
    onSettingsSaved?.(patch);
    notifyMenuChanged();
    window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
    return true;
  };

  const toggleHidden = async () => {
    if (busy) return;
    const next = !hidden;
    setHidden(next);
    if (!(await save({ instant_menu_hidden: next }))) setHidden(!next);
  };

  const finishRename = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === name) return;
    const prev = name;
    setName(next);
    if (!(await save({ instant_menu_name: next || null }))) setName(prev);
  };

  if (!loaded) return null;
  const shownName = name || DEFAULT_INSTANT_MENU_NAME;

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        바로 구매 메뉴 {count !== null && <span className="text-gray-400 font-normal">(상품 {count}개)</span>}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, INSTANT_MENU_NAME_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); finishRename(); }
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={finishRename}
            placeholder={`${DEFAULT_INSTANT_MENU_NAME} (이름 입력 후 엔터)`}
            className="w-full border border-gold-400 rounded-lg px-2.5 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gold-500"
          />
        ) : (
          <div className="relative">
            {/* 누르면 숨김/보이기 — 추가한 유형·시즌 칩과 같은 모양 */}
            <button
              type="button"
              onClick={toggleHidden}
              disabled={busy}
              className={`w-full py-2 pl-7 pr-7 rounded-lg border text-sm text-center truncate transition-colors ${
                hidden ? "border-red-300 bg-red-50 text-red-500 font-medium" : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {hidden ? `${shownName} (숨김)` : shownName}
            </button>
            <button
              type="button"
              onClick={() => { setDraft(name); setEditing(true); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-gold-500 hover:bg-gold-50 transition-colors text-xs leading-none"
              title="이름 바꾸기"
              aria-label="이름 바꾸기"
            >
              ✎
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2 break-keep">
        이미 만들어 둔 상품을 모아 두는 메뉴예요. 누르면 손님 메뉴판에서 숨기거나 보이고, ✎로 이름을 바꿔요. 상품은 상품 등록에서 &lsquo;{shownName} 메뉴에 넣기&rsquo;를 켜면 들어가고, 영업시간 밖에도 팔려면 영업 설정에서 &lsquo;영업시간 외 수령 및 판매&rsquo;를 켜 주세요.
      </p>
    </div>
  );
}
