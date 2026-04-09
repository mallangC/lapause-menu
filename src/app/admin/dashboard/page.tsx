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

  const [{ data: companies }, { data: reservations }, { data: products }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, created_at, settings:company_settings(consult_enabled), subscription:company_subscriptions(plan)")
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, company_id, created_at, desired_date, status, final_price, payment_id")
      .neq("status", "취소"),
    supabase
      .from("products")
      .select("company_id"),
  ]);

  const mappedCompanies = (companies ?? []).map((c) => ({
    ...c,
    settings: Array.isArray(c.settings) ? (c.settings[0] ?? null) : c.settings,
    subscription: Array.isArray(c.subscription) ? (c.subscription[0] ?? null) : c.subscription,
  }));

  return (
    <OperatorDashboardClient
      companies={mappedCompanies}
      reservations={reservations ?? []}
      products={products ?? []}
    />
  );
}
