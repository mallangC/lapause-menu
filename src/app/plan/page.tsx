import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanSelectClient from "./PlanSelectClient";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: companyRaw }, { data: profile }] = await Promise.all([
    supabase.from("companies").select("id, slug, subscription:company_subscriptions(plan)").eq("owner_id", user.id).maybeSingle(),
    supabase.from("profiles").select("name").eq("user_id", user.id).single(),
  ]);

  if (!companyRaw) redirect("/setup");

  const plan = (companyRaw.subscription as { plan?: string } | null)?.plan ?? "none";
  const company = { id: companyRaw.id, slug: companyRaw.slug };

  if (plan && plan !== "none") {
    redirect(`/${company.slug}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl -mt-20">
        <div className="text-center mb-10">
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-2">요금제 선택</h1>
          <p className="text-sm text-gray-400">서비스를 시작할 요금제를 선택해 주세요</p>
          <p className="text-xs text-gold-500 mt-1 font-medium">첫 1개월은 Pro 혜택을 무료로 이용할 수 있습니다</p>
        </div>
        <PlanSelectClient companyId={company.id} slug={company.slug} customerName={profile?.name ?? ""} />
      </div>
    </div>
  );
}
