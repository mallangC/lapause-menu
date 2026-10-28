import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMenuData } from "@/lib/menuCache";
import ProductsClient from "./products/ProductsClient";
import ServiceSuspended from "@/components/main/ServiceSuspended";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import { formatPhone } from "@/lib/format";
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

export default async function CompanyMenuPage({ params }: Props) {
  const { slug } = await params;

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
        consultEnabled={(s.consult_enabled as boolean) ?? false}
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
