import type { Metadata } from "next";
import { PREVIEW_PRODUCTS, PREVIEW_STORE_ADDRESS, PREVIEW_THEME_VARS } from "../_mockStore";
import { brandFont } from "../brandFont";
import PreviewStoreWelcome from "./_components/PreviewStoreWelcome";
import WelcomeCoach from "./WelcomeCoach";
import { normalizeSizeConfig } from "@/lib/sizeTiers";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

// 손님 화면 미리보기 — 매장 첫 화면(대화형 상담). 실제 /[slug] 와 같은 자리, 메뉴판은 /preview/customer/menu
// 볼륨감 참고 이미지 예시 사진 — 사진 있는 예시 상품을 가격 순으로 고르게 4장
const VOLUME_EXAMPLE_IMAGES = (() => {
  const withImg = PREVIEW_PRODUCTS.filter((p) => p.image_url && p.product_type === "꽃다발").sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (withImg.length === 0) return [];
  return [0, 1, 2, 3].map((k) => withImg[Math.min(withImg.length - 1, Math.round((k * (withImg.length - 1)) / 3))].image_url as string);
})();

export default async function CustomerPreviewPage({ searchParams }: { searchParams?: Promise<{ consult?: string }> }) {
  // 미리보기 메뉴판에서 '맞춤 상담'을 눌러 왔으면 인사 없이 주문 방식 질문부터
  const fromMenu = (await searchParams)?.consult === "1";
  // 첫 인사에 곁들일 매장 사진 — 인기·추천 상품부터 3장 (실제와 같은 기준)
  const photos = PREVIEW_PRODUCTS.filter((p) => p.image_url)
    .sort((a, b) => Number(b.is_popular || b.is_recommended) - Number(a.is_popular || a.is_recommended))
    .slice(0, 3)
    .map((p) => p.image_url as string);

  return (
    <>
    <PreviewStoreWelcome
      fromMenu={fromMenu}
      logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
      themeVars={PREVIEW_THEME_VARS}
      photos={photos}
      // 볼륨감 참고 이미지 예시 — 유형별로 정하는 값이라 꽃다발에만 4단계 (사진은 예시 꽃다발 사진을 가격 순으로 빌려 쓴다)
      sizeConfig={normalizeSizeConfig({
        byType: {
          꽃다발: [
            { name: "미니", price: 30000 },
            { name: "중형", price: 60000 },
            { name: "대형", price: 100000 },
            { name: "프리미엄", price: 200000 },
          ].map((t, i) => ({ ...t, image: VOLUME_EXAMPLE_IMAGES[i] ?? null })),
        },
      })}
      // 상품 유형은 꽃다발·꽃바구니·센터피스·화병꽂이만 (메뉴판 미리보기와 같게)
      productTypes={["꽃다발", "꽃바구니", "센터피스", "화병꽂이"]}
      products={PREVIEW_PRODUCTS.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        product_type: p.product_type,
        mood: p.mood,
        is_recommended: p.is_recommended,
        is_popular: p.is_popular,
      }))}
      // 판매자 정보는 예시 (메뉴판 미리보기와 같은 값)
      footer={{
        companyName: "Brand Name",
        phone: "02-123-4567",
        representativeName: "홍길동",
        businessNumber: "123-45-67890",
        mailOrderNumber: "2026-서울강남-01234",
        address: PREVIEW_STORE_ADDRESS,
      }}
    />
    {/* 첫 화면 설명 — 주문 방법 4가지 */}
    <WelcomeCoach />
    </>
  );
}
