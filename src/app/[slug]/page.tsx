import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import StoreWelcomeClient from "./StoreWelcomeClient";
import { formatPhone } from "@/lib/format";
import { activeSizeTiers } from "@/lib/sizeTiers";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
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
export default async function StoreWelcomePage({ params }: Props) {
  const { slug } = await params;

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
      photos={photos}
      sizeTiers={activeSizeTiers(s.size_tiers)}
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
