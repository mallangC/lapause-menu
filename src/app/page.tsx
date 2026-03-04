import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RootLoginForm from "./RootLoginForm";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 이미 로그인 상태면 해당 회사 대시보드로 바로 이동
  if (user) {
    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("owner_id", user.id)
      .single();

    if (company) redirect(`/${company.slug}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-widest text-gold-500 mb-1">
            관리자 로그인
          </h1>
        </div>
        <RootLoginForm />
      </div>
    </div>
  );
}
