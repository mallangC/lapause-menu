import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import ConsultClient from "./ConsultClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ productId?: string; paymentKey?: string; orderId?: string; quantity?: string }>;
}

export default async function ConsultPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { productId, paymentKey, orderId, quantity } = await searchParams;
  // 메뉴판 캐시 공유 — 매장·설정·상품·카테고리가 모두 들어 있어 캐시 적중 시 DB 조회 0회 (예전엔 매번 3번 순서대로 조회해 화면 전환이 느렸다)
  const menu = await getMenuData(slug);
  const raw = menu?.company;
  const s = menu?.settings ?? {};

  if (!menu || !raw || !s.consult_enabled) notFound();

  const customCats = menu.categories;
  const hiddenProductTypes = (s.hidden_product_types as string[] | null) ?? [];
  const hiddenSeasons = (s.hidden_seasons as string[] | null) ?? [];
  const customProductTypes = customCats
    .filter((c) => c.category_type === "product_type" && !c.hidden)
    .map((c) => c.name as string);
  const customSeasons = customCats
    .filter((c) => c.category_type === "season" && !c.hidden)
    .map((c) => c.name as string);
  const productTypeList = [...PRODUCT_TYPES.filter((t) => !hiddenProductTypes.includes(t)), ...customProductTypes];
  const seasonList = [...SEASONS.filter((s2) => !hiddenSeasons.includes(s2)), ...customSeasons];

  // 추천·선택 목록은 예전처럼 가격 오름차순 (캐시는 상품 유형 → 가격 순)
  const allProducts = [...menu.products].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  const preselectedProduct = productId ? allProducts.find((p) => p.id === productId) ?? null : null;

  return (
    <ConsultClient
      key={`${productId ?? "none"}_${quantity ?? "1"}`}
      slug={slug}
      companyName={raw.name ?? slug}
      logoImage={(s.logo_image as string | null) ?? null}
      productTypeList={productTypeList}
      seasonList={seasonList}
      notificationEmail={(s.notification_email as string | null) ?? null}
      products={allProducts}
      businessHours={(s.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {}}
      closedDates={(s.closed_dates as string[]) ?? []}
      dateOverrides={(s.date_overrides as Record<string, { open: string; close: string }>) ?? {}}
      minLeadTimes={(s.min_lead_times as Record<string, number>) ?? {}}
      consultNotice={(s.consult_notice as string | null) ?? null}
      storeAddress={(s.address as string | null) ?? null}
      deliveryEnabled={(s.delivery_enabled as boolean) ?? false}
      deliveryFees={(s.delivery_fees as Record<string, number>) ?? {}}
      messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
      messageCardPrice={(s.message_card_price as number) ?? 2000}
      shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
      shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
      preservativeEnabled={(s.preservative_enabled as boolean) ?? false}
      preservativePrice={(s.preservative_price as number) ?? 500}
      isDemo={raw.is_demo ?? false}
      preselectedProduct={preselectedProduct}
      initialQuantity={quantity ? Math.max(1, parseInt(quantity)) : 1}
      initialPaymentId={paymentKey ?? orderId ?? null}
    />
  );
}
