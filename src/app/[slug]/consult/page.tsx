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

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        business_hours, closed_dates, notification_email, min_lead_times,
        consult_notice, address, delivery_enabled, delivery_fees, consult_enabled
      )
    `)
    .eq("slug", slug)
    .single();

  const s = raw?.settings as unknown as Record<string, unknown> | null ?? {};

  if (!raw || !s.consult_enabled) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", raw.id)
    .eq("status", "active")
    .order("price", { ascending: true });

  const allProducts = (products as Product[]) ?? [];
  const preselectedProduct = productId ? allProducts.find((p) => p.id === productId) ?? null : null;

  return (
    <ConsultClient
      slug={slug}
      companyName={raw.name}
      notificationEmail={(s.notification_email as string | null) ?? null}
      products={allProducts}
      businessHours={(s.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {}}
      closedDates={(s.closed_dates as string[]) ?? []}
      minLeadTimes={(s.min_lead_times as Record<string, number>) ?? {}}
      consultNotice={(s.consult_notice as string | null) ?? null}
      storeAddress={(s.address as string | null) ?? null}
      deliveryEnabled={(s.delivery_enabled as boolean) ?? false}
      deliveryFees={(s.delivery_fees as Record<string, number>) ?? {}}
      preselectedProduct={preselectedProduct}
    />
  );
}
