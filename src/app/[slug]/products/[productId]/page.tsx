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
        logo_image, theme_bg, theme_accent, consult_enabled
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
      consultEnabled={(s.consult_enabled as boolean) ?? false}
    />
  );
}
