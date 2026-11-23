"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// 상품 사진 여러 장 (최대 MAX) — 고르기·지우기·끌어서 순서 바꾸기. 첫 번째 사진이 대표 사진(목록·카드에 보이는 사진)
// 고른 사진은 저장을 누를 때까지 브라우저에만 둔다 (blob). 이미 올린 사진은 url 만 있다.

export const MAX_PRODUCT_IMAGES = 5;

export type ProductImageItem = {
  key: string;
  /** 이미 저장소에 있는 사진 주소 (새로 고른 사진은 null) */
  url: string | null;
  /** 새로 고른 사진 (저장할 때 올린다) */
  blob: Blob | null;
  /** 화면에 보여 줄 주소 */
  preview: string;
};

let seq = 0;
export const imageItemFromUrl = (url: string): ProductImageItem => ({ key: `u${seq++}`, url, blob: null, preview: url });

export default function ProductImagesEditor({
  items,
  onChange,
  compress,
  disabled = false,
}: {
  items: ProductImageItem[];
  onChange: (next: ProductImageItem[]) => void;
  /** 고른 파일을 줄여 webp 로 */
  compress: (file: File) => Promise<Blob>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProductImageItem[] | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const shown = draft ?? items;

  const addFiles = async (files: File[]) => {
    setError(null);
    const room = MAX_PRODUCT_IMAGES - items.length;
    if (files.length > room) setError(`사진은 ${MAX_PRODUCT_IMAGES}장까지 넣을 수 있어요.`);
    const picked = files.slice(0, Math.max(0, room));
    if (picked.length === 0) return;
    setAdding(true);
    const added: ProductImageItem[] = [];
    for (const f of picked) {
      try {
        const blob = await compress(f);
        added.push({ key: `b${seq++}`, url: null, blob, preview: URL.createObjectURL(blob) });
      } catch {
        setError("사진을 줄이지 못했어요. 다른 파일을 골라 주세요.");
      }
    }
    setAdding(false);
    if (added.length) onChange([...items, ...added]);
  };

  const remove = (key: string) => {
    const it = items.find((i) => i.key === key);
    if (it?.blob) URL.revokeObjectURL(it.preview);
    setError(null);
    onChange(items.filter((i) => i.key !== key));
  };

  // 끌어서 순서 바꾸기 — 손가락·마우스 아래의 사진 자리로 옮긴다 (메뉴 설정 칩과 같은 방식)
  const onDown = (e: React.PointerEvent<HTMLDivElement>, key: string) => {
    if (disabled || e.button !== 0 || items.length < 2) return;
    e.preventDefault();
    let current = items;
    setDraft(items);
    setDragKey(key);
    const move = (ev: PointerEvent) => {
      const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-img]")?.dataset.img;
      if (!over || over === key) return;
      const from = current.findIndex((i) => i.key === key);
      const to = current.findIndex((i) => i.key === over);
      if (from < 0 || to < 0) return;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      current = next;
      setDraft(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (current !== items) onChange(current);
      setDraft(null);
      setDragKey(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {shown.map((it, i) => (
          <div
            key={it.key}
            data-img={it.key}
            onPointerDown={(e) => onDown(e, it.key)}
            className={`relative w-20 h-20 select-none ${items.length > 1 ? "cursor-grab active:cursor-grabbing touch-none" : ""} ${dragKey === it.key ? "z-10 scale-105" : ""} transition-transform`}
          >
            <div className={`w-20 h-20 rounded-xl overflow-hidden border ${dragKey === it.key ? "border-gold-400 ring-2 ring-gold-400 shadow-lg" : "border-gray-200"}`}>
              {/* 방금 고른 사진(아직 저장 전)은 브라우저 주소라 최적화 없이 */}
              <Image src={it.preview} alt={`상품 사진 ${i + 1}`} fill unoptimized={!!it.blob} draggable={false} className="object-cover rounded-xl pointer-events-none" />
            </div>
            {i === 0 && (
              <span className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium pointer-events-none">대표</span>
            )}
            <button
              type="button"
              aria-label={`사진 ${i + 1} 지우기`}
              disabled={disabled}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => remove(it.key)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-gray-900 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}

        {items.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            disabled={disabled || adding}
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-60"
          >
            {adding ? (
              <span className="text-xs">불러오는 중...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-xs">추가 {items.length}/{MAX_PRODUCT_IMAGES}</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="mt-1.5 text-xs text-gray-400 break-keep">
        {items.length > 1 ? "끌어서 순서를 바꿀 수 있어요. 첫 번째 사진이 대표 사진이에요." : `최대 ${MAX_PRODUCT_IMAGES}장까지 넣을 수 있어요.`}
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) addFiles(files);
        }}
        className="hidden"
      />
    </div>
  );
}
