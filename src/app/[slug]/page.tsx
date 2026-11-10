import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import StoreWelcomeClient from "./StoreWelcomeClient";
import { formatPhone } from "@/lib/format";
import { normalizeSizeConfig } from "@/lib/sizeTiers";
import { storeProductTypes } from "@/lib/productTypes";
import { isTodayColorsEnabled } from "@/lib/todayColors";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  // ?consult=1 — 메뉴판 등에서 '맞춤 상담'을 눌러 온 손님 (인사 없이 주문 방식 질문부터)
  searchParams?: Promise<{ consult?: string }>;
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
  const fromMenu = (await searchParams)?.consult === "1";

  // 메뉴판과 같은 캐시를 쓴다 (매장 이름·로고·디자인 색·맞춤주문 사용 여부)
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const raw = menu.company;
  const s = menu.settings;

  if (!menu.plan || menu.plan === "none") {
    return <ServiceSuspended companyName={raw.name ?? slug} />;
  }

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  // 첫 인사에 곁들일 매장 작품 사진 — 인기·추천 상품부터 최대 3장
  const photos = menu.products
    .filter((p) => p.image_url)
    .sort((a, b) => Number(b.is_popular || b.is_recommended) - Number(a.is_popular || a.is_recommended))
    .slice(0, 3)
    .map((p) => p.image_url as string);

  return (
    <StoreWelcomeClient
      fromMenu={fromMenu}
      photos={photos}
      // 크기 기준 (기본 + 유형별) — 대화에서 고른 형태에 맞춰 쓴다
      sizeConfig={normalizeSizeConfig(s.size_tiers)}
      // 색 맞춤 최소 금액 — 예산 칸 위 안내 (오늘 꽃 색상 기능을 끈 매장은 색을 고르지 않으니 안내도 없음)
      colorMinPrice={isTodayColorsEnabled(s as { today_colors_enabled?: boolean | null }) ? ((s.color_min_price as number | undefined) ?? 0) : 0}
      // 형태 질문의 답 — 매장 유형 중 손님에게 보이는 것
      productTypes={storeProductTypes(s.hidden_product_types as string[] | null, menu.categories, true)}
      // 대화형 추천에 쓸 상품 — 맞춤주문을 켠 매장만 (카드에 필요한 것만 넘긴다)
      products={
        s.consult_enabled
          ? menu.products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image_url: p.image_url,
              product_type: p.product_type,
              mood: p.mood,
              is_recommended: p.is_recommended,
              is_popular: p.is_popular,
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
    />
  );
}
