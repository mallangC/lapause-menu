import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/main/MainLayout";
import { Product } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanyMenuPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_image")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: products } = await supabase
    .from("product_menus")
    .select("*")
    .eq("company_id", company.id)
    .order("price", { ascending: true });

  return (
    <MainLayout
      companyName={slug}
      logoImage={company.logo_image}
      products={(products as Product[]) ?? []}
    />
  );
}
