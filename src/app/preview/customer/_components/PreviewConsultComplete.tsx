"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types";
import OrderCompleteHeader from "@/components/OrderCompleteHeader";
import PreviewStoreHeader from "./PreviewStoreHeader";

export interface PreviewOrderSummary {
  product: Product | null;
  name: string;
  phone: string;
  deliveryType: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  desiredDate: string;
  desiredTime: string;
  messageCard: string;
  messageCardContent: string;
  shoppingBag: string;
  preservative: string;
  requests: string;
  messageCardCount: number;
  shoppingBagCount: number;
  preservativeCount: number;
  deliveryFee: number | null;
  finalPrice: number;
}

interface Props {
  slug: string;
  companyName: string;
  logoImage: string | null;
  logoNode?: React.ReactNode;
  productTypeList: string[];
  seasonList: string[];
  messageCardEnabled: boolean;
  messageCardPrice: number;
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  preservativeEnabled: boolean;
  preservativePrice: number;
  order: PreviewOrderSummary;
}

// 미리보기 맞춤주문 결제 완료 화면 — 실제 완료 화면과 같은 모양의 목업 (실제 예약은 만들지 않는다)
export default function PreviewConsultComplete({ slug, companyName, logoImage, logoNode, productTypeList, seasonList, messageCardEnabled, messageCardPrice, shoppingBagEnabled, shoppingBagPrice, preservativeEnabled, preservativePrice, order }: Props) {
  const { product: selectedProduct, name, phone, recipientName, recipientPhone, address, addressDetail, messageCardCount, shoppingBagCount, preservativeCount, deliveryFee } = order;
  const form = order;
  const finalPriceSnapshot = order.finalPrice;
  const restoredMsgCount = messageCardCount > 0 ? messageCardCount : (messageCardEnabled && form.messageCard === "추가" ? 1 : 0);
  const restoredBagCount = shoppingBagCount > 0 ? shoppingBagCount : (shoppingBagEnabled && form.shoppingBag === "추가" ? 1 : 0);
  const restoredPreservativeCount = preservativeCount > 0 ? preservativeCount : (preservativeEnabled && form.preservative === "추가" ? 1 : 0);
  const msgCardAmt  = messageCardEnabled ? restoredMsgCount * messageCardPrice : 0;
  const bagAmt      = shoppingBagEnabled && !selectedProduct?.bag_included ? restoredBagCount * shoppingBagPrice : 0;
  const preservativeAmt = preservativeEnabled ? restoredPreservativeCount * preservativePrice : 0;
  const deliveryAmt = form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0;
  const hasExtras   = msgCardAmt > 0 || bagAmt > 0 || preservativeAmt > 0 || deliveryAmt > 0;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex px-4 py-3.5 gap-4 border-t border-gray-50">
      <span className="text-sm text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</span>
    </div>
  );

  return (
    // 미리보기 — 아래 이동 바에 맨 아래 버튼이 가리지 않게 아래 여백을 더 둔다
    <div className="min-h-screen bg-gray-100 pb-16">
      <PreviewStoreHeader slug={slug} companyName={companyName} logoImage={logoImage} logoNode={logoNode} productTypeList={productTypeList} seasonList={seasonList} consultEnabled={true} />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">

        {/* 완료 헤더 (장바구니 결제 완료와 공통) */}
        <div data-coach="done-header">
          <OrderCompleteHeader />
        </div>

        {/* 주문 내용 — 코치마크가 한 번에 감싸도록 묶는다 */}
        <div className="space-y-3" data-coach="done-info">
        {/* 상품 정보 */}
        {selectedProduct && (
          <div className="bg-white rounded-2xl overflow-hidden">
            <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">상품 정보</p>
            <div className="flex items-center gap-3 px-4 py-4">
              {selectedProduct.image_url && (
                <Image src={selectedProduct.image_url} alt={selectedProduct.name} width={72} height={72} className="w-18 h-18 rounded-xl object-cover shrink-0" />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-gray-400">{selectedProduct.product_type}</p>
                <p className="text-base font-semibold text-gray-900">{selectedProduct.name}</p>
                <p className="text-base font-bold text-gold-500">{selectedProduct.price.toLocaleString()}원</p>
              </div>
            </div>
          </div>
        )}

        {/* 주문자 & 수령 정보 */}
        {/* data-coach — 모바일 설명이 '주문 정보' 카드만 강조 */}
        <div data-coach="done-order-info" className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">주문 정보</p>
          <Row label="주문자" value={`${name} · ${phone}`} />
          <Row label="수령 방법" value={form.deliveryType} />
          {form.deliveryType === "배송" && recipientName && (
            <>
              <Row label="받는 분" value={`${recipientName} · ${recipientPhone}`} />
              <Row label="배송지" value={`${address}${addressDetail ? ` ${addressDetail}` : ""}`} />
            </>
          )}
          <Row label="수령 날짜" value={form.desiredDate} />
          {form.desiredTime && <Row label="수령 시간" value={form.desiredTime} />}
          {msgCardAmt > 0 && <Row label="메시지 카드" value="추가" />}
          {form.messageCard === "추가" && form.messageCardContent && (
            <Row label="카드 내용" value={form.messageCardContent} />
          )}
          {bagAmt > 0 && <Row label="쇼핑백" value="추가" />}
          {preservativeAmt > 0 && <Row label="생화 수명연장제" value="추가" />}
          {form.requests && <Row label="요청 사항" value={form.requests} />}
        </div>

        {/* 결제 금액 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">결제 금액</p>
          <div className="px-4 py-4 space-y-3">
            {hasExtras && (
              <>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>상품</span>
                  <span>{(selectedProduct?.price ?? 0).toLocaleString()}원</span>
                </div>
                {msgCardAmt > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>메시지 카드 ×{restoredMsgCount}</span>
                    <span>+{msgCardAmt.toLocaleString()}원</span>
                  </div>
                )}
                {bagAmt > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>쇼핑백 ×{restoredBagCount}</span>
                    <span>+{bagAmt.toLocaleString()}원</span>
                  </div>
                )}
                {preservativeAmt > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>생화 수명연장제 ×{restoredPreservativeCount}</span>
                    <span>+{preservativeAmt.toLocaleString()}원</span>
                  </div>
                )}
                {deliveryAmt > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>배송비</span>
                    <span>+{deliveryAmt.toLocaleString()}원</span>
                  </div>
                )}
                <div className="border-t border-gray-100" />
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">총 결제금액</span>
              <span className="text-xl font-bold text-gold-500">{finalPriceSnapshot.toLocaleString()}원</span>
            </div>
          </div>
        </div>
        </div>

        <Link href={`/${slug}`} className="block text-center text-gold-500 text-base py-3 hover:text-gold-600 transition-colors">
          홈으로 돌아가기 →
        </Link>
      </div>
    </div>
  );
}
