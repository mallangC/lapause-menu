import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types";
import ConsultClient from "./ConsultClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ productId?: string }>;
}

export default async function ConsultPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { productId } = await searchParams;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, business_hours, closed_dates, notification_email")
    .eq("slug", slug)
    .single();

  if (!company) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("price", { ascending: true });

  const allProducts = (products as Product[]) ?? [];
  const preselectedProduct = productId ? allProducts.find((p) => p.id === productId) ?? null : null;

  return (
    <ConsultClient
      slug={slug}
      companyName={company.name}
      notificationEmail={company.notification_email ?? null}
      products={allProducts}
      businessHours={(company.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {}}
      closedDates={(company.closed_dates as string[]) ?? []}
      preselectedProduct={preselectedProduct}
    />
  );
}
