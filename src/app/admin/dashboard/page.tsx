import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OperatorDashboardClient from "./OperatorDashboardClient";
import { describeDiscount, describePromoTerms, pickPromo, PROMO_CODE_COLUMNS } from "@/lib/billingPrice";

export default async function OperatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "operator") redirect("/login");

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: companies }, { data: reservations }, { data: products }, { data: profiles }, { data: billingLogs }, { data: reservationLogs }, { data: promoSubs }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, created_at, owner_id, operator_memo, is_demo, settings:company_settings(consult_enabled), subscription:company_subscriptions(plan, billing_key, plan_expires_at, trial_ends_at, subscription_plan)")
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, company_id, created_at, desired_date, status, final_price, payment_id, order_type")
      .neq("status", "취소")
      .is("deleted_at", null),
    supabase
      .from("products")
      .select("company_id"),
    supabaseAdmin
      .from("profiles")
      .select("user_id, name, phone_number, is_suspended, suspend_reason"),
    supabase
      .from("billing_logs")
      .select("id, created_at, company_id, operator_id, type, plan, amount, base_amount, discount_amount, success, reason, error_message")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("reservation_logs")
      .select("id, created_at, reservation_id, company_id, actor_user_id, action, field, old_value, new_value, reason")
      .order("created_at", { ascending: false })
      .limit(500),
    // 매장별 적용된 할인 코드 — promo_codes는 RLS로 막혀 있어 서비스 롤로 조회
    supabaseAdmin
      .from("company_subscriptions")
      .select(`company_id, discount_cycles_remaining, promo:promo_codes(${PROMO_CODE_COLUMNS})`)
      .not("promo_code_id", "is", null),
  ]);

  const promoMap = Object.fromEntries((promoSubs ?? []).flatMap((s) => {
    const promo = pickPromo(s.promo);
    return promo ? [[s.company_id as string, { code: promo.code, summary: `${describeDiscount(promo)} · ${describePromoTerms(promo)}`, cyclesRemaining: s.discount_cycles_remaining as number | null }]] : [];
  }));

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
  const companyNameMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]));

  // 데모 매장 데이터는 거래액/통계/정산 등 실제 집계에서 전부 제외한다.
  const demoCompanyIds = new Set((companies ?? []).filter(c => c.is_demo).map(c => c.id));
  const realReservations = (reservations ?? []).filter(r => !demoCompanyIds.has(r.company_id));
  const realProducts = (products ?? []).filter(p => !demoCompanyIds.has(p.company_id));

  const mappedCompanies = (companies ?? []).map((c) => ({
    ...c,
    ownerName: c.owner_id ? (profileMap[c.owner_id]?.name ?? null) : null,
    ownerPhone: c.owner_id ? (profileMap[c.owner_id]?.phone_number ?? null) : null,
    ownerUserId: c.owner_id ?? null,
    isSuspended: c.owner_id ? (profileMap[c.owner_id]?.is_suspended ?? false) : false,
    suspendReason: c.owner_id ? (profileMap[c.owner_id]?.suspend_reason ?? null) : null,
    settings: Array.isArray(c.settings) ? (c.settings[0] ?? null) : c.settings,
    subscription: Array.isArray(c.subscription) ? (c.subscription[0] ?? null) : c.subscription,
    promo: promoMap[c.id] ?? null,
  }));

  const mappedBillingLogs = (billingLogs ?? [])
    .filter(log => !demoCompanyIds.has(log.company_id))
    .map(log => ({
      ...log,
      company_name: companyNameMap[log.company_id] ?? null,
    }));

  const mappedReservationLogs = (reservationLogs ?? [])
    .filter(log => !demoCompanyIds.has(log.company_id))
    .map(log => ({
      ...log,
      company_name: companyNameMap[log.company_id] ?? null,
      actor_name: log.actor_user_id ? (profileMap[log.actor_user_id]?.name ?? null) : null,
    }));

  return (
    <OperatorDashboardClient
      companies={mappedCompanies}
      reservations={realReservations}
      products={realProducts}
      billingLogs={mappedBillingLogs}
      reservationLogs={mappedReservationLogs}
    />
  );
}
