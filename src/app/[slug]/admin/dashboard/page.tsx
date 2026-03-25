import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { Product } from "@/types";
import { DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  // 로그인한 사용자의 회사 확인 (slug와 owner_id 일치 검증)
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_image, theme_bg, theme_accent, home_featured_image, home_all_image, home_season_image, home_consult_image, location_url, kakao_channel_url, instagram_url, youtube_url, hidden_product_types, hidden_seasons, consult_enabled")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  // 해당 slug의 회사가 없거나 다른 계정 소유 → 루트로
  if (!company) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone_number")
    .eq("user_id", user.id)
    .single();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", company.id)
    .order("price", { ascending: true });

  return (
    <DashboardClient
      slug={slug}
      userId={user.id}
      profileName={profile?.name ?? ""}
      profilePhone={profile?.phone_number ?? ""}
      companyId={company.id}
      companyName={company.name}
      logoImage={company.logo_image}
      themeBg={company.theme_bg ?? DEFAULT_THEME_BG}
      themeAccent={company.theme_accent ?? DEFAULT_THEME_ACCENT}
      initialProducts={(products as Product[]) ?? []}
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
