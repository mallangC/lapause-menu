import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanSelectClient from "./PlanSelectClient";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: companyRaw }, { data: profile }] = await Promise.all([
    supabase.from("companies").select("id, slug, subscription:company_subscriptions(plan, trial_ends_at)").eq("owner_id", user.id).maybeSingle(),
    supabase.from("profiles").select("name").eq("user_id", user.id).single(),
  ]);

  let companyId: string;
  let companySlug: string;
  let sub: { plan?: string; trial_ends_at?: string | null } | null;

  // 아직 매장을 만들지 않은 신규 유저 — 구독 결제를 먼저 받기 위해 임시(placeholder) 매장을 생성.
  // 실제 매장이름·URL은 결제 완료 후 /setup에서 입력받아 이 레코드를 업데이트한다.
  if (!companyRaw) {
    const placeholderSlug = `pending-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    const { data: created } = await supabase
      .from("companies")
      .insert({ name: "", slug: placeholderSlug, owner_id: user.id })
      .select("id, slug")
      .single();

    // 이 페이지가 거의 동시에 두 번 렌더링되면 양쪽 다 매장이 없다고 보고 insert를 시도한다.
    // owner_id unique 제약으로 늦은 쪽은 실패하므로, 먼저 만들어진 매장을 다시 읽어서 사용한다.
    const company = created ?? (await supabase
      .from("companies")
      .select("id, slug, subscription:company_subscriptions(plan, trial_ends_at)")
      .eq("owner_id", user.id)
      .maybeSingle()).data;
    if (!company) redirect("/login");
    companyId = company.id;
    companySlug = company.slug;
    sub = "subscription" in company
      ? company.subscription as { plan?: string; trial_ends_at?: string | null } | null
      : null;
  } else {
    companyId = companyRaw.id;
    companySlug = companyRaw.slug;
    sub = companyRaw.subscription as { plan?: string; trial_ends_at?: string | null } | null;
  }

  const plan = sub?.plan ?? "none";
  const company = { id: companyId, slug: companySlug };
  const trialEligible = !sub?.trial_ends_at;
  const isNewSignup = company.slug.startsWith("pending-");

  if (plan && plan !== "none") {
    redirect(`/${company.slug}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg -mt-20">
        <div className="text-center mb-10">
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-2">요금제 선택</h1>
          <p className="text-sm text-gray-400">서비스를 시작할 요금제를 선택해 주세요</p>
          {trialEligible && (
            <p className="text-xs text-gold-500 mt-1 font-medium">첫 30일은 무료로 이용할 수 있습니다</p>
          )}
        </div>
        <PlanSelectClient companyId={company.id} slug={company.slug} customerName={profile?.name ?? ""} trialEligible={trialEligible} isNewSignup={isNewSignup} />
      </div>
    </div>
  );
}
