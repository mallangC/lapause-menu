import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import ProductsClient from "./ProductsClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductsPage({ params }: Props) {
  const { slug } = await params;

  // searchParams가 없는 경우 /[slug]로 리다이렉트
  redirect(`/${slug}`);

  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        logo_image, theme_bg, theme_accent,
        hidden_product_types, hidden_seasons, consult_enabled
      ),
      subscription:company_subscriptions(plan)
    `)
    .eq("slug", slug)
    .single();

  if (!raw) notFound();

  const s = raw.settings as unknown as Record<string, unknown> | null ?? {};
  const sub = raw.subscription as unknown as Record<string, unknown> | null ?? {};

  if (sub.plan === "none") notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", raw.id)
    .eq("status", "active")
    .order("price", { ascending: true });

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
    <Suspense>
      <ProductsClient
        slug={slug}
        companyName={raw.name ?? slug}
        logoImage={(s.logo_image as string | null) ?? null}
        themeVars={themeVars}
        products={(products as Product[]) ?? []}
        hiddenProductTypes={[...((s.hidden_product_types as string[]) ?? []), ...hiddenCustomProductTypes]}
        hiddenSeasons={[...((s.hidden_seasons as string[]) ?? []), ...hiddenCustomSeasons]}
        customProductTypes={customProductTypes}
        customSeasons={customSeasons}
        consultEnabled={(s.consult_enabled as boolean) ?? false}
      />
    </Suspense>
  );
}
