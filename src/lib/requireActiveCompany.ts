import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isActivePlan, SUBSCRIPTION_INACTIVE_CODE, SUBSCRIPTION_INACTIVE_MESSAGE } from "@/lib/subscriptionAccess";

// 사장님 쓰기 API 공통 — 구독이 끝난 매장(보기 전용)은 화면을 우회해 불러도 막는다
// 쓰는 쪽: 본인 매장인지 확인한 다음 `const blocked = await blockIfInactive(companyId); if (blocked) return blocked;`

export async function companyIsActive(companyId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("company_subscriptions").select("plan").eq("company_id", companyId).maybeSingle();
  return isActivePlan((data as { plan?: string } | null)?.plan);
}

/** 구독 중이 아니면 403 응답 (구독 중이면 null) */
export async function blockIfInactive(companyId: string | null | undefined): Promise<NextResponse | null> {
  if (!companyId) return null;
  if (await companyIsActive(companyId)) return null;
  return NextResponse.json({ error: SUBSCRIPTION_INACTIVE_MESSAGE, code: SUBSCRIPTION_INACTIVE_CODE }, { status: 403 });
}
