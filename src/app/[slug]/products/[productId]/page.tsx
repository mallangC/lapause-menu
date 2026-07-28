import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        logo_image, theme_bg, theme_accent, consult_enabled,
        hidden_product_types, hidden_seasons
      ),
      subscription:company_subscriptions(plan)
    `)
    .eq("slug", slug)
    .single();

  if (!raw) notFound();

  const s = raw.settings as unknown as Record<string, unknown> | null ?? {};
  const sub = raw.subscription as unknown as Record<string, unknown> | null ?? {};

  if (sub.plan === "none") notFound();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("company_id", raw.id)
    .eq("status", "active")
    .single();

  if (!product) notFound();

  const { data: allProducts } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", raw.id)
    .eq("status", "active")
    .neq("id", productId);

  const { data: customCats } = await supabase
    .from("company_categories")
    .select("category_type, name, hidden")
    .eq("company_id", raw.id);

  const customProductTypes = (customCats ?? [])
    .filter((c) => c.category_type === "product_type" && !c.hidden)
    .map((c) => c.name as string);
  const customSeasons = (customCats ?? [])
    .filter((c) => c.category_type === "season" && !c.hidden)
    .map((c) => c.name as string);
  const hiddenCustomProductTypes = (customCats ?? [])
    .filter((c) => c.category_type === "product_type" && c.hidden)
    .map((c) => c.name as string);
  const hiddenCustomSeasons = (customCats ?? [])
    .filter((c) => c.category_type === "season" && c.hidden)
    .map((c) => c.name as string);

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  return (
    <ProductDetailClient
      slug={slug}
      companyName={raw.name ?? slug}
      logoImage={(s.logo_image as string | null) ?? null}
      themeVars={themeVars}
      product={product as Product}
      allProducts={(allProducts as Product[]) ?? []}
      consultEnabled={(s.consult_enabled as boolean) ?? false}
      hiddenProductTypes={[...((s.hidden_product_types as string[] | null) ?? []), ...hiddenCustomProductTypes]}
      hiddenSeasons={[...((s.hidden_seasons as string[] | null) ?? []), ...hiddenCustomSeasons]}
      customProductTypes={customProductTypes}
      customSeasons={customSeasons}
    />
  );
}
