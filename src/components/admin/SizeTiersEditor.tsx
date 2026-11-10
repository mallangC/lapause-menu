"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { formatMoney, parseMoney } from "@/lib/format";
import { DEFAULT_VOLUME_NAMES, VOLUME_NAME_MAX, emptySizeTiers, sizeTierOrderErrors, type SizeConfig, type SizeTier } from "@/lib/sizeTiers";

// 판매 설정 — 볼륨감 참고 이미지 (4단계 고정, 단계 이름·가격·사진은 사장님이 정한다)
// 손님이 희망 금액을 정하기 전에 '이 가격이면 이 정도 볼륨' 사진으로 보여준다.
// 매장 유형별 탭만 (형태가 다르면 같은 가격이어도 볼륨이 달라 '기본'은 두지 않는다). 유형 탭은 처음엔 '기본과 같게', 필요할 때만 그 유형을 따로 정한다.
// 저장은 판매 설정의 저장 버튼으로 함께 — 고른 사진은 브라우저에만 들고 있다가(blob: 주소) 저장할 때 한 번에 올린다.
// (지운·바꾼 사진은 저장할 때 저장소에서 정리)

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
  /** 아직 올리지 않은 사진 — 미리보기 주소(blob:) → 줄인 사진. 저장할 때 부모가 올린다 */
  pending: Map<string, Blob>;
}

/** 어긋난 순서가 있는 탭 이름들 (저장 막기용) */
export function sizeConfigOrderErrors(config: SizeConfig): string[] {
  return Object.entries(config.byType).filter(([, list]) => sizeTierOrderErrors(list).length > 0).map(([k]) => k);
}

export default function SizeTiersEditor({ value, onChange, types, pending }: Props) {
  const [tab, setTab] = useState<string>(types[0] ?? "");
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<number | null>(null);

  // 지금 탭이 목록에서 사라졌으면(유형 삭제) 첫 유형으로
  const activeTab = types.includes(tab) ? tab : types[0] ?? "";
  // 아직 넣지 않은 유형은 빈 4단계로 보여준다 (입력하면 그 유형 값이 생긴다)
  const list = value.byType[activeTab] ?? emptySizeTiers();

  const setList = (next: SizeTier[]) => onChange({ ...value, byType: { ...value.byType, [activeTab]: next } });
  const update = (idx: number, patch: Partial<SizeTier>) => setList(list.map((t, i) => (i === idx ? { ...t, ...patch } : t)));


  const pickImage = (idx: number) => {
    target.current = idx;
    fileRef.current?.click();
  };

  const upload = async (file: File) => {
    const idx = target.current;
    if (idx == null) return;
    setError(null);
    setUploading(idx);
    try {
      // 줄인 사진을 브라우저에만 들고 있는다 (저장할 때 올린다)
      const blob = await compress(file);
      const url = URL.createObjectURL(blob);
      pending.set(url, blob);
      update(idx, { image: url });
    } catch {
      setError("사진을 불러오지 못했어요. 다른 사진으로 다시 시도해주세요.");
    } finally {
      setUploading(null);
    }
  };

  const orderErrors = sizeTierOrderErrors(list);
  const tabErrors = sizeConfigOrderErrors(value);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-700">볼륨감 참고 이미지</h3>
        <p className="text-xs text-gray-400 mt-0.5 break-keep">
          손님이 희망 금액을 정하기 전에 볼륨감을 참고할 수 있는 사진을 보여줘요.
        </p>
        {/* 참고 사진 찍는 요령 — 사람과 함께 찍어야 손님이 크기를 가늠할 수 있다 */}
        <p className="flex items-start gap-2 text-xs text-gold-600 bg-gold-500/10 rounded-lg px-3 py-2 mt-2 break-keep">
          {/* 앞에 'TIP' 표시 */}
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-gold-500 text-white text-[11px] font-semibold leading-none">
            TIP
          </span>
          <span className="pt-px">참고 사진은 사람이 꽃을 들고 있는 모습을 찍어 주세요. 사람이 함께 보여야 손님이 크기를 가늠할 수 있어요.</span>
        </p>
      </div>

      {/* 유형 탭 — 매장 유형 */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {types.map((t) => {
          const on = t === activeTab;
          // 가격·사진을 넣어 손님에게 보이는 유형 표시
          const custom = (value.byType[t] ?? []).some((x) => x.price != null && x.image);
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
              {/* 손님에게 보이는 유형 표시 */}
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

      {types.length === 0 ? (
        <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center">메뉴 설정에서 상품 유형을 먼저 추가해 주세요.</p>
      ) : (
        <>
          <div className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
            {list.map((t, i) => {
              const bad = orderErrors.includes(i);
              return (
                <div key={i} className="flex items-center gap-2.5 px-0 md:px-4 py-3 bg-white">
                  {/* 단계 이름 — 사장님이 정한다 (비우면 기본 이름) */}
                  <input
                    type="text"
                    value={t.name}
                    maxLength={VOLUME_NAME_MAX}
                    placeholder={DEFAULT_VOLUME_NAMES[i]}
                    onChange={(e) => update(i, { name: e.target.value })}
                    onBlur={(e) => update(i, { name: e.target.value.trim() })}
                    aria-label={`${i + 1}단계 이름`}
                    className={`w-20 shrink-0 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none bg-white placeholder:text-gray-300 ${bad ? "border-red-300 text-red-500" : "border-gray-200 focus:border-gray-400 text-gray-700"}`}
                  />
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="사용 안 함"
                      value={t.price != null ? formatMoney(String(t.price)) : ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        update(i, { price: v === "" ? null : parseMoney(v) });
                      }}
                      aria-label={`${t.name || DEFAULT_VOLUME_NAMES[i]} 가격`}
                      className={`w-24 md:w-28 border rounded-lg px-2.5 py-1.5 text-sm text-right focus:outline-none bg-white ${bad ? "border-red-300" : "border-gray-200 focus:border-gray-400"}`}
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">원</span>
                  </div>
                  {t.image ? (
                    <div className="relative shrink-0">
                      <button type="button" onClick={() => pickImage(i)} className="block w-11 h-11 rounded-lg overflow-hidden border border-gray-200" aria-label={`${t.name || DEFAULT_VOLUME_NAMES[i]} 참고 사진 바꾸기`}>
                        {t.image.startsWith("blob:") ? (
                          // 아직 올리지 않은 사진 (브라우저 미리보기)
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image src={t.image} alt="" width={44} height={44} className="w-full h-full object-cover" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => update(i, { image: null })}
                        aria-label={`${t.name || DEFAULT_VOLUME_NAMES[i]} 참고 사진 지우기`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white text-xs leading-none flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => pickImage(i)}
                      disabled={uploading !== null}
                      className="shrink-0 h-11 px-3 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 disabled:opacity-50 whitespace-nowrap"
                    >
                      {uploading === i ? "불러오는 중..." : "+ 사진"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {orderErrors.length > 0 && (
        <p className="text-xs text-red-500">아래 단계일수록 가격이 더 높아야 해요. ({orderErrors.map((i) => list[i].name || DEFAULT_VOLUME_NAMES[i]).join(", ")} 확인)</p>
      )}
      {tabErrors.length > 0 && orderErrors.length === 0 && <p className="text-xs text-red-500">{tabErrors.join(", ")} 탭의 가격 순서를 확인해 주세요.</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
