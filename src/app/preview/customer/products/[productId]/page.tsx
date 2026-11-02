import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewProductDetailClient from "../../_components/PreviewProductDetailClient";
import { PREVIEW_PRODUCTS, PREVIEW_THEME_VARS } from "../../../_mockStore";
import { brandFont } from "../../../brandFont";
import ProductDetailCoach from "./ProductDetailCoach";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

interface Props {
  params: Promise<{ productId: string }>;
}

// 손님 화면 미리보기 — 상품 상세. 목업 상품을 실제 상세 컴포넌트로 그린다 (장바구니는 실제로 담지 않음)
export default async function PreviewProductDetailPage({ params }: Props) {
  const { productId } = await params;
  const product = PREVIEW_PRODUCTS.find((p) => p.id === productId);
  if (!product) notFound();

  return (
    <>
      <PreviewProductDetailClient
        slug="preview/customer"
        companyName="Brand Name"
        logoImage={null}
        logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
        themeVars={PREVIEW_THEME_VARS}
        product={product}
        allProducts={PREVIEW_PRODUCTS.filter((p) => p.id !== productId)}
        consultEnabled
        hiddenProductTypes={["조화", "식물"]}
        hiddenSeasons={["어버이날", "현장 판매"]}
        customProductTypes={[]}
        customSeasons={[]}
      />
      <ProductDetailCoach />
    </>
  );
}
