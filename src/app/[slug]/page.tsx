import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/main/MainLayout";
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
      settings:company_settings(
        logo_image, theme_bg, theme_accent,
        home_featured_image, home_all_image, home_season_image, home_consult_image,
        location_url, kakao_channel_url, instagram_url, youtube_url,
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

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  return (
    <MainLayout
      slug={slug}
      companyName={slug}
      logoImage={(s.logo_image as string | null) ?? null}
      themeVars={themeVars}
      products={(products as Product[]) ?? []}
      homeFeaturedImage={(s.home_featured_image as string | null) ?? null}
      homeAllImage={(s.home_all_image as string | null) ?? null}
      homeSeasonImage={(s.home_season_image as string | null) ?? null}
      homeConsultImage={(s.home_consult_image as string | null) ?? null}
      locationUrl={(s.location_url as string | null) ?? null}
      kakaoChannelUrl={(s.kakao_channel_url as string | null) ?? null}
      instagramUrl={(s.instagram_url as string | null) ?? null}
      youtubeUrl={(s.youtube_url as string | null) ?? null}
      hiddenProductTypes={(s.hidden_product_types as string[]) ?? []}
      hiddenSeasons={(s.hidden_seasons as string[]) ?? []}
      consultEnabled={(s.consult_enabled as boolean) ?? false}
    />
  );
}
