import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 예전 구독 결제 페이지 주소 — 이제 카드 없이 매장 정보만 입력하면 무료 체험이 시작되고, 구독은 대시보드 요금제 탭에서 한다
// · 매장 정보를 아직 입력하지 않았으면 → 매장 정보 입력(/setup)
// · 입력했으면 → 대시보드 요금제 탭
export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase.from("companies").select("slug").eq("owner_id", user.id).maybeSingle();
  if (!company?.slug || company.slug.startsWith("pending-")) redirect("/setup");
  redirect(`/${company.slug}/admin/dashboard?tab=plan`);
}
