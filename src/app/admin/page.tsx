import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OperatorLoginForm from "./OperatorLoginForm";
import Image from "next/image";

export default async function OperatorLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (profile?.role === "operator") redirect("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain mx-auto mb-1" />
          <p className="text-sm text-gray-400">운영자 로그인</p>
        </div>
        <OperatorLoginForm />
      </div>
    </div>
  );
}
