import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/main/MainLayout";
import { Product } from "@/types";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanyMenuPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_image, theme_bg, theme_accent")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: products } = await supabase
    .from("product_menus")
    .select("*")
    .eq("company_id", company.id)
    .order("price", { ascending: true });

  const themeVars = generateThemeVars(
    company.theme_bg ?? DEFAULT_THEME_BG,
    company.theme_accent ?? DEFAULT_THEME_ACCENT
  );

  return (
    <MainLayout
      companyName={slug}
      logoImage={company.logo_image}
      themeVars={themeVars}
      products={(products as Product[]) ?? []}
    />
  );
}
