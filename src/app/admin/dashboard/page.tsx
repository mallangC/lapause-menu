import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OperatorDashboardClient from "./OperatorDashboardClient";

export default async function OperatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "operator") redirect("/admin");

  const [{ data: companies }, { data: reservations }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, created_at, consult_enabled")
      .order("created_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, company_id, created_at, desired_date, status, final_price")
      .neq("status", "취소"),
  ]);

  return (
    <OperatorDashboardClient
      companies={companies ?? []}
      reservations={reservations ?? []}
    />
  );
}
