import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMenuData } from "@/lib/menuCache";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import CartClient from "./CartClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CartPage({ params }: Props) {
  const { slug } = await params;
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
    <Suspense>
      <CartClient
        slug={slug}
        companyName={raw.name ?? slug}
        logoImage={(s.logo_image as string | null) ?? null}
        themeVars={themeVars}
        consultEnabled={(s.consult_enabled as boolean) ?? false}
        shoppingBagEnabled={(s.shopping_bag_enabled as boolean) ?? false}
        shoppingBagPrice={(s.shopping_bag_price as number) ?? 2000}
        preservativeEnabled={(s.preservative_enabled as boolean) ?? false}
        preservativePrice={(s.preservative_price as number) ?? 500}
        messageCardEnabled={(s.message_card_enabled as boolean) ?? false}
        messageCardPrice={(s.message_card_price as number) ?? 2000}
      />
    </Suspense>
  );
}
