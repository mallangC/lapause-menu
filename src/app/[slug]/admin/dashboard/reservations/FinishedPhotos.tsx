"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp, THUMB_MAX_PX, thumbPath } from "@/lib/imageThumb";
import { removeStorageFiles } from "@/lib/storageCleanup";
import StoreImage from "@/components/StoreImage";

// 완성 사진 — 사장님이 제작 완료 때(또는 그 뒤) 올리는 실제 상품 사진
// · 손님은 주문 확인 페이지에서 내려받는다
// · '상품 페이지에 공개'를 켠 사진은 그 상품 상세에 '실제로 받은 상품'으로 (상품을 골라 한 주문만)
// 고르는 즉시 줄여서(webp) 올린다 — 작은 사진(썸네일)도 함께

const BUCKET = "reservation-images";
/** 올릴 때 긴 변 */
const PHOTO_MAX_PX = 1600;

export interface FinishedPhoto {
  id: string;
  image_url: string;
  is_public: boolean;
}

export default function FinishedPhotos({
  reservationId,
  companyId,
  productId,
  onChange,
}: {
  reservationId: string;
  companyId: string;
  /** 상품을 골라 한 주문이면 그 상품 (없으면 상품 페이지에 보이지 않는다) */
  productId: string | null;
  onChange?: (count: number) => void;
}) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<FinishedPhoto[] | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("reservation_photos")
      .select("id, image_url, is_public")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setPhotos((data as FinishedPhoto[] | null) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  const update = (next: FinishedPhoto[]) => {
    setPhotos(next);
    onChange?.(next.length);
  };

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    setUploading(list.length);
    const added: FinishedPhoto[] = [];
    for (const file of list) {
      try {
        const blob = await resizeToWebp(file, PHOTO_MAX_PX);
        const path = `${companyId}/finished/${reservationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp" });
        if (upErr) throw upErr;
        // 목록·상품 페이지용 작은 사진 (실패해도 원본으로 보인다)
        try {
          const thumb = await resizeToWebp(blob, THUMB_MAX_PX);
          await supabase.storage.from(BUCKET).upload(thumbPath(path)!, thumb, { upsert: true, contentType: "image/webp" });
        } catch { /* 무시 */ }
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { data, error: insErr } = await supabase
          .from("reservation_photos")
          .insert({ reservation_id: reservationId, company_id: companyId, product_id: productId, image_url: url, is_public: true })
          .select("id, image_url, is_public")
          .single();
        if (insErr) {
          removeStorageFiles(supabase, BUCKET, [url]);
          throw insErr;
        }
        added.push(data as FinishedPhoto);
      } catch {
        setError("사진을 올리지 못한 것이 있어요. 다시 시도해 주세요.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    update([...(photos ?? []), ...added]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const togglePublic = async (p: FinishedPhoto) => {
    const next = !p.is_public;
    update((photos ?? []).map((x) => (x.id === p.id ? { ...x, is_public: next } : x)));
    const { error: err } = await supabase.from("reservation_photos").update({ is_public: next }).eq("id", p.id);
    if (err) {
      setError("바꾸지 못했어요. 다시 시도해 주세요.");
      update((photos ?? []).map((x) => (x.id === p.id ? { ...x, is_public: !next } : x)));
    }
  };

  const remove = async (p: FinishedPhoto) => {
    if (!window.confirm("이 사진을 지울까요? 손님 화면과 상품 페이지에서도 사라져요.")) return;
    const { error: err } = await supabase.from("reservation_photos").delete().eq("id", p.id);
    if (err) {
      setError("지우지 못했어요. 다시 시도해 주세요.");
      return;
    }
    removeStorageFiles(supabase, BUCKET, [p.image_url]);
    update((photos ?? []).filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-2.5">
      <p className="text-sm text-gray-500 break-keep">
        메시지 카드는 빼고 찍어 주세요. 손님은 주문 확인 페이지에서 사진을 받을 수 있어요.
        {productId ? " '공개 여부'를 체크하면 해당 상품 상세 페이지에 실제로 받은 상품 사진으로 보여요." : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {(photos ?? []).map((p) => (
          <div key={p.id} className="w-28">
            <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <StoreImage thumb src={p.image_url} alt="완성 사진" fill sizes="112px" className="object-cover" />
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label="사진 지우기"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none flex items-center justify-center"
              >
                ×
              </button>
            </div>
            {productId && (
              <label className="mt-1.5 flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={p.is_public} onChange={() => togglePublic(p)} className="w-4 h-4 accent-gold-500 shrink-0" />
                공개 여부
              </label>
            )}
          </div>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`up${i}`} className="w-28 h-28 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading > 0 || photos === null}
          className="w-28 h-28 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-xl leading-none">+</span>
          사진 올리기
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
