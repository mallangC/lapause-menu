import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/main/MainLayout";
import { Product } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("product_menus")
    .select("*")
    .order("price", { ascending: true });

  return <MainLayout products={(products as Product[]) ?? []} />;
}
