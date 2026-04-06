import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanSelectClient from "./PlanSelectClient";
import Image from "next/image";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase.from("companies").select("id, slug, plan").eq("owner_id", user.id).maybeSingle(),
    supabase.from("profiles").select("name").eq("user_id", user.id).single(),
  ]);

  if (!company) redirect("/setup");

  if (company.plan && company.plan !== "none") {
    redirect(`/${company.slug}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain mx-auto mb-6" />
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-2">요금제 선택</h1>
          <p className="text-sm text-gray-400">서비스를 시작할 요금제를 선택해 주세요</p>
          <p className="text-xs text-gold-500 mt-1 font-medium">첫 1개월은 Pro 혜택을 무료로 이용할 수 있습니다</p>
        </div>
        <PlanSelectClient companyId={company.id} slug={company.slug} customerName={profile?.name ?? ""} />
      </div>
    </div>
  );
}
