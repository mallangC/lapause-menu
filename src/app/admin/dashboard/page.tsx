import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OperatorDashboardClient from "./OperatorDashboardClient";

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

  const [{ data: companies }, { data: reservations }, { data: products }, { data: profiles }, { data: billingLogs }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, created_at, owner_id, settings:company_settings(consult_enabled), subscription:company_subscriptions(plan, billing_key, plan_expires_at, trial_ends_at, subscription_plan)")
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, company_id, created_at, desired_date, status, final_price, payment_id")
      .neq("status", "취소"),
    supabase
      .from("products")
      .select("company_id"),
    supabase
      .from("profiles")
      .select("user_id, name"),
    supabase
      .from("billing_logs")
      .select("id, created_at, company_id, operator_id, type, plan, amount, success, reason, error_message")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.name]));
  const companyNameMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.name]));

  const mappedCompanies = (companies ?? []).map((c) => ({
    ...c,
    ownerName: c.owner_id ? (profileMap[c.owner_id] ?? null) : null,
    settings: Array.isArray(c.settings) ? (c.settings[0] ?? null) : c.settings,
    subscription: Array.isArray(c.subscription) ? (c.subscription[0] ?? null) : c.subscription,
  }));

  const mappedBillingLogs = (billingLogs ?? []).map(log => ({
    ...log,
    company_name: companyNameMap[log.company_id] ?? null,
  }));

  return (
    <OperatorDashboardClient
      companies={mappedCompanies}
      reservations={reservations ?? []}
      products={products ?? []}
      billingLogs={mappedBillingLogs}
    />
  );
}
