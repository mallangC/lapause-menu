import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RootLoginForm from "../RootLoginForm";
import Image from "next/image";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role === "operator") redirect("/admin/dashboard");

    const { data: company } = await supabase
      .from("companies")
      .select("slug")
      .eq("owner_id", user.id)
      .single();

    if (company) redirect(`/${company.slug}/admin/dashboard`);
  }

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <Image src="/logo-light.png" alt="Flo.Aide" width={100} height={36} className="object-contain mx-auto mb-1" />
          <p className="text-sm text-gray-400">관리자 로그인</p>
        </div>
        <RootLoginForm />
      </div>
    </div>
  );
}
