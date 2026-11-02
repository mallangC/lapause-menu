import type { Metadata } from "next";
import {
  PREVIEW_BUSINESS_HOURS, PREVIEW_CLOSED_DATES, PREVIEW_CONSULT_NOTICE, PREVIEW_DATE_OVERRIDES,
  PREVIEW_DELIVERY_FEES, PREVIEW_MIN_LEAD_TIMES, PREVIEW_PRICES, PREVIEW_STORE_ADDRESS, PREVIEW_THEME_VARS,
} from "../../../_mockStore";
import { brandFont } from "../../../brandFont";
import PreviewCheckoutClient from "../../_components/PreviewCheckoutClient";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ direct?: string }>;
}

// 손님 화면 미리보기 — 장바구니·바로 예약 주문서. 목업 매장 설정으로 실제 주문서를 그린다 (결제·주문 저장 없음)
export default async function PreviewCheckoutPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <PreviewCheckoutClient
      slug="preview/customer"
      companyName="Brand Name"
      logoImage={null}
      logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
      themeVars={PREVIEW_THEME_VARS}
      consultEnabled
      // 거리 계산(배송비)이 실제로 되도록 검색되는 주소
      storeAddress={PREVIEW_STORE_ADDRESS}
      deliveryEnabled
      deliveryFees={PREVIEW_DELIVERY_FEES}
      businessHours={PREVIEW_BUSINESS_HOURS}
      closedDates={PREVIEW_CLOSED_DATES}
      dateOverrides={PREVIEW_DATE_OVERRIDES}
      // 옵션은 장바구니 미리보기와 같게 모두 켜 두고, 가격은 목업 매장 설정
      shoppingBagEnabled
      shoppingBagPrice={PREVIEW_PRICES.shoppingBag}
      preservativeEnabled
      preservativePrice={PREVIEW_PRICES.preservative}
      messageCardEnabled
      messageCardPrice={PREVIEW_PRICES.messageCard}
      minLeadTimes={PREVIEW_MIN_LEAD_TIMES}
      // 사장님 안내 사항 예시 (맞춤주문 미리보기와 같은 문구)
      consultNotice={PREVIEW_CONSULT_NOTICE}
      direct={sp.direct === "1"}
    />
  );
}
