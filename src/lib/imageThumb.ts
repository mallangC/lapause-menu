// 목록용 작은 사진(썸네일) — 사진은 Worker 이미지 변환을 거치지 않고 Supabase에서 바로 받으므로(next.config images.unoptimized),
// 큰 사진(긴 변 1200px)과 함께 목록·카드에 쓸 작은 사진을 업로드할 때 미리 만들어 둔다.
// 이름 규칙: '…/파일.webp'(또는 .jpg·.jpeg·.png) → '…/파일_thumb.webp' (같은 폴더, 같은 이름 + _thumb, 썸네일은 늘 WebP)
// 썸네일이 없는 예전 사진은 화면에서 원본으로 대신 보여준다 (StoreImage의 onError).

export const THUMB_MAX_PX = 480;
export const THUMB_SUFFIX = "_thumb";

const SUPABASE_PUBLIC = "/storage/v1/object/public/";

const PHOTO_EXT = /\.(webp|jpe?g|png)$/i;

/** 저장 경로의 썸네일 경로 ('123.webp'·'123.jpg' → '123_thumb.webp') — 사진이 아니면 null */
export function thumbPath(path: string): string | null {
  if (!PHOTO_EXT.test(path) || path.endsWith(`${THUMB_SUFFIX}.webp`)) return null;
  return path.replace(PHOTO_EXT, `${THUMB_SUFFIX}.webp`);
}

/** 썸네일 주소 — 우리 저장소(Supabase)의 사진만 (그 외는 null: 원본 그대로 쓴다) */
export function thumbUrl(url: string | null | undefined): string | null {
  if (!url || !url.includes(SUPABASE_PUBLIC)) return null;
  const [base, query] = url.split("?");
  const t = thumbPath(base);
  return t ? `${t}${query ? `?${query}` : ""}` : null;
}

/** 브라우저에서 사진을 긴 변 maxPx 이하 WebP로 줄인다 (투명 배경은 그대로) */
export async function resizeToWebp(source: Blob, maxPx: number, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(source);
  const scale = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (!blob) throw new Error("사진을 줄이지 못했어요");
  return blob;
}
