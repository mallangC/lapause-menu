import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import ProductsClient from "./products/ProductsClient";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { Product } from "@/types";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    alternates: {
      canonical: `https://www.flo-aide.com/${slug}`,
    },
  };
}

export default async function CompanyMenuPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id,
      name,
      settings:company_settings(
        logo_image, theme_bg, theme_accent,
        location_url, kakao_channel_url, instagram_url, youtube_url,
        hidden_product_types, hidden_seasons, consult_enabled
      )
    `)
    .eq("slug", slug)
    .single();

  if (!raw) notFound();

  const s = raw.settings as unknown as Record<string, unknown> | null ?? {};

  // company_subscriptions는 RLS가 소유주 본인만 읽을 수 있어서, 손님(익명) 조회를 위해 서비스 롤로 plan만 조회
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: sub } = await supabaseAdmin
    .from("company_subscriptions")
    .select("plan")
    .eq("company_id", raw.id)
    .single();

  if (!sub?.plan || sub.plan === "none") {
    return <ServiceSuspended companyName={raw.name} />;
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", raw.id)
    .eq("status", "active")
    .order("product_type", { ascending: true })
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
        customProductTypes={customProductTypes}
        hiddenSeasons={[...((s.hidden_seasons as string[]) ?? []), ...hiddenCustomSeasons]}
        customSeasons={customSeasons}
        consultEnabled={(s.consult_enabled as boolean) ?? false}
        locationUrl={(s.location_url as string | null) ?? null}
        kakaoChannelUrl={(s.kakao_channel_url as string | null) ?? null}
        instagramUrl={(s.instagram_url as string | null) ?? null}
        youtubeUrl={(s.youtube_url as string | null) ?? null}
      />
    </Suspense>
  );
}
