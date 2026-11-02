import type { Metadata } from "next";
import { Suspense } from "react";
import PreviewProductsClient from "./_components/PreviewProductsClient";
import { PREVIEW_PRODUCTS, PREVIEW_STORE_ADDRESS, PREVIEW_THEME_VARS } from "../_mockStore";
import { brandFont } from "../brandFont";
import CustomerHomeCoach from "./CustomerHomeCoach";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

// 미리보기 매장 주소 — 메뉴판 안의 링크(/{slug}/consult, /{slug}/cart …)가 미리보기 안으로 이어진다
const PREVIEW_SLUG = "preview/customer";

// 손님 화면 미리보기 — 목업 매장(기본 색·목업 상품)으로 실제 메뉴판 컴포넌트를 그린다 (실제·데모 매장 데이터 없음)
export default function CustomerPreviewPage() {
  return (
    <Suspense>
      <PreviewProductsClient
        slug={PREVIEW_SLUG}
        companyName="Brand Name"
        logoImage={null}
        logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
        themeVars={PREVIEW_THEME_VARS}
        products={PREVIEW_PRODUCTS}
        // 상품 유형은 꽃다발·꽃바구니·센터피스·화병꽂이만 (조화·식물은 지운 상태)
        hiddenProductTypes={["조화", "식물"]}
        customProductTypes={[]}
        // 시즌 메뉴는 크리스마스만
        hiddenSeasons={["어버이날", "현장 판매"]}
        customSeasons={[]}
        consultEnabled
        // 판매자(사장님) 정보는 예시 — 플랫폼 운영자 정보는 실제 값이 그대로 나온다 (사장님 화면 미리보기 목업과 같은 값)
        phone="02-123-4567"
        representativeName="홍길동"
        businessNumber="123-45-67890"
        mailOrderNumber="2026-서울강남-01234"
        address={PREVIEW_STORE_ADDRESS}
      />
      <CustomerHomeCoach />
    </Suspense>
  );
}
