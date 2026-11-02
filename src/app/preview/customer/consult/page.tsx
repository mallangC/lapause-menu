import type { Metadata } from "next";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import {
  PREVIEW_BUSINESS_HOURS, PREVIEW_CLOSED_DATES, PREVIEW_DATE_OVERRIDES, PREVIEW_DELIVERY_FEES,
  PREVIEW_MIN_LEAD_TIMES, PREVIEW_PRICES, PREVIEW_PRODUCTS, PREVIEW_STORE_ADDRESS,
} from "../../_mockStore";
import { brandFont } from "../../brandFont";
import PreviewConsultClient from "../_components/PreviewConsultClient";
import ConsultCoach from "./ConsultCoach";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

// 손님 화면 미리보기 — 맞춤주문. 목업 매장 상품·설정으로 실제 맞춤주문 화면을 그린다 (결제·예약 저장 없음)
interface Props {
  searchParams: Promise<{ productId?: string; quantity?: string }>;
}

export default async function PreviewConsultPage({ searchParams }: Props) {
  const { productId, quantity } = await searchParams;
  // 실제 맞춤주문 페이지처럼 가격 오름차순
  const products = [...PREVIEW_PRODUCTS].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  // 상품 상세에서 1개로 예약하기를 누른 경우 — 실제처럼 그 상품이 골라진 상태로 시작한다
  const preselectedProduct = productId ? products.find((p) => p.id === productId) ?? null : null;

  return (
    <>
      <PreviewConsultClient
        key={`${productId ?? "none"}_${quantity ?? "1"}`}
        preselectedProduct={preselectedProduct}
        initialQuantity={quantity ? Math.max(1, parseInt(quantity) || 1) : 1}
        slug="preview/customer"
        companyName="Brand Name"
        logoImage={null}
        logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
        // 상품 유형은 꽃다발·꽃바구니·센터피스·화병꽂이만
        productTypeList={PRODUCT_TYPES.filter((t) => !["조화", "식물"].includes(t))}
        // 시즌 메뉴는 크리스마스만
        seasonList={SEASONS.filter((x) => x === "크리스마스")}
        notificationEmail={null}
        products={products}
        businessHours={PREVIEW_BUSINESS_HOURS}
        closedDates={PREVIEW_CLOSED_DATES}
        dateOverrides={PREVIEW_DATE_OVERRIDES}
        minLeadTimes={PREVIEW_MIN_LEAD_TIMES}
        // 사장님 안내 사항이 어떻게 보이는지 보여주기 위한 예시 문구
        consultNotice={"생화 특성상 계절에 나오는 꽃이 정해져있기 때문에 원하시는 꽃 종류를 맞춰드리기 어려워요.\n계절에 맞는 가장 예쁜 꽃으로, 고르신 분위기에 맞춰 정성껏 제작해 드릴게요."}
        // 거리 계산(배송비)이 실제로 되도록 검색되는 주소
        storeAddress={PREVIEW_STORE_ADDRESS}
        deliveryEnabled
        deliveryFees={PREVIEW_DELIVERY_FEES}
        // 옵션을 모두 보여주기 위해 켜 두고, 가격은 목업 매장 설정
        messageCardEnabled
        messageCardPrice={PREVIEW_PRICES.messageCard}
        shoppingBagEnabled
        shoppingBagPrice={PREVIEW_PRICES.shoppingBag}
        preservativeEnabled
        preservativePrice={PREVIEW_PRICES.preservative}
        isDemo
      />
      <ConsultCoach preselected={!!preselectedProduct} />
    </>
  );
}
