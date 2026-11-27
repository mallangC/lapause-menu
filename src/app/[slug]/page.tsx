import { notFound, redirect } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import { unavailableLabel } from "@/lib/seasonDeadline";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import StoreWelcomeClient from "./StoreWelcomeClient";
import { formatPhone } from "@/lib/format";
import { normalizeSizeConfig } from "@/lib/sizeTiers";
import { storeProductTypes } from "@/lib/productTypes";
import { DEFAULT_COLOR_LEAD_DAYS, isTodayColorsEnabled, todayColorsFor } from "@/lib/todayColors";
import { readAfterHours, readUnattended } from "@/lib/afterHours";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  // ?consult=1 — 메뉴판 등에서 '맞춤 상담'을 눌러 온 손님 (인사 없이 주문 방식 질문부터)
  // ?paymentKey=…·?code=… — 대화 주문 결제창에서 돌아옴 (대화를 되살려 결제를 마무리한다)
  searchParams?: Promise<{ consult?: string; paymentKey?: string; orderId?: string; code?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    alternates: {
      canonical: `https://www.flo-aide.com/${slug}`,
    },
  };
}

// 매장 첫 화면 — 상담하듯 주문 방식부터 고른다 (메뉴판은 /[slug]/menu 로 옮겼다)
export default async function StoreWelcomePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const fromMenu = sp.consult === "1";
  const returningFromPayment = !!(sp.paymentKey || sp.code || sp.orderId);

  // 메뉴판과 같은 캐시를 쓴다 (매장 이름·로고·디자인 색·맞춤주문 사용 여부)
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const raw = menu.company;
  const s = menu.settings;

  if (!menu.plan || menu.plan === "none") {
    return <ServiceSuspended companyName={raw.name ?? slug} />;
  }

  // 판매(맞춤주문)를 꺼 둔 매장은 첫 화면 대화 없이 바로 메뉴판으로 (대화의 주문 길이 모두 판매를 거친다)
  if (!s.consult_enabled) redirect(`/${slug}/menu`);

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  // 첫 인사에 곁들일 매장 작품 사진 — 인기·추천 상품부터 최대 3장 (인기·추천이 있으면 화면에서 그중 무작위 3장으로 바꾼다)
  // 사진을 누르면 크게 보며 상품 정보를 보고 바로 주문할 수 있게 상품 정보도 함께 넘긴다
  const toIntro = (p: (typeof menu.products)[number]) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    original_price: p.original_price ?? null,
    image_url: p.image_url as string,
    product_type: p.product_type,
    flower_colors: p.flower_colors ?? [],
    wrapping_color: p.wrapping_color ?? null,
    seasons: p.seasons ?? [],
    mood: p.mood ?? null,
    bag_included: p.bag_included ?? false,
    message_card_unavailable: p.message_card_unavailable ?? false,
    preservative_unavailable: p.preservative_unavailable ?? false,
    options: p.options ?? [],
  });
  // 대화 주문(추천·첫 인사 사진)에는 품절·예약 마감 상품을 내지 않는다
  const orderable = menu.products.filter((p) => !unavailableLabel(p));
  const photoPoolProducts = orderable.filter((p) => p.image_url && (p.is_popular || p.is_recommended)).map(toIntro);
  const photoProducts = orderable
    .filter((p) => p.image_url)
    .sort((a, b) => Number(b.is_popular || b.is_recommended) - Number(a.is_popular || a.is_recommended))
    .slice(0, 3)
    .map(toIntro);
  const photos = photoProducts.map((p) => p.image_url);

  return (
    <StoreWelcomeClient
      fromMenu={fromMenu}
      photos={photos}
      photoProducts={photoProducts}
      photoPoolProducts={photoPoolProducts}
      // 크기 기준 (기본 + 유형별) — 대화에서 고른 형태에 맞춰 쓴다
      sizeConfig={normalizeSizeConfig(s.size_tiers)}
      // 색 맞춤 최소 금액 — 예산 칸 위 안내 (오늘 꽃 색상 기능을 끈 매장은 색을 고르지 않으니 안내도 없음)
      colorMinPrice={isTodayColorsEnabled(s as { today_colors_enabled?: boolean | null }) ? ((s.color_min_price as number | undefined) ?? 0) : 0}
      // 사진 주문 최소 금액 — 같은 '색·사진 맞춤 최소 금액' (오늘 꽃 색상 기능과 관계없이)
      photoMinPrice={(s.color_min_price as number | undefined) ?? 0}
      // 형태 질문의 답 — 매장 유형 중 손님에게 보이는 것
      productTypes={storeProductTypes(s.hidden_product_types as string[] | null, menu.categories, true, s.product_type_order as string[] | null)}
      // 대화형 추천에 쓸 상품 — 맞춤주문을 켠 매장만 (카드에 필요한 것만 넘긴다)
      products={
        s.consult_enabled
          ? orderable.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              original_price: p.original_price ?? null,
              image_url: p.image_url,
              product_type: p.product_type,
              mood: p.mood,
              is_recommended: p.is_recommended,
              is_popular: p.is_popular,
              bag_included: p.bag_included ?? false,
              message_card_unavailable: p.message_card_unavailable ?? false,
              preservative_unavailable: p.preservative_unavailable ?? false,
              options: p.options ?? [],
            }))
          : []
      }
      // 메뉴판과 같은 푸터 (바로가기 버튼·정책 링크·사업자 정보)
      footer={{
        companyName: raw.name ?? slug,
        locationUrl: (s.location_url as string | null) ?? null,
        kakaoChannelUrl: (s.kakao_channel_url as string | null) ?? null,
        instagramUrl: (s.instagram_url as string | null) ?? null,
        youtubeUrl: (s.youtube_url as string | null) ?? null,
        phone: raw.phone ? formatPhone(raw.phone) : null,
        representativeName: menu.ownerName ?? null,
        businessNumber: (s.business_number as string | null) ?? null,
        mailOrderNumber: (s.mail_order_number as string | null) ?? null,
        address: (s.address as string | null) ?? null,
      }}
      slug={slug}
      companyName={raw.name ?? slug}
      logoImage={(s.logo_image as string | null) ?? null}
      themeVars={themeVars}
      consultEnabled={(s.consult_enabled as boolean) ?? false}
      // 대화 주문 — 받는 정보·결제·완료까지 대화 안에서 (주문 마지막 페이지와 같은 매장 설정)
      returningFromPayment={returningFromPayment}
      storePhone={raw.phone ?? null}
      checkout={
        s.consult_enabled
          ? {
              notificationEmail: (s.notification_email as string | null) ?? null,
              businessHours: (s.business_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {},
              closedDates: (s.closed_dates as string[]) ?? [],
              dateOverrides: (s.date_overrides as Record<string, { open: string; close: string }>) ?? {},
              minLeadTimes: (s.min_lead_times as Record<string, number>) ?? {},
              consultNotice: (s.consult_notice as string | null) ?? null,
              storeAddress: (s.address as string | null) ?? null,
              deliveryEnabled: (s.delivery_enabled as boolean) ?? false,
              deliveryFees: (s.delivery_fees as Record<string, number>) ?? {},
              messageCardEnabled: (s.message_card_enabled as boolean) ?? false,
              messageCardPrice: (s.message_card_price as number) ?? 2000,
              shoppingBagEnabled: (s.shopping_bag_enabled as boolean) ?? false,
              shoppingBagPrice: (s.shopping_bag_price as number) ?? 2000,
              preservativeEnabled: (s.preservative_enabled as boolean) ?? false,
              preservativePrice: (s.preservative_price as number) ?? 500,
              todayColors: todayColorsFor(s as { today_colors?: string[]; today_colors_date?: string }),
              colorLeadDays: (s.color_lead_days as number | undefined) ?? DEFAULT_COLOR_LEAD_DAYS,
              colorPickEnabled: isTodayColorsEnabled(s as { today_colors_enabled?: boolean | null }),
              colorMinPrice: (s.color_min_price as number | undefined) ?? 0,
              afterHours: readAfterHours(s),
              // 무통장 입금 — 매장 계좌(은행·계좌번호·예금주)가 모두 등록돼 있어야 받는다
              transferAvailable: !!(s.bank_name && s.bank_account && s.bank_holder),
              isDemo: raw.is_demo ?? false,
              // 시즌이 걸린 상품 — 꽃 색을 고르지 않는다
              seasonalProductIds: menu.products.filter((pr) => pr.seasons?.length).map((pr) => pr.id),
              // 바로 구매 메뉴 상품 — 제작시간 없이, 무인 픽업
              instantProductIds: menu.products.filter((pr) => pr.instant).map((pr) => pr.id),
              unattended: readUnattended(s),
            }
          : undefined
      }
    />
  );
}
