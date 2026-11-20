"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { PRODUCT_TYPES_CHANGED } from "@/lib/productTypes";
import {
  AFTER_HOURS_NOTE_MAX,
  DEFAULT_INSTANT_MENU_NAME,
  DEFAULT_UNATTENDED_END,
  DEFAULT_UNATTENDED_START,
  INSTANT_MENU_NAME_MAX,
  UNATTENDED_END_OPTIONS,
  UNATTENDED_START_OPTIONS,
} from "@/lib/afterHours";

// 메뉴 설정 — 바로 구매 메뉴 (이미 만들어 둔 상품을 모아 두는 메뉴)
// 한 번 정해 두면 상품은 상품 등록에서 이 메뉴에 넣기만 하면 된다
// · 이름·손님에게 숨기기
// · 무인 픽업 — 켜면 영업시간 밖이라도 정한 시간 안이면 사람 없이 가져갈 수 있다 (바로 구매 상품만 담긴 주문)

interface Form {
  name: string;
  hidden: boolean;
  unattended: boolean;
  start: string;
  end: string;
  note: string;
}

export default function InstantMenuSettings({
  companyId,
  onSettingsSaved,
}: {
  companyId: string;
  onSettingsSaved?: (patch: Record<string, unknown>) => void;
}) {
  const supabase = createClient();
  const [saved, setSaved] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("instant_menu_name, instant_menu_hidden, unattended_enabled, unattended_start, unattended_end, unattended_note")
      .eq("company_id", companyId)
      .maybeSingle()
      .then(({ data }) => {
        const f: Form = {
          name: (data?.instant_menu_name as string | null) ?? "",
          hidden: data?.instant_menu_hidden === true,
          unattended: data?.unattended_enabled === true,
          start: (data?.unattended_start as string | null) ?? DEFAULT_UNATTENDED_START,
          end: (data?.unattended_end as string | null) ?? DEFAULT_UNATTENDED_END,
          note: (data?.unattended_note as string | null) ?? "",
        };
        setSaved(f);
        setForm(f);
      });
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("instant", true)
      .then(({ count: n }) => setCount(n ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (!form || !saved) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm({ ...form, [k]: v });
    setDone(false);
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const badRange = form.unattended && form.start >= form.end;
  const shownName = form.name.trim() || DEFAULT_INSTANT_MENU_NAME;

  const save = async () => {
    if (badRange) return;
    setSaving(true);
    setError(null);
    const patch = {
      instant_menu_name: form.name.trim() || null,
      instant_menu_hidden: form.hidden,
      unattended_enabled: form.unattended,
      unattended_start: form.start,
      unattended_end: form.end,
      unattended_note: form.note.trim() || null,
    };
    const { error: err } = await supabase.from("company_settings").update(patch).eq("company_id", companyId);
    setSaving(false);
    if (err) {
      setError("저장하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    setSaved(form);
    setDone(true);
    onSettingsSaved?.(patch);
    notifyMenuChanged();
    window.dispatchEvent(new Event(PRODUCT_TYPES_CHANGED));
  };

  const Switch = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${on ? "bg-gold-500" : "bg-gray-200"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "left-6" : "left-0.5"}`} />
    </button>
  );

  return (
    <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
      <div className="max-w-lg space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {shownName} 메뉴 {count !== null && <span className="text-gray-400 font-normal">(상품 {count}개)</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 break-keep">
            이미 만들어 둔 상품을 모아 두는 메뉴예요. 제작시간 없이 바로 받을 수 있고, 꽃 색은 고르지 않아요. 상품은 상품 등록에서 &lsquo;{shownName} 메뉴에 넣기&rsquo;를 켜면 들어가요.
          </p>
        </div>

        {/* 이름 */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-700 shrink-0">메뉴 이름</span>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value.slice(0, INSTANT_MENU_NAME_MAX))}
            placeholder={DEFAULT_INSTANT_MENU_NAME}
            className="w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-gray-400 placeholder:text-gray-300"
          />
        </div>

        {/* 손님에게 보이기 */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-700">손님 메뉴판에 보이기</p>
            <p className="text-xs text-gray-400 mt-0.5">끄면 메뉴가 통째로 숨겨져요. 만들어 둔 상품이 없는 날 꺼 두세요.</p>
          </div>
          <Switch on={!form.hidden} onClick={() => set("hidden", !form.hidden)} />
        </div>

        {/* 무인 픽업 */}
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-700">무인 픽업</p>
              <p className="text-xs text-gray-400 mt-0.5 break-keep">
                {form.unattended
                  ? "영업시간이 아니어도 아래 시간 안이면 손님이 결제하고 바로 가져갈 수 있어요."
                  : "끄면 영업시간 안에서만 바로 받을 수 있어요."}
              </p>
            </div>
            <Switch on={form.unattended} onClick={() => set("unattended", !form.unattended)} />
          </div>
          {form.unattended && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">무인 픽업 시간</span>
                <div className="flex items-center gap-2">
                  <select
                    value={form.start}
                    onChange={(e) => set("start", e.target.value)}
                    className="min-w-[92px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
                  >
                    {UNATTENDED_START_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-300 text-sm">~</span>
                  <select
                    value={form.end}
                    onChange={(e) => set("end", e.target.value)}
                    className="min-w-[92px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 cursor-pointer"
                  >
                    {UNATTENDED_END_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {badRange && <p className="text-xs text-red-500">끝나는 시간이 시작 시간보다 늦어야 해요.</p>}
              <div>
                <p className="text-sm text-gray-700">무인 픽업 안내</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-2 break-keep">무인 픽업 손님에게 가져가는 방법을 알림톡으로 전달해요.</p>
                <textarea
                  value={form.note}
                  onChange={(e) => set("note", e.target.value.slice(0, AFTER_HOURS_NOTE_MAX))}
                  rows={3}
                  placeholder="예) 매장 앞 냉장고 2번 칸에 이름표 붙여 둔 꽃다발을 가져가 주세요."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-400 bg-white placeholder:text-gray-300"
                />
                <p className="text-right text-[11px] text-gray-300">{form.note.length}/{AFTER_HOURS_NOTE_MAX}</p>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          {done && !dirty && <span className="text-xs text-gold-600">저장했어요</span>}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || badRange}
            className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-40"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
