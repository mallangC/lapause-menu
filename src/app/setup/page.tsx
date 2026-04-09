import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // 이미 회사 있으면 프로필도 확인
  const { data: companyRaw } = await supabase
    .from("companies")
    .select("slug, name, settings:company_settings(logo_image)")
    .eq("owner_id", user.id)
    .single();

  const company = companyRaw ? {
    slug: companyRaw.slug,
    name: companyRaw.name,
    logo_image: (companyRaw.settings as { logo_image?: string | null } | null)?.logo_image ?? null,
  } : null;

  let initialProfile = { name: "", phone_number: "" };

  if (company) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, phone_number")
      .eq("user_id", user.id)
      .single();

    // 회사 있고 프로필도 완성됐으면 대시보드로
    if (profile?.name && profile?.phone_number) {
      redirect(`/${company.slug}/admin/dashboard`);
    }

    initialProfile = { name: profile?.name ?? "", phone_number: profile?.phone_number ?? "" };
  }

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
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
