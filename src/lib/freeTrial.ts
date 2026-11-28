import { createAdminClient } from "@/lib/supabase/admin";
import { purgeMenuCacheByCompanyId } from "@/lib/menuCache";

/** 카드 없이 주는 무료 체험 기간 (일) */
export const FREE_TRIAL_DAYS = 30;

// 매장 정보 입력을 마친 매장에 카드 없는 무료 체험을 시작한다 (plan = 'trial')
// · 한 번도 체험하지 않은 매장만 (trial_ends_at 이 비어 있고 plan 이 none) — 조건을 update 에 걸어 두 번 눌러도 한 번만
// · 매장 주소가 아직 임시(pending-)면 시작하지 않는다
// 체험 중 카드를 등록하면 billingActivate 가 plan 을 monthly/annual 로 바꾸고, 체험이 끝나는 날 첫 결제된다
export async function startFreeTrial(companyId: string): Promise<{ started: boolean; error?: string }> {
  const db = createAdminClient();

  const { data: company } = await db.from("companies").select("slug").eq("id", companyId).maybeSingle();
  if (!company?.slug || company.slug.startsWith("pending-")) return { started: false };

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_DAYS);

  const { data, error } = await db
    .from("company_subscriptions")
    .update({ plan: "trial", trial_ends_at: trialEndsAt.toISOString() })
    .eq("company_id", companyId)
    .eq("plan", "none")
    .is("trial_ends_at", null)
    .select("company_id");
  if (error) return { started: false, error: error.message };
  if (!data?.length) return { started: false };

  const { error: logError } = await db.from("billing_logs").insert({
    company_id: companyId,
    operator_id: null,
    type: "charge",
    plan: "trial",
    amount: 0,
    payment_id: null,
    success: true,
    reason: `무료체험 시작 (${FREE_TRIAL_DAYS}일, 카드 없음)`,
  });
  if (logError) console.error("[freeTrial] billing_logs 기록 실패:", logError);

  await purgeMenuCacheByCompanyId(companyId);
  return { started: true };
}
