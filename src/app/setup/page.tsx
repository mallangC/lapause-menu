import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // 이미 회사 있으면 대시보드로
  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("owner_id", user.id)
    .single();

  if (company) redirect(`/${company.slug}/admin/dashboard`);

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-widest text-gold-500 mb-1">
            회사 정보 설정
          </h1>
          <p className="text-sm text-beige-400">처음 사용 시 회사 정보를 입력해 주세요</p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
