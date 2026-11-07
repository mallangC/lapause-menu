// 저장소(Supabase Storage)에서 더 이상 쓰지 않는 파일 지우기
// 공개 주소(…/storage/v1/object/public/{bucket}/{path})에서 경로를 뽑아 지운다. 실패해도 화면 동작에는 영향 없게 조용히 넘어간다.

import type { SupabaseClient } from "@supabase/supabase-js";

export function storagePathFromPublicUrl(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

export async function removeStorageFiles(db: SupabaseClient, bucket: string, urls: string[]) {
  const paths = urls.map((u) => storagePathFromPublicUrl(u, bucket)).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  try {
    await db.storage.from(bucket).remove(paths);
  } catch {
    /* 정리 실패는 무시 */
  }
}
