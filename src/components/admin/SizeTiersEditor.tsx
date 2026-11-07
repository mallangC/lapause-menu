"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/constants";
import { formatMoney, parseMoney } from "@/lib/format";
import { DEFAULT_TYPE_KEY, normalizeSizeTiers, sizeTierOrderErrors, type SizeConfig, type SizeTier } from "@/lib/sizeTiers";

// 판매 설정 — 크기 기준 (미니 ~ 프리미엄)
// [기본] 탭 + 매장 유형별 탭. 유형 탭은 처음엔 '기본과 같게', 필요할 때만 그 유형을 따로 정한다.
// 저장은 판매 설정의 저장 버튼으로 함께. (지운·바꾼 사진은 저장할 때 저장소에서 정리)

/** 참고 사진을 긴 변 1200px WebP로 줄인다 */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("압축 실패");
  return blob;
}

interface Props {
  value: SizeConfig;
  onChange: (v: SizeConfig) => void;
  /** 매장 유형 목록 (탭) */
  types: string[];
}

/** 어긋난 순서가 있는 탭 이름들 (저장 막기용) */
export function sizeConfigOrderErrors(config: SizeConfig): string[] {
  const tabs = [[DEFAULT_TYPE_KEY, config.default] as const, ...Object.entries(config.byType)];
  return tabs.filter(([, list]) => sizeTierOrderErrors(list).length > 0).map(([k]) => k);
}

export default function SizeTiersEditor({ value, onChange, types }: Props) {
  const [tab, setTab] = useState<string>(DEFAULT_TYPE_KEY);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);

  // 지금 탭이 목록에서 사라졌으면(유형 삭제) 기본으로
  const activeTab = tab === DEFAULT_TYPE_KEY || types.includes(tab) ? tab : DEFAULT_TYPE_KEY;
  const isDefault = activeTab === DEFAULT_TYPE_KEY;
  const own = isDefault ? value.default : value.byType[activeTab];
  const followsDefault = !isDefault && !own;
  const list = own ?? value.default;

  const setList = (next: SizeTier[]) =>
    onChange(isDefault ? { ...value, default: next } : { ...value, byType: { ...value.byType, [activeTab]: next } });
  const update = (name: string, patch: Partial<SizeTier>) => setList(list.map((t) => (t.name === name ? { ...t, ...patch } : t)));

  // 이 유형만 따로 — 기본 값을 복사해서 시작 (사진은 유형마다 달라 비운다)
  const startOwn = () =>
    onChange({ ...value, byType: { ...value.byType, [activeTab]: normalizeSizeTiers(value.default.map((t) => ({ ...t, image: null }))) } });
  // 기본과 같게 되돌리기 — 이 유형 설정을 지운다
  const backToDefault = () => {
    const byType = { ...value.byType };
    delete byType[activeTab];
    onChange({ ...value, byType });
  };

  const pickImage = (name: string) => {
    target.current = name;
    fileRef.current?.click();
  };

  const upload = async (file: File) => {
    const name = target.current;
    if (!name) return;
    setError(null);
    setUploading(name);
    try {
      const blob = await compress(file);
      const supabase = createClient();
      const path = `size_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: false, contentType: "image/webp" });
      if (upErr) throw upErr;
      update(name, { image: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl });
    } catch {
      setError("사진을 올리지 못했어요. 다른 사진으로 다시 시도해주세요.");
    } finally {
      setUploading(null);
    }
  };

  const orderErrors = sizeTierOrderErrors(list);
  const tabErrors = sizeConfigOrderErrors(value);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-700">크기 기준</h3>
        <p className="text-xs text-gray-400 mt-0.5 break-keep">
          가격에 따라 크기가 자동으로 정해져요. 기본만 채우면 모든 유형에 쓰이고, 유형마다 크기가 다르면 그 유형만 따로 정할 수 있어요. 쓰지 않는 크기는 가격을 비워 두세요.
        </p>
        {/* 참고 사진 찍는 요령 — 사람과 함께 찍어야 손님이 크기를 가늠할 수 있다 */}
        <p className="flex items-start gap-2 text-xs text-gold-600 bg-gold-500/10 rounded-lg px-3 py-2 mt-2 break-keep">
          {/* 앞에 'TIP' 표시 */}
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-gold-500 text-white text-[11px] font-semibold leading-none">
            TIP
          </span>
          <span className="pt-px">참고 사진은 사람이 꽃을 들고 찍어 주세요. 상체가 함께 보여야 손님이 크기를 가늠할 수 있어요.</span>
        </p>
      </div>

      {/* 유형 탭 — 기본 + 매장 유형 */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {[DEFAULT_TYPE_KEY, ...types].map((t) => {
          const on = t === activeTab;
          const custom = t !== DEFAULT_TYPE_KEY && !!value.byType[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                on ? "bg-gold-500 border-gold-500 text-white font-medium" : tabErrors.includes(t) ? "border-red-300 text-red-500" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {t}
              {/* 따로 정한 유형 표시 */}
              {custom && <span className={`ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle ${on ? "bg-white" : "bg-gold-500"}`} />}
            </button>
          );
        })}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />

      {followsDefault ? (
        // 유형 탭 — 아직 기본을 따르는 중
        <div className="border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center space-y-3">
          <p className="text-sm text-gray-500">{activeTab}는 지금 기본 크기 기준을 따라요.</p>
          <button type="button" onClick={startOwn} className="px-4 py-2 rounded-lg border border-gold-400 text-gold-600 text-sm font-medium hover:bg-gold-500/10">
            {activeTab}만 따로 정하기
          </button>
        </div>
      ) : (
        <>
          <div className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
            {list.map((t) => (
              <div key={t.name} className="flex items-center gap-3 px-0 md:px-4 py-3 bg-white">
                <span className={`w-16 shrink-0 text-sm ${orderErrors.includes(t.name) ? "text-red-500 font-medium" : "text-gray-700"}`}>{t.name}</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="사용 안 함"
                    value={t.minPrice != null ? formatMoney(String(t.minPrice)) : ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "");
                      update(t.name, { minPrice: v === "" ? null : parseMoney(v) });
                    }}
                    className={`w-28 border rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none bg-white ${orderErrors.includes(t.name) ? "border-red-300" : "border-gray-200 focus:border-gray-400"}`}
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">원부터</span>
                </div>
                {t.image ? (
                  <div className="relative shrink-0">
                    <button type="button" onClick={() => pickImage(t.name)} className="block w-11 h-11 rounded-lg overflow-hidden border border-gray-200" aria-label={`${t.name} 참고 사진 바꾸기`}>
                      <Image src={t.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => update(t.name, { image: null })}
                      aria-label={`${t.name} 참고 사진 지우기`}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs leading-none flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pickImage(t.name)}
                    disabled={uploading !== null}
                    className="shrink-0 h-11 px-3 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 disabled:opacity-50 whitespace-nowrap"
                  >
                    {uploading === t.name ? "올리는 중..." : "+ 참고 사진"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isDefault && (
            <button type="button" onClick={backToDefault} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
              {activeTab}도 기본과 같게 쓰기 (이 유형 설정 지우기)
            </button>
          )}
        </>
      )}

      {orderErrors.length > 0 && <p className="text-xs text-red-500">큰 크기일수록 가격이 더 높아야 해요. ({orderErrors.join(", ")} 확인)</p>}
      {tabErrors.length > 0 && orderErrors.length === 0 && <p className="text-xs text-red-500">{tabErrors.join(", ")} 탭의 가격 순서를 확인해 주세요.</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
