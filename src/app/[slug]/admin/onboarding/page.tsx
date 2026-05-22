import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingClient from "./OnboardingClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OnboardingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  const { data: raw } = await supabase
    .from("companies")
    .select("id, name, subscription:company_subscriptions(plan, subscription_plan)")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!raw) redirect("/");

  const sub = raw.subscription as { plan?: string; subscription_plan?: string } | null;
  const plan = sub?.plan ?? "none";
  if (!plan || plan === "none") redirect("/plan");

  // 실제 선택한 요금제 (starter / pro) — 온보딩 스텝 분기에 사용
  const subscriptionPlan = sub?.subscription_plan ?? plan;

  return (
    <div className="min-h-screen bg-beige-100">
      <OnboardingClient
        slug={slug}
        companyId={raw.id}
        plan={subscriptionPlan}
      />
    </div>
  );
}
