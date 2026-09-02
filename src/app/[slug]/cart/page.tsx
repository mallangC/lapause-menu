import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import CartClient from "./CartClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CartPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from("companies")
    .select(`
      id, name,
      settings:company_settings(
        logo_image, theme_bg, theme_accent, consult_enabled,
        shopping_bag_enabled, shopping_bag_price,
        message_card_enabled, message_card_price
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
    <Suspense>
      <CartClient
        slug={slug}
        companyName={raw.name ?? slug}
        logoImage={(s.logo_image as string | null) ?? null}
        themeVars={themeVars}
        consultEnabled={(s.consult_enabled as boolean) ?? false}
        shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
        shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
        messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
        messageCardPrice={(s.message_card_price as number) ?? 2000}
      />
    </Suspense>
  );
}
