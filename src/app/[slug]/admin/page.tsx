import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";
import Image from "next/image";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminLoginPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!company) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain mx-auto mb-2" />
          <h1 className="text-xl font-light tracking-widest text-gray-900 mb-1">
            {company.name}
          </h1>
          <p className="text-sm text-gray-400">관리자 로그인</p>
        </div>
        <LoginForm slug={slug} />
      </div>
    </div>
  );
}
