import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/types";
import ConsultClient from "./ConsultClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ productId?: string; paymentKey?: string; orderId?: string }>;
}

export default async function ConsultPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { productId, paymentKey, orderId } = await searchParams;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        logo_image, business_hours, closed_dates, notification_email, min_lead_times,
        consult_notice, address, delivery_enabled, delivery_fees, consult_enabled,
        message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price,
        hidden_product_types, hidden_seasons
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

  const { data: customCats } = await supabase
    .from("company_categories")
    .select("category_type, name, hidden")
    .eq("company_id", raw.id);

  const { PRODUCT_TYPES, SEASONS } = await import("@/lib/constants");
  const hiddenProductTypes = (s.hidden_product_types as string[] | null) ?? [];
  const hiddenSeasons = (s.hidden_seasons as string[] | null) ?? [];
  const customProductTypes = (customCats ?? [])
    .filter((c) => c.category_type === "product_type" && !c.hidden)
    .map((c) => c.name as string);
  const customSeasons = (customCats ?? [])
    .filter((c) => c.category_type === "season" && !c.hidden)
    .map((c) => c.name as string);
  const productTypeList = [...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)), ...customProductTypes];
  const seasonList = [...SEASONS.filter((s2) => !hiddenSeasons.includes(s2)), ...customSeasons];

  const allProducts = (products as Product[]) ?? [];
  const preselectedProduct = productId ? allProducts.find((p) => p.id === productId) ?? null : null;

  return (
    <ConsultClient
      slug={slug}
      companyName={raw.name}
      logoImage={(s.logo_image as string | null) ?? null}
      productTypeList={productTypeList}
      seasonList={seasonList}
      notificationEmail={(s.notification_email as string | null) ?? null}
      products={allProducts}
      businessHours={(s.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {}}
      closedDates={(s.closed_dates as string[]) ?? []}
      minLeadTimes={(s.min_lead_times as Record<string, number>) ?? {}}
      consultNotice={(s.consult_notice as string | null) ?? null}
      storeAddress={(s.address as string | null) ?? null}
      deliveryEnabled={(s.delivery_enabled as boolean) ?? false}
      deliveryFees={(s.delivery_fees as Record<string, number>) ?? {}}
      messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
      messageCardPrice={(s.message_card_price as number) ?? 2000}
      shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
      shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
      preselectedProduct={preselectedProduct}
      initialPaymentId={paymentKey ?? orderId ?? null}
    />
  );
}
