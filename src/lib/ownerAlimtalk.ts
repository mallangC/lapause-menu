import type { SupabaseClient } from "@supabase/supabase-js";

// 사장님 알림톡 받기 설정 (매장 설정 > 사장님 알림톡) — 서버 키로 읽는다
// new_order: 예약 접수(손님 주문·결제, 링크결제 완료) / unconfirmed: 놓친 미확인 예약
// 칸이 없거나 못 읽으면 받는 것으로 본다 (알림이 빠지는 쪽보다 가는 쪽이 안전)
export async function ownerWantsAlimtalk(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  companyId: string,
  kind: "new_order" | "unconfirmed",
): Promise<boolean> {
  const column = kind === "new_order" ? "owner_alimtalk_new_order" : "owner_alimtalk_unconfirmed";
  try {
    const { data, error } = await db.from("company_settings").select(column).eq("company_id", companyId).maybeSingle();
    if (error || !data) return true;
    return (data as Record<string, unknown>)[column] !== false;
  } catch {
    return true;
  }
}
