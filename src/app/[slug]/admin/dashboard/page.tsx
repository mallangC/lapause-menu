import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { Product } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  // 로그인한 사용자의 회사 확인 (slug와 owner_id 일치 검증)
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, logo_image")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!company) notFound();

  const { data: products } = await supabase
    .from("product_menus")
    .select("*")
    .eq("company_id", company.id)
    .order("price", { ascending: true });

  return (
    <DashboardClient
      slug={slug}
      companyId={company.id}
      companyName={company.name}
      logoImage={company.logo_image}
      initialProducts={(products as Product[]) ?? []}
    />
  );
}
