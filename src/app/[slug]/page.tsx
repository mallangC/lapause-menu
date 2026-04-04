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

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_image, theme_bg, theme_accent, home_featured_image, home_all_image, home_season_image, home_consult_image, location_url, kakao_channel_url, instagram_url, youtube_url, hidden_product_types, hidden_seasons, consult_enabled")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("price", { ascending: true });

  const themeVars = generateThemeVars(
    company.theme_bg ?? DEFAULT_THEME_BG,
    company.theme_accent ?? DEFAULT_THEME_ACCENT
  );

  return (
    <MainLayout
      slug={slug}
      companyName={slug}
      logoImage={company.logo_image}
      themeVars={themeVars}
      products={(products as Product[]) ?? []}
      homeFeaturedImage={company.home_featured_image ?? null}
      homeAllImage={company.home_all_image ?? null}
      homeSeasonImage={company.home_season_image ?? null}
      homeConsultImage={company.home_consult_image ?? null}
      locationUrl={company.location_url ?? null}
      kakaoChannelUrl={company.kakao_channel_url ?? null}
      instagramUrl={company.instagram_url ?? null}
      youtubeUrl={company.youtube_url ?? null}
      hiddenProductTypes={company.hidden_product_types ?? []}
      hiddenSeasons={company.hidden_seasons ?? []}
      consultEnabled={company.consult_enabled ?? false}
    />
  );
}
