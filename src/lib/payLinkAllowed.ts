import type { SupabaseClient } from "@supabase/supabase-js";

// 링크결제는 판매 신청이 승인된 매장만 (사업자·정산 계좌 확인을 마친 매장) — 판매 스위치를 잠깐 꺼 둬도 승인된 매장은 쓸 수 있다
export const PAY_LINK_BLOCKED_MESSAGE = "판매 신청이 승인된 매장만 결제 링크를 쓸 수 있어요.";

/** 이 매장이 링크결제를 쓸 수 있는지 (company_settings.consult_apply_status = approved) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function payLinkAllowed(db: SupabaseClient<any, any, any>, companyId: string): Promise<boolean> {
  const { data } = await db.from("company_settings").select("consult_apply_status").eq("company_id", companyId).maybeSingle();
  return (data as { consult_apply_status?: string | null } | null)?.consult_apply_status === "approved";
}
