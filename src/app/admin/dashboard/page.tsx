import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { Product } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 이중 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const { data: products } = await supabase
    .from("product_menus")
    .select("*")
    .order("created_at", { ascending: false });

  return <DashboardClient initialProducts={(products as Product[]) ?? []} />;
}
