import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // 이미 회사 있으면 프로필도 확인
  let { data: companyRaw } = await supabase
    .from("companies")
    .select("slug, name, settings:company_settings(logo_image)")
    .eq("owner_id", user.id)
    .maybeSingle();

  // 아직 매장을 만들지 않은 신규 가입자 — 임시(pending-) 매장을 만들어 두고, 이 화면에서 이름·주소를 받아 채운다
  // (저장하면 카드 없는 무료 체험이 시작된다 — /api/setup/company)
  if (!companyRaw) {
    const placeholderSlug = `pending-${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    await supabase.from("companies").insert({ name: "", slug: placeholderSlug, owner_id: user.id });
    // 거의 동시에 두 번 렌더링되면 늦은 쪽 insert 는 owner_id unique 로 실패하므로, 만들어진 매장을 다시 읽는다
    ({ data: companyRaw } = await supabase
      .from("companies")
      .select("slug, name, settings:company_settings(logo_image)")
      .eq("owner_id", user.id)
      .maybeSingle());
    if (!companyRaw) redirect("/login");
  }

  const isPendingSlug = companyRaw?.slug?.startsWith("pending-") ?? false;

  const company = companyRaw ? {
    slug: isPendingSlug ? "" : companyRaw.slug,
    name: isPendingSlug ? "" : companyRaw.name,
    logo_image: (companyRaw.settings as { logo_image?: string | null } | null)?.logo_image ?? null,
  } : null;

  let initialProfile = { name: "", phone_number: "" };

  if (company) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone_number")
      .eq("user_id", user.id)
      .single();

    // 매장 정보(이름·주소)를 이미 입력했고 프로필도 완성됐으면 대시보드로
    if (!isPendingSlug && profile?.name && profile?.phone_number) {
      redirect(`/${company.slug}/admin/dashboard`);
    }

    initialProfile = { name: profile?.name ?? "", phone_number: profile?.phone_number ?? "" };
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-widest text-black mb-1">
            매장 정보 설정
          </h1>
          <p className="text-sm text-gray-500">처음 사용 시 매장 정보를 입력해 주세요</p>
        </div>
        <SetupForm
          initialOwnerName={initialProfile.name}
          initialOwnerPhone={initialProfile.phone_number}
          initialCompanyName={company?.name ?? ""}
          initialSlug={company?.slug ?? ""}
          initialLogoUrl={company?.logo_image ?? null}
        />
      </div>
    </div>
  );
}
