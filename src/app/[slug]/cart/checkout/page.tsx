import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import CheckoutClient from "./CheckoutClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string; code?: string; message?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  // 메뉴판 캐시 공유 — 구독(plan)을 서비스 롤로 읽어 둔 데이터라 손님(비로그인)도 정확히 판단된다
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const raw = menu.company;
  const s = menu.settings;
  if (!menu.plan || menu.plan === "none") notFound();

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  return (
    <CheckoutClient
      slug={slug}
      companyName={raw.name ?? slug}
      logoImage={(s.logo_image as string | null) ?? null}
      themeVars={themeVars}
      consultEnabled={(s.consult_enabled as boolean) ?? false}
      storeAddress={(s.address as string | null) ?? null}
      deliveryEnabled={(s.delivery_enabled as boolean) ?? false}
      deliveryFees={(s.delivery_fees as Record<string, number>) ?? {}}
      businessHours={(s.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {}}
      closedDates={(s.closed_dates as string[]) ?? []}
      dateOverrides={(s.date_overrides as Record<string, { open: string; close: string }>) ?? {}}
      shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
      shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
      preservativeEnabled={(s.preservative_enabled as boolean) ?? false}
      preservativePrice={(s.preservative_price as number) ?? 500}
      messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
      messageCardPrice={(s.message_card_price as number) ?? 2000}
      notificationEmail={(s.notification_email as string | null) ?? null}
      isDemo={raw.is_demo ?? false}
      initialPaymentKey={sp.paymentKey ?? null}
      initialOrderId={sp.orderId ?? null}
      initialAmount={sp.amount ? Number(sp.amount) : null}
      failCode={sp.code ?? null}
      failMessage={sp.message ?? null}
    />
  );
}
