import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import DashboardClient from "./DashboardClient";
import { Product } from "@/types";
import { DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import { DEVICE_COOKIE_NAME, hashToken } from "@/lib/twoFactor";
import { toClientSettings } from "./companySettings";
import { getAppliedPromo } from "@/lib/appliedPromo";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  const [{ data: profile }, { data: raw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, phone_number, is_suspended, suspend_reason, two_factor_enabled")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("companies")
      .select(`
        id, name, phone,
        settings:company_settings(*),
        subscription:company_subscriptions(*)
      `)
      .eq("slug", slug)
      .eq("owner_id", user.id)
      .single(),
  ]);

  if (profile?.is_suspended) {
    await supabase.auth.signOut();
    redirect(`/${slug}/admin?suspended=1&reason=${encodeURIComponent(profile.suspend_reason ?? "정책 위반")}`);
  }

  if (!raw) redirect("/");

  if (!profile?.name || !profile?.phone_number) redirect("/setup");

  // 2단계 인증을 켜둔 계정은 신뢰된 기기가 아니면 인증 페이지로
  if (profile?.two_factor_enabled) {
    const deviceToken = (await cookies()).get(DEVICE_COOKIE_NAME)?.value;
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    let trusted = false;
    if (deviceToken) {
      const { data: device } = await adminClient
        .from("trusted_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("token_hash", hashToken(deviceToken))
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      trusted = !!device;
    }
    if (!trusted) redirect(`/${slug}/admin/verify-2fa`);
  }

  // 편의를 위해 flatten
  const company = {
    ...raw,
    ...(raw.settings as unknown as Record<string, unknown> ?? {}),
    ...(raw.subscription as unknown as Record<string, unknown> ?? {}),
  } as typeof raw & Record<string, unknown>;

  const plan = (company.plan ?? "none") as "monthly" | "annual" | "none" | "free";

  // 플랜 미설정이면 플랜 선택 페이지로 (free는 허용)
  if (!plan || plan === "none") redirect("/plan");

  const [{ data: products }, appliedPromo] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("company_id", raw.id)
      .order("price", { ascending: true }),
    // 할인 코드가 적용된 매장만 코드 내용을 조회 (소유권은 위 companies 조회에서 확인됨)
    company.promo_code_id
      ? getAppliedPromo(raw.id)
      : Promise.resolve({ promo: null, cyclesRemaining: null }),
  ]);

  return (
    <DashboardClient
      slug={slug}
      userId={user.id}
      userEmail={user.email ?? ""}
      isOAuth={user.app_metadata?.provider !== "email"}
      profileName={profile?.name ?? ""}
      profilePhone={profile?.phone_number ?? ""}
      twoFactorEnabled={profile?.two_factor_enabled ?? false}
      companyId={raw.id}
      companyName={raw.name}
      logoImage={(company.logo_image as string | null) ?? null}
      themeBg={(company.theme_bg as string | null) ?? DEFAULT_THEME_BG}
      themeAccent={(company.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT}
      initialProducts={(products as Product[]) ?? []}
      locationUrl={(company.location_url as string | null) ?? null}
      kakaoChannelUrl={(company.kakao_channel_url as string | null) ?? null}
      instagramUrl={(company.instagram_url as string | null) ?? null}
      youtubeUrl={(company.youtube_url as string | null) ?? null}
      companyPhone={(raw.phone as string | null) ?? null}
      hiddenProductTypes={(company.hidden_product_types as string[]) ?? []}
      hiddenSeasons={(company.hidden_seasons as string[]) ?? []}
      consultEnabled={(company.consult_enabled as boolean) ?? false}
      plan={plan as "monthly" | "annual" | "none" | "free"}
      subscriptionPlan={(company.subscription_plan as "monthly" | "annual" | null) ?? null}
      cancelAtPeriodEnd={(company.cancel_at_period_end as boolean) ?? false}
      trialEndsAt={(company.trial_ends_at as string | null) ?? null}
      planExpiresAt={(company.plan_expires_at as string | null) ?? null}
      hasBillingKey={!!(company.billing_key as string | null)}
      appliedPromo={appliedPromo}
      initialSettings={{ ...toClientSettings(raw.settings as unknown as Record<string, unknown> | null), company_phone: raw.phone ?? null }}
    />
  );
}
