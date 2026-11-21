import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_QUESTIONS } from "@/lib/onboarding";
import OnboardingClient, { type OnboardingInitial } from "./OnboardingClient";

interface Props {
  params: Promise<{ slug: string }>;
  /** ?start=sales — 대시보드에서 '대화로 판매 신청·준비하기'로 들어올 때 (시작 설정을 끝낸 매장도 들어올 수 있다) */
  searchParams: Promise<{ start?: string }>;
}

export default async function OnboardingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { start } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  const { data: raw } = await supabase
    .from("companies")
    .select("id, name, phone, settings:company_settings(*), subscription:company_subscriptions(plan)")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!raw) redirect("/");

  const sub = raw.subscription as unknown as { plan?: string } | null;
  const plan = sub?.plan ?? "none";
  if (!plan || plan === "none") redirect("/plan");

  const s = (raw.settings ?? {}) as unknown as Record<string, unknown>;
  const startAt = start && ONBOARDING_QUESTIONS.some((q) => q.id === start) ? start : null;
  // 시작 설정을 끝냈거나 '다시 보지 않기'를 누른 매장은 대시보드로 (판매 대화로 바로 들어온 경우는 제외)
  if (s.onboarding_done_at && !startAt) redirect(`/${slug}/admin/dashboard`);

  const [{ count: productCount }, { data: profile }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", raw.id),
    supabase.from("profiles").select("phone_number").eq("user_id", user.id).single(),
  ]);

  const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : null);
  const num = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : 0);
  const initial: OnboardingInitial = {
    step: startAt ?? str("onboarding_step"),
    phone: (raw.phone as string | null) ?? null,
    ownerPhone: (profile?.phone_number as string | null) ?? null,
    address: str("address"),
    parking: str("parking"),
    businessHours: (s.business_hours as OnboardingInitial["businessHours"]) ?? null,
    productCount: productCount ?? 0,
    consultApplyStatus: (s.consult_apply_status as OnboardingInitial["consultApplyStatus"]) ?? null,
    consultRejectReason: str("consult_reject_reason"),
    consultEnabled: s.consult_enabled === true,
    businessNumber: str("business_number"),
    businessVerified: !!s.business_verified_at,
    businessDocUploaded: !!s.business_registration_image_url,
    bankName: str("bank_name"),
    bankAccount: str("bank_account"),
    bankHolder: str("bank_holder"),
    bankDocUploaded: !!s.bank_account_image_url,
    mailOrderNumber: str("mail_order_number"),
    minLeadTimes: (s.min_lead_times as Record<string, number> | null) ?? null,
    deliveryEnabled: s.delivery_enabled === true,
    deliveryFees: (s.delivery_fees as Record<string, number | null> | null) ?? null,
    messageCard: { enabled: s.message_card_enabled === true, price: num("message_card_price") },
    shoppingBag: { enabled: s.shopping_bag_enabled === true, price: num("shopping_bag_price") },
    preservative: { enabled: s.preservative_enabled === true, price: num("preservative_price") },
    consultNotice: str("consult_notice"),
    naverMailKey: str("naver_mail_key"),
    naverMailLastAt: str("naver_mail_last_at"),
    afterHours: {
      enabled: s.after_hours_enabled === true,
      start: str("after_hours_start"),
      end: str("after_hours_end"),
      note: str("after_hours_note"),
    },
  };

  return (
    <OnboardingClient
      slug={slug}
      companyId={raw.id}
      companyName={raw.name}
      logoImage={str("logo_image")}
      initial={initial}
    />
  );
}
