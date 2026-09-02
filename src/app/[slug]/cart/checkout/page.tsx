import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import CheckoutClient from "./CheckoutClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string; code?: string; message?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        logo_image, theme_bg, theme_accent, consult_enabled,
        address, delivery_enabled, delivery_fees,
        business_hours, closed_dates,
        shopping_bag_enabled, shopping_bag_price,
        message_card_enabled, message_card_price,
        notification_email
      ),
      subscription:company_subscriptions(plan)
    `)
    .eq("slug", slug)
    .single();

  if (!raw) notFound();

  const s = raw.settings as unknown as Record<string, unknown> | null ?? {};
  const sub = raw.subscription as unknown as Record<string, unknown> | null ?? {};
  if (!sub.plan || sub.plan === "none") notFound();

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
      shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
      shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
      messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
      messageCardPrice={(s.message_card_price as number) ?? 2000}
      notificationEmail={(s.notification_email as string | null) ?? null}
      initialPaymentKey={sp.paymentKey ?? null}
      initialOrderId={sp.orderId ?? null}
      initialAmount={sp.amount ? Number(sp.amount) : null}
      failCode={sp.code ?? null}
      failMessage={sp.message ?? null}
    />
  );
}
