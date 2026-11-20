"use client";

import { useState } from "react";
import Link from "next/link";
import StoreHeader from "@/components/main/StoreHeader";
import GiftInfoStep, { EMPTY_GIFT_INFO, OrderStepBar, type GiftInfo } from "@/components/GiftInfoStep";
import OrderCheckout from "@/components/order/OrderCheckout";
import { preloadOrderInputs } from "@/components/LazyOrderInputs";
import { useCart } from "@/hooks/useCart";
import type { DateOverrides } from "@/lib/businessHours";
import type { AfterHours, Unattended } from "@/lib/afterHours";
import { useEffect } from "react";

// 장바구니 결제 · 상품 상세 바로 예약(2개 이상)
// 1단계 선물 정보 → 2단계 주문 마지막 페이지 (모든 주문 경로가 같은 결제 화면 OrderCheckout을 쓴다)

interface DayHours { closed: boolean; open: string; close: string; }

interface CheckoutClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  consultEnabled: boolean;
  storeAddress: string | null;
  deliveryEnabled: boolean;
  deliveryFees: Record<string, number>;
  businessHours: Record<string, DayHours>;
  closedDates: string[];
  dateOverrides?: DateOverrides;
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  preservativeEnabled: boolean;
  preservativePrice: number;
  messageCardEnabled: boolean;
  messageCardPrice: number;
  notificationEmail: string | null;
  /** 상품 유형별 최소 준비 시간(시간) — 맞춤주문과 같은 기준, 미설정이면 2시간 */
  minLeadTimes: Record<string, number>;
  /** 사장님 안내 사항 — 있으면 확인 체크를 받아야 결제할 수 있다 */
  consultNotice: string | null;
  /** 오늘 매장에 있는 꽃 색상 (사장님이 오늘 알려준 경우만) */
  todayColors: string[];
  /** 색 맞춤 가능 일수 */
  colorLeadDays: number;
  /** 오늘 꽃 색상 기능을 켰는지 (끄면 색을 고르지 않는다) */
  colorPickEnabled?: boolean;
  /** 색 맞춤 최소 금액 (상품 금액 기준, 0이면 제한 없음) */
  colorMinPrice?: number;
  /** 영업시간 외 수령 가능 범위 (꺼져 있으면 범위 없음) */
  afterHours: AfterHours;
  /** 무통장 입금를 받을 수 있는지 (매장 계좌가 등록돼 있을 때) */
  transferAvailable: boolean;
  /** 상품 상세 바로 예약(수량 2개 이상) — 장바구니 대신 바로 예약 저장소를 쓰고 주문 경로를 product_detail로 남긴다 */
  direct: boolean;
  isDemo: boolean;
  initialPaymentKey: string | null;
  initialOrderId: string | null;
  initialAmount: number | null;
  failCode: string | null;
  failMessage: string | null;
  /** 시즌이 걸린 상품 id — 꽃 색을 고르지 않는다 */
  seasonalProductIds?: string[];
  instantProductIds?: string[];
  unattended?: Unattended;
}

export default function CheckoutClient(p: CheckoutClientProps) {
  const { slug, direct, initialPaymentKey, initialOrderId, failCode } = p;
  const { items: cartItems, clearCart } = useCart(slug, direct ? "direct" : "cart");
  const checkedItems = cartItems.filter((i) => i.checked);
  // 결제창에서 돌아오는 중 — 1단계를 건너뛰고 바로 결제 화면 (보관해 둔 주문서는 결제 화면이 읽는다)
  const returning = !!(initialPaymentKey || initialOrderId || failCode);
  const [gift, setGift] = useState<GiftInfo>(EMPTY_GIFT_INFO);
  // 1단계 선물 정보(맞춤주문 1단계와 같은 화면) → 2단계 주문 마지막 페이지
  const [orderStep, setOrderStep] = useState<1 | 2>(returning ? 2 : 1);
  const goStep = (n: 1 | 2) => {
    setOrderStep(n);
    window.scrollTo(0, 0);
  };

  // 1단계를 보는 동안 2단계 달력·주소 검색을 미리 받아 둔다
  useEffect(() => { preloadOrderInputs(); }, []);

  const header = <StoreHeader slug={slug} companyName={p.companyName} logoImage={p.logoImage} productTypeList={[]} seasonList={[]} consultEnabled={p.consultEnabled} />;
  const empty = (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4" style={p.themeVars}>
      <p className="text-gray-400">선택된 상품이 없습니다.</p>
      {direct ? (
        <Link href={`/${slug}/menu`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">상품 보러가기</Link>
      ) : (
        <Link href={`/${slug}/cart`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">장바구니로 돌아가기</Link>
      )}
    </div>
  );

  if (orderStep === 1) {
    if (checkedItems.length === 0) return empty;
    return (
      <div className="min-h-screen bg-gray-100" style={p.themeVars}>
        {header}
        <OrderStepBar step={1} onBack={() => goStep(1)} />
        <div className="max-w-2xl mx-auto px-4 py-5">
          <GiftInfoStep value={gift} onChange={setGift} onNext={() => goStep(2)} />
        </div>
      </div>
    );
  }

  return (
    <OrderCheckout
      slug={slug}
      companyName={p.companyName}
      notificationEmail={p.notificationEmail}
      // 상품이 없으면(장바구니가 비었으면) 결제 화면이 빈 화면을 보여준다 — 결제가 끝나 장바구니를 비운 뒤엔 완료 화면을 그대로 둔다
      order={{ kind: "cart", items: checkedItems, gift, orderPath: direct ? "product_detail" : "cart" }}
      returning={returning}
      // 결제 복귀용 임시 저장 — 장바구니 결제와 바로 예약 결제가 서로 섞이지 않게 나눈다
      draftKey={`${direct ? "direct" : "cart"}_checkout_draft_${slug}`}
      header={header}
      stepBar={<OrderStepBar step={2} onBack={() => goStep(1)} />}
      themeVars={p.themeVars}
      onRestore={(o) => { if (o.kind === "cart") setGift(o.gift); }}
      onPaid={clearCart}
      emptyFallback={empty}
      businessHours={p.businessHours}
      closedDates={p.closedDates}
      dateOverrides={p.dateOverrides}
      minLeadTimes={p.minLeadTimes}
      consultNotice={p.consultNotice}
      storeAddress={p.storeAddress}
      deliveryEnabled={p.deliveryEnabled}
      deliveryFees={p.deliveryFees}
      messageCardEnabled={p.messageCardEnabled}
      messageCardPrice={p.messageCardPrice}
      shoppingBagEnabled={p.shoppingBagEnabled}
      shoppingBagPrice={p.shoppingBagPrice}
      preservativeEnabled={p.preservativeEnabled}
      preservativePrice={p.preservativePrice}
      todayColors={p.todayColors}
      colorLeadDays={p.colorLeadDays}
      colorPickEnabled={p.colorPickEnabled ?? true}
      colorMinPrice={p.colorMinPrice ?? 0}
      afterHours={p.afterHours}
      transferAvailable={p.transferAvailable}
      isDemo={p.isDemo}
      seasonalProductIds={p.seasonalProductIds}
      instantProductIds={p.instantProductIds}
      unattended={p.unattended}
    />
  );
}
