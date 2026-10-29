import { createAdminClient } from "@/lib/supabase/admin";
import { pickPromo, PROMO_CODE_COLUMNS, type PromoCode } from "@/lib/billingPrice";

export interface AppliedPromo {
  promo: PromoCode | null;
  /** null = 평생 할인 */
  cyclesRemaining: number | null;
}

// 매장에 적용된 할인 코드 조회 (서버 전용).
// promo_codes는 RLS로 사장님이 직접 읽을 수 없어서 서비스 롤로 해당 매장 것만 가져온다. 호출 전에 소유권 확인 필수.
export async function getAppliedPromo(companyId: string): Promise<AppliedPromo> {
  const { data } = await createAdminClient()
    .from("company_subscriptions")
    .select(`discount_cycles_remaining, promo:promo_codes(${PROMO_CODE_COLUMNS})`)
    .eq("company_id", companyId)
    .maybeSingle();
  return {
    promo: pickPromo(data?.promo),
    cyclesRemaining: (data?.discount_cycles_remaining as number | null | undefined) ?? null,
  };
}
