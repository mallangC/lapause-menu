import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

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

  if (!company) notFound();

  return (
    <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-widest text-gold-500 mb-1">
            {company.name}
          </h1>
          <p className="text-sm text-beige-400">관리자 로그인</p>
        </div>
        <LoginForm slug={slug} />
      </div>
    </div>
  );
}
