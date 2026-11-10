import { notFound } from "next/navigation";
import { getMenuData } from "@/lib/menuCache";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params;
  // 메뉴판 캐시 공유 — 활성 상품·카테고리·설정이 모두 들어 있어 캐시 적중 시 DB 조회 0회
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const raw = menu.company;
  const s = menu.settings;
  if (!menu.plan || menu.plan === "none") notFound();

  const product = menu.products.find((p) => p.id === productId);
  if (!product) notFound();

  const allProducts = menu.products.filter((p) => p.id !== productId);
  const customCats = menu.categories;

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
    <ProductDetailClient
      slug={slug}
      companyName={raw.name ?? slug}
      logoImage={(s.logo_image as string | null) ?? null}
      themeVars={themeVars}
      product={product}
      allProducts={allProducts}
      consultEnabled={(s.consult_enabled as boolean) ?? false}
      hiddenProductTypes={[...((s.hidden_product_types as string[] | null) ?? []), ...hiddenCustomProductTypes]}
      hiddenSeasons={[...((s.hidden_seasons as string[] | null) ?? []), ...hiddenCustomSeasons]}
      customProductTypes={customProductTypes}
      customSeasons={customSeasons}
    />
  );
}
