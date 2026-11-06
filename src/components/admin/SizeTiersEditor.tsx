"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/constants";
import { formatMoney, parseMoney } from "@/lib/format";
import { sizeTierOrderErrors, type SizeTier } from "@/lib/sizeTiers";

// 판매 설정 — 크기 기준 (한송이 ~ 프리미엄)
// 단계마다 '이 가격부터'와 크기 참고 사진을 넣는다. 저장은 판매 설정의 저장 버튼으로 함께.

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

export default function SizeTiersEditor({ value, onChange }: { value: SizeTier[]; onChange: (v: SizeTier[]) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);

  const update = (name: string, patch: Partial<SizeTier>) => onChange(value.map((t) => (t.name === name ? { ...t, ...patch } : t)));

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

  const orderErrors = sizeTierOrderErrors(value);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-gray-700">크기 기준</h3>
        <p className="text-xs text-gray-400 mt-0.5 break-keep">
          가격에 따라 크기가 자동으로 정해져요. 손님은 예산이나 상품 가격을 보면 크기를 알 수 있고, 참고 사진을 넣으면 물음표(?)를 눌러 볼 수 있어요. 쓰지 않는 크기는 가격을 비워 두세요.
        </p>
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
      <div className="border-t border-gray-100 md:border md:border-gray-200 md:rounded-xl overflow-hidden divide-y divide-gray-100">
        {value.map((t) => (
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
            {/* 크기 참고 사진 */}
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
      {orderErrors.length > 0 && (
        <p className="text-xs text-red-500">큰 크기일수록 가격이 더 높아야 해요. ({orderErrors.join(", ")} 확인)</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
