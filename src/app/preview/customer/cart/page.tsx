import type { Metadata } from "next";
import type { CartItem } from "@/hooks/useCart";
import { PREVIEW_PRICES, PREVIEW_PRODUCTS, PREVIEW_THEME_VARS } from "../../_mockStore";
import { brandFont } from "../../brandFont";
import PreviewCartClient from "../_components/PreviewCartClient";
import CartCoach from "./CartCoach";

export const metadata: Metadata = {
  title: "손님 화면 미리보기 | Flo.Aide",
  robots: { index: false },
};

// 손님 화면 미리보기 — 장바구니. 목업 상품 2개가 담겨 있고, 첫 상품은 메시지 카드까지 골라둔 상태로 시작한다
interface Props {
  searchParams: Promise<{ direct?: string; productId?: string; quantity?: string }>;
}

export default async function PreviewCartPage({ searchParams }: Props) {
  const sp = await searchParams;

  // ?direct=1 — 상품 상세에서 수량 2개 이상으로 바로 예약한 화면: 고른 상품 하나만, 옵션 없이 시작
  const directProduct = sp.direct === "1" ? PREVIEW_PRODUCTS.find((p) => p.id === sp.productId) ?? null : null;
  const direct = !!directProduct;
  const directQty = Math.max(1, parseInt(sp.quantity ?? "1") || 1);

  const picks = directProduct ? [directProduct] : PREVIEW_PRODUCTS.filter((p) => p.price && p.image_url).slice(0, 2);

  const initialItems: CartItem[] = picks.map((p, i) => ({
    productId: p.id,
    name: p.name,
    price: p.price ?? 0,
    image_url: p.image_url ?? null,
    product_type: p.product_type,
    bag_included: p.bag_included ?? false,
    quantity: direct ? directQty : 1,
    shoppingBagCount: 0,
    preservativeCount: 0,
    messageCardCount: !direct && i === 0 ? 1 : 0,
    messageCardContents: !direct && i === 0 ? ["생일 축하해! 🎉\n오늘 하루 꽃처럼 행복하길 바라"] : [],
    checked: true,
  }));

  return (
    <>
      <PreviewCartClient
        slug="preview/customer"
        initialItems={initialItems}
        direct={direct}
        initialExpanded={direct ? null : initialItems[0]?.productId ?? null}
        companyName="Brand Name"
        logoImage={null}
        logoNode={<span className={`${brandFont.className} text-[22px] md:text-[30px] text-gray-900 tracking-wide`}>Brand Name</span>}
        themeVars={PREVIEW_THEME_VARS}
        consultEnabled
        // 옵션을 모두 보여주기 위해 켜 두고, 가격은 목업 매장 설정
        shoppingBagEnabled
        shoppingBagPrice={PREVIEW_PRICES.shoppingBag}
        preservativeEnabled
        preservativePrice={PREVIEW_PRICES.preservative}
        messageCardEnabled
        messageCardPrice={PREVIEW_PRICES.messageCard}
      />
      {/* 코치마크는 장바구니 설명용 (바로 예약 화면에는 띄우지 않는다) */}
      {!direct && <CartCoach />}
    </>
  );
}
