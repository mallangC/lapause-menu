import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getMenuData } from "@/lib/menuCache";
import ProductsClient from "../products/ProductsClient";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import { formatPhone } from "@/lib/format";
import { instantMenuName, readUnattended } from "@/lib/afterHours";
import { SEASONS, PRODUCT_TYPES } from "@/lib/constants";
import { readSeasonDeadlines } from "@/lib/seasonDeadline";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    alternates: {
      canonical: `https://www.flo-aide.com/${slug}/menu`,
    },
  };
}

// 매장 메뉴판 — 원래 /[slug]에 있던 화면. /[slug]는 상담형 첫 화면(주문 방식 고르기)이 됐다
export default async function CompanyMenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  // 매장·구독·대표자·상품·카테고리를 KV 캐시에서 우선 조회 (없으면 DB 조회 후 캐시)
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const raw = menu.company;
  const s = menu.settings;
  const customCats = menu.categories;
  const products = menu.products;
  const ownerProfile = { name: menu.ownerName };

  if (!menu.plan || menu.plan === "none") {
    return <ServiceSuspended companyName={raw.name ?? slug} />;
  }

  const customProductTypes = (customCats ?? [])
    .filter((c) => c.category_type === "product_type" && !c.hidden)
    .map((c) => c.name as string);
  const customSeasons = (customCats ?? [])
    .filter((c) => c.category_type === "season" && !c.hidden)
    .map((c) => c.name as string);
  const hiddenCustomProductTypes = (customCats ?? [])
    .filter((c) => c.category_type === "product_type" && c.hidden)
    .map((c) => c.name as string);
  const hiddenCustomSeasons = (customCats ?? [])
    .filter((c) => c.category_type === "season" && c.hidden)
    .map((c) => c.name as string);

  // 공유된 시즌·상품 종류 링크(?season=, ?type=)가 숨겨졌거나 삭제됐으면 메뉴판 첫 화면으로
  const hiddenSeasonSet = new Set([...((s.hidden_seasons as string[]) ?? []), ...hiddenCustomSeasons]);
  const hiddenTypeSet = new Set([...((s.hidden_product_types as string[]) ?? []), ...hiddenCustomProductTypes]);
  const visibleSeasons = [...SEASONS.filter((v) => !hiddenSeasonSet.has(v)), ...customSeasons];
  const visibleTypes = [...PRODUCT_TYPES.filter((v) => !hiddenTypeSet.has(v)), ...customProductTypes];
  const seasonParam = typeof query.season === "string" ? query.season : null;
  const typeParam = typeof query.type === "string" ? query.type : null;
  if (
    (query.tab === "season" && seasonParam && !visibleSeasons.includes(seasonParam)) ||
    (typeParam && !visibleTypes.includes(typeParam))
  ) {
    redirect(`/${slug}/menu`);
  }

  // 시즌 예약 마감 시각 — 시즌 메뉴 위 안내·메뉴 서랍에 쓴다
  const seasonDeadlines = readSeasonDeadlines(s.season_deadlines);

  const themeVars = generateThemeVars(
    (s.theme_bg as string | null) ?? DEFAULT_THEME_BG,
    (s.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
  );

  return (
    <Suspense>
      <ProductsClient
        slug={slug}
        companyName={raw.name ?? slug}
        logoImage={(s.logo_image as string | null) ?? null}
        themeVars={themeVars}
        products={products}
        hiddenProductTypes={[...((s.hidden_product_types as string[]) ?? []), ...hiddenCustomProductTypes]}
        customProductTypes={customProductTypes}
        hiddenSeasons={[...((s.hidden_seasons as string[]) ?? []), ...hiddenCustomSeasons]}
        customSeasons={customSeasons}
        seasonDeadlines={seasonDeadlines}
        productTypeOrder={(s.product_type_order as string[] | null) ?? []}
        seasonOrder={(s.season_order as string[] | null) ?? []}
        consultEnabled={(s.consult_enabled as boolean) ?? false}
        // 바로 구매 메뉴 — 사장님이 숨겼으면 없음 (상품이 하나도 없으면 메뉴에 안 보인다)
        instantMenu={s.instant_menu_hidden ? null : { name: instantMenuName(s), unattended: !!readUnattended(s).start }}
        locationUrl={(s.location_url as string | null) ?? null}
        kakaoChannelUrl={(s.kakao_channel_url as string | null) ?? null}
        instagramUrl={(s.instagram_url as string | null) ?? null}
        youtubeUrl={(s.youtube_url as string | null) ?? null}
        phone={raw.phone ? formatPhone(raw.phone) : null}
        representativeName={ownerProfile?.name ?? null}
        businessNumber={(s.business_number as string | null) ?? null}
        mailOrderNumber={(s.mail_order_number as string | null) ?? null}
        address={(s.address as string | null) ?? null}
      />
    </Suspense>
  );
}
