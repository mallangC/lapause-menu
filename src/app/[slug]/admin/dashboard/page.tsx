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

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name, phone,
      settings:company_settings(*),
      subscription:company_subscriptions(*)
    `)
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!raw) redirect("/");

  // 편의를 위해 flatten
  const company = {
    ...raw,
    ...(raw.settings as unknown as Record<string, unknown> ?? {}),
    ...(raw.subscription as unknown as Record<string, unknown> ?? {}),
  } as typeof raw & Record<string, unknown>;

  const plan = (company.plan ?? "none") as string;

  // 플랜 미설정이면 플랜 선택 페이지로
  if (!plan || plan === "none") redirect("/plan");

  // 체험 만료 감지: pro이고 trial 만료됐고 billing_key 없으면 → starter로 전환
  if (
    plan === "pro" &&
    company.trial_ends_at &&
    new Date(company.trial_ends_at as string) < new Date() &&
    !company.billing_key
  ) {
    await supabase
      .from("company_subscriptions")
      .update({ plan: "starter", trial_ends_at: null })
      .eq("company_id", raw.id);
    await supabase
      .from("company_settings")
      .update({ consult_enabled: false })
      .eq("company_id", raw.id);
    company.plan = "starter";
    company.trial_ends_at = null;
    company.consult_enabled = false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone_number")
    .eq("user_id", user.id)
    .single();

  if (!profile?.name || !profile?.phone_number) redirect("/setup");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", raw.id)
    .order("price", { ascending: true });

  return (
    <DashboardClient
      slug={slug}
      userId={user.id}
      userEmail={user.email ?? ""}
      isOAuth={user.app_metadata?.provider !== "email"}
      profileName={profile?.name ?? ""}
      profilePhone={profile?.phone_number ?? ""}
      companyId={raw.id}
      companyName={raw.name}
      logoImage={(company.logo_image as string | null) ?? null}
      themeBg={(company.theme_bg as string | null) ?? DEFAULT_THEME_BG}
      themeAccent={(company.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT}
      initialProducts={(products as Product[]) ?? []}
      homeFeaturedImage={(company.home_featured_image as string | null) ?? null}
      homeAllImage={(company.home_all_image as string | null) ?? null}
      homeSeasonImage={(company.home_season_image as string | null) ?? null}
      homeConsultImage={(company.home_consult_image as string | null) ?? null}
      locationUrl={(company.location_url as string | null) ?? null}
      kakaoChannelUrl={(company.kakao_channel_url as string | null) ?? null}
      instagramUrl={(company.instagram_url as string | null) ?? null}
      youtubeUrl={(company.youtube_url as string | null) ?? null}
      companyPhone={(raw.phone as string | null) ?? null}
      hiddenProductTypes={(company.hidden_product_types as string[]) ?? []}
      hiddenSeasons={(company.hidden_seasons as string[]) ?? []}
      consultEnabled={(company.consult_enabled as boolean) ?? false}
      plan={plan as "starter" | "pro" | "free"}
      subscriptionPlan={(company.subscription_plan as "starter" | "pro" | null) ?? null}
      cancelAtPeriodEnd={(company.cancel_at_period_end as boolean) ?? false}
      trialEndsAt={(company.trial_ends_at as string | null) ?? null}
      planExpiresAt={(company.plan_expires_at as string | null) ?? null}
    />
  );
}
