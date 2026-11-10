import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import { DEFAULT_COLOR_LEAD_DAYS, isTodayColorsEnabled, todayColorsFor } from "@/lib/todayColors";
import { readAfterHours } from "@/lib/afterHours";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import CheckoutClient from "./CheckoutClient";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string; code?: string; message?: string; direct?: string }>;
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
      minLeadTimes={(s.min_lead_times as Record<string, number> | null) ?? {}}
      consultNotice={(s.consult_notice as string | null) ?? null}
      todayColors={todayColorsFor(s as { today_colors?: string[]; today_colors_date?: string })}
      colorLeadDays={(s.color_lead_days as number | undefined) ?? DEFAULT_COLOR_LEAD_DAYS}
      colorPickEnabled={isTodayColorsEnabled(s as { today_colors_enabled?: boolean | null })}
      colorMinPrice={(s.color_min_price as number | undefined) ?? 0}
      afterHours={readAfterHours(s)}
      // 계좌이체 — 매장 계좌(은행·계좌번호·예금주)가 모두 등록돼 있어야 받는다
      transferAvailable={!!(s.bank_name && s.bank_account && s.bank_holder)}
      direct={sp.direct === "1"}
      isDemo={raw.is_demo ?? false}
      initialPaymentKey={sp.paymentKey ?? null}
      initialOrderId={sp.orderId ?? null}
      initialAmount={sp.amount ? Number(sp.amount) : null}
      failCode={sp.code ?? null}
      failMessage={sp.message ?? null}
    />
  );
}
