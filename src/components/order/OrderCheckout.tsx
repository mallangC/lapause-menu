"use client";

import PriceTag from "@/components/PriceTag";
import StoreImage from "@/components/StoreImage";
import Link from "next/link";
import TossPaymentWidget from "@/components/TossPaymentWidget";
import { LazyDatePicker } from "@/components/LazyOrderInputs";
import { DeliverySection, MobilePayBox, OrderAgreements, OrdererSection, OwnerNoticeBox, PickupDateSection, PickupTimeSection, RequestsSection, SidePayBox, type PaymentProps } from "@/components/order/OrderSections";
import PreparedColorPicker, { PhotoOrderColorNotice } from "@/components/PreparedColorPicker";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import OrderCompleteHeader from "@/components/OrderCompleteHeader";
import { giftInfoText } from "@/components/GiftInfoStep";
import { formatPhone, parsePhone } from "@/lib/format";
import { PHOTO_PRODUCT_ID } from "@/lib/styleOrder";
import { ymd } from "./orderTypes";
import { useOrderCheckout, cartLineAmount, type OrderCheckoutProps } from "./useOrderCheckout";
import CheckoutOptions from "./CheckoutOptions";

// 주문 마지막 페이지 — 모든 주문 경로가 같은 화면을 쓴다
// · 상품 1개(single): 추천 주문 · 사장님 스타일 · 사진 주문 · 상품 상세 바로 예약(1개) → /api/reservation
// · 상품 여러 개(cart): 장바구니 · 상품 상세 바로 예약(2개 이상) → /api/order
// 입력값·금액·날짜/시간·결제·결제 복귀 처리는 useOrderCheckout(첫 화면 대화 주문과 함께 씀), 이 파일은 화면만 그린다.

export type { SingleOrder, CartOrder, CheckoutOrder } from "./useOrderCheckout";

export default function OrderCheckout(props: OrderCheckoutProps) {
  const {
    slug, companyName, notificationEmail = null, order: orderProp, returning, draftKey, header, stepBar, themeVars, initialRequests = "", onRestore, onPaid, emptyFallback, seasonalProductIds = [],
    businessHours, closedDates, dateOverrides = {}, minLeadTimes, consultNotice, storeAddress, deliveryEnabled, deliveryFees,
    messageCardEnabled, messageCardPrice, shoppingBagEnabled, shoppingBagPrice, preservativeEnabled, preservativePrice,
    todayColors, colorLeadDays, colorPickEnabled, colorMinPrice, afterHours, transferAvailable, isDemo,
  } = props;
  const c = useOrderCheckout(props);
  const {
    restoredOrder, setRestoredOrder, order, single, cart, product, quantity, isPhotoOrder, isStyleOrder, form, setForm, set, selectedDate, setSelectedDate, desiredDate, name, setName, phone, setPhone, recipientName, setRecipientName, recipientPhone, setRecipientPhone, address, setAddress, addressDetail, setAddressDetail, deliveryFee, setDeliveryFee, deliveryDistance, setDeliveryDistance, distanceLoading, setDistanceLoading, messageCardCount, setMessageCardCount, shoppingBagCount, setShoppingBagCount, preservativeCount, setPreservativeCount, messageCardContents, setMessageCardContents, privacyAgreed, setPrivacyAgreed, cancellationAgreed, setCancellationAgreed, noticeAgreed, setNoticeAgreed, paymentMethod, setPaymentMethod, cashReceipt, setCashReceipt, fe, setFe, clearFe, submitting, setSubmitting, error, setError, processing, setProcessing, done, setDone, widgetReady, setWidgetReady, widgetRef, paymentOrderId, photoData, setPhotoData, refNotice, refName, refPhone, refDeliveryType, refDeliveryInfo, refDate, refTime, refPayment, refAgreement, effMsg, effBag, effPreservative, optionPrices, checkedItems, msgCardAmt, bagAmt, preservativeAmt, goodsAmt, deliveryAmt, finalPrice, lines, hasSeasonal, colorMode, needsColor, photoNoColorNotice, colorAmount, pickAddress, dateAllowed, now, day, isToday, itemTypes, leadHours, minTimeDate, leadOverflow, leadStart, slots, extraSlots, restore, readDraft, send, finish, makeDraft, submit, confirm,
  } = c;

  const page = (children: React.ReactNode, withStepBar = true) => (
    <div className="min-h-screen bg-gray-100" style={themeVars as React.CSSProperties | undefined}>
      {header}
      {withStepBar && stepBar}
      {children}
    </div>
  );

  // ── 결제 처리 중 ──
  if (processing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4" style={themeVars as React.CSSProperties | undefined}>
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-gray-200 border-t-gold-500 animate-spin" />
          <div className="space-y-1.5">
            <p className="text-base font-medium text-gray-800">결제를 처리하고 있습니다</p>
            <p className="text-sm text-gray-400">잠시만 기다려주세요...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 ──
  if (done) {
    const d = done.draft;
    const o = d.order;
    const Row = ({ label, value }: { label: string; value: string }) => (
      <div className="flex px-4 py-3.5 gap-4 border-t border-gray-50">
        <span className="text-sm text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</span>
      </div>
    );
    const gift =
      o.kind === "cart"
        ? giftInfoText(o.gift)
        : giftInfoText({ purpose: o.taste.purpose, purposeCustom: o.taste.purposeCustom, recipientGender: o.taste.recipientGender, recipientAge: o.taste.recipientAge });
    const doneImage = o.kind === "single" ? (o.product.id === PHOTO_PRODUCT_ID ? photoData : o.product.image_url) : null;
    const cardContent = o.kind === "single" ? d.counts.messageCardContents.filter(Boolean).join("\n") || d.form.messageCardContent : "";
    return page(
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <OrderCompleteHeader transfer={done.transfer ? { ...done.transfer, amount: d.finalPrice } : null} />

        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">{o.kind === "single" ? "상품 정보" : "주문 상품"}</p>
          {o.kind === "single" ? (
            <div className="flex items-center gap-3 px-4 py-4">
              {doneImage && (
                // eslint-disable-next-line @next/next/no-img-element -- 찾아본 사진은 data URL이라 next/image 대신
                <img src={doneImage} alt={o.product.name} className="w-18 h-18 rounded-xl object-cover shrink-0" />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-gray-400">{o.product.product_type}</p>
                <p className="text-base font-semibold text-gray-900">{o.product.name}</p>
                <p><PriceTag price={o.product.price} original={o.product.original_price} size="md" /></p>
              </div>
            </div>
          ) : (
            o.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-t-0">
                {item.image_url && <StoreImage thumb src={item.image_url} alt={item.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.quantity}개
                    {item.bag_included ? " · 쇼핑백 포함 제품" : (item.shoppingBagCount ?? 0) > 0 ? ` · 쇼핑백 ${item.shoppingBagCount}개` : ""}
                    {(item.preservativeCount ?? 0) > 0 && ` · 수명연장제 ${item.preservativeCount}개`}
                    {(item.messageCardCount ?? 0) > 0 && ` · 메시지카드 ${item.messageCardCount}장`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{cartLineAmount(item, optionPrices).toLocaleString()}원</p>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">주문 정보</p>
          <Row label="주문자" value={`${d.name} · ${formatPhone(d.phone)}`} />
          <Row label="수령 방법" value={d.form.deliveryType} />
          {d.form.deliveryType === "배송" && d.recipientName && (
            <>
              <Row label="받는 분" value={`${d.recipientName} · ${formatPhone(d.recipientPhone)}`} />
              <Row label="배송지" value={`${d.address}${d.addressDetail ? ` ${d.addressDetail}` : ""}`} />
            </>
          )}
          <Row label="수령 날짜" value={d.form.desiredDate} />
          {d.form.desiredTime && <Row label="수령 시간" value={d.form.desiredTime} />}
          {d.form.preparedColor && <Row label="꽃 색상" value={d.form.preparedColor} />}
          {cardContent && <Row label="카드 내용" value={cardContent} />}
          {gift && <Row label="선물 정보" value={gift} />}
          {d.form.requests && <Row label="요청 사항" value={d.form.requests} />}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">결제 금액</p>
          <div className="px-4 py-4 space-y-3">
            {d.lines.length > 1 && (
              <>
                {d.lines.map((l) => (
                  <div key={l.label} className={`flex justify-between text-sm ${l.minus ? "text-red-500" : "text-gray-600"}`}>
                    <span>{l.label}</span>
                    <span>
                      {l.plus ? "+" : l.minus ? "-" : ""}
                      {l.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-100" />
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-gray-900">총 결제금액</span>
              <span className="text-xl font-bold text-gold-500">{d.finalPrice.toLocaleString()}원</span>
            </div>
          </div>
        </div>

        {/* 손님 주문 확인 페이지 — 진행 단계·매장 안내 */}
        {done.orderToken && (
          <Link href={`/${slug}/order/${done.orderToken}`} className="block w-full text-center py-3.5 rounded-2xl bg-gold-500 text-white text-base font-medium hover:bg-gold-600 transition-colors">
            주문 진행 확인하기
          </Link>
        )}
        <Link href={`/${slug}`} className="block text-center text-gold-500 text-base py-3 hover:text-gold-600 transition-colors">
          홈으로 돌아가기 →
        </Link>
      </div>,
      false
    );
  }

  // ── 주문할 것이 없을 때 (장바구니가 비었거나 상품을 찾지 못함) ──
  if (!order || (cart && cart.items.length === 0)) return <>{emptyFallback ?? null}</>;

  const agreements = (
    <OrderAgreements
      refEl={refAgreement}
      privacy={privacyAgreed}
      onPrivacy={(v) => { setPrivacyAgreed(v); clearFe("privacy"); }}
      cancellation={cancellationAgreed}
      onCancellation={(v) => { setCancellationAgreed(v); clearFe("cancellation"); }}
      errors={fe}
    />
  );
  const payment: PaymentProps = {
    method: paymentMethod,
    onMethod: (m) => setPaymentMethod(m),
    receipt: cashReceipt,
    onReceipt: (r) => {
      // 소득공제를 고르면 번호는 주문자 연락처로 미리 채운다
      setCashReceipt(r.type === "소득공제" && !r.number ? { ...r, number: parsePhone(phone) } : r);
      clearFe("receipt");
    },
    receiptError: fe.receipt,
    transferAvailable,
  };
  const payBox = { lines, total: finalPrice, payment, agreements, error, onConfirm: confirm, submitting, cardNotReady: !widgetReady };
  const productImage = isPhotoOrder ? photoData : product?.image_url ?? null;

  return page(
    <div className="max-w-5xl mx-auto px-4 py-5">
      <TossPaymentWidget ref={widgetRef} customerKey={paymentOrderId} amount={finalPrice} onReadyChange={setWidgetReady} onCancel={() => setSubmitting(false)} isDemo={isDemo} />
      <div className="flex flex-col md:flex-row md:gap-5">
        {/* ── 왼쪽: 주문서 ── */}
        <div className="flex-1 min-w-0 md:max-w-xl space-y-2 -mx-4 md:mx-0">
          {consultNotice && (
            <OwnerNoticeBox refEl={refNotice} notice={consultNotice} agreed={noticeAgreed} onAgree={(v) => { setNoticeAgreed(v); clearFe("notice"); }} error={fe.notice} />
          )}

          <OrdererSection
            name={name}
            phone={phone}
            onName={(v) => { setName(v); clearFe("name"); }}
            onPhone={(v) => { setPhone(v); clearFe("phone"); }}
            errors={fe}
            refName={refName}
            refPhone={refPhone}
          />

          {/* 주문 상품 */}
          {single && product ? (
            <div className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">상품 정보</h3>
              <div className="flex items-center gap-4">
                {productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 찾아본 사진은 data URL이라 next/image 대신
                  <img src={productImage} alt={product.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                ) : isPhotoOrder ? (
                  // 찾아본 사진을 불러오는 동안 같은 자리를 비워 둔다 (글자가 밀리지 않게)
                  <div className="w-20 h-20 rounded-xl bg-beige-200 shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs text-gray-400">{product.product_type}</p>
                  <p className="text-sm font-medium text-gray-900 leading-snug">{product.name}</p>
                  <p className="pt-1"><PriceTag price={product.price} original={product.original_price} size="sm" /></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">주문 상품 ({checkedItems.length})</h3>
              {checkedItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.image_url && <StoreImage thumb src={item.image_url} alt={item.name} width={52} height={52} className="w-13 h-13 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.product_type}</p>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity}개
                      {item.bag_included ? " · 쇼핑백 포함 제품" : (item.shoppingBagCount ?? 0) > 0 && shoppingBagEnabled ? ` · 쇼핑백 ${item.shoppingBagCount}개` : ""}
                      {(item.preservativeCount ?? 0) > 0 && preservativeEnabled && ` · 수명연장제 ${item.preservativeCount}개`}
                      {(item.messageCardCount ?? 0) > 0 && messageCardEnabled && ` · 메시지카드 ${item.messageCardCount}장`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">{cartLineAmount(item, optionPrices).toLocaleString()}원</p>
                </div>
              ))}
            </div>
          )}

          <DeliverySection
            deliveryEnabled={deliveryEnabled}
            value={form.deliveryType}
            onChange={(v) => {
              set("deliveryType", v);
              clearFe("deliveryType");
              // 배송은 오늘 받을 수 없다 — 오늘을 골라 둔 상태면 날짜를 다시 고르게
              if (v === "배송" && selectedDate && ymd(selectedDate) === ymd(new Date())) {
                setSelectedDate(null);
                set("desiredTime", "");
              }
            }}
            recipientName={recipientName}
            onRecipientName={(v) => { setRecipientName(v); clearFe("deliveryInfo"); }}
            recipientPhone={recipientPhone}
            onRecipientPhone={(v) => { setRecipientPhone(v); clearFe("deliveryInfo"); }}
            address={address}
            onAddress={pickAddress}
            addressDetail={addressDetail}
            onAddressDetail={setAddressDetail}
            storeAddress={storeAddress}
            distance={{ loading: distanceLoading, km: deliveryDistance, fee: deliveryFee }}
            errors={fe}
            refType={refDeliveryType}
            refInfo={refDeliveryInfo}
          />

          <PickupDateSection refEl={refDate}>
            <div className="large-datepicker overflow-hidden">
              <LazyDatePicker
                locale="ko"
                inline
                selected={selectedDate}
                onChange={(date: Date | null) => {
                  setSelectedDate(date);
                  set("desiredTime", "");
                  clearFe("date");
                }}
                minDate={new Date()}
                maxDate={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  return d;
                })()}
                filterDate={dateAllowed}
              />
            </div>
            {/* 받는 날에 맞춰 바로 아래에서 꽃 색 고르기 */}
            {needsColor && (
              <PreparedColorPicker
                mode={colorMode!}
                todayColors={todayColors}
                value={form.preparedColor}
                onChange={(v) => { set("preparedColor", v); clearFe("color"); }}
                error={fe.color}
                hasPhoto={single ? !!productImage || isPhotoOrder : true}
                minPrice={colorMinPrice}
                amount={colorAmount}
                photoOrder={isPhotoOrder}
              />
            )}
            {photoNoColorNotice && <PhotoOrderColorNotice />}
          </PickupDateSection>

          <PickupTimeSection refEl={refTime} error={fe.time} day={day} dateSelected={!!selectedDate} hasSlots={slots.length > 0 || extraSlots.length > 0}>
            {/* 영업시간·영업시간 외 시간을 한 격자에 합쳐서 (영업시간 외는 점선) */}
            <TimeSlotGrid
              slots={slots}
              extraSlots={extraSlots}
              afterHoursNote={c.extraNote}
              extraLabel={c.extraLabel}
              value={form.desiredTime}
              onSelect={(slot) => { set("desiredTime", slot); clearFe("time"); }}
              error={fe.time}
            />
          </PickupTimeSection>

          {/* 추가 옵션 — 상품 1개 주문만 (여러 개는 장바구니에서 상품마다 정한다) */}
          {single && (<>
                <CheckoutOptions
                  c={c}
                  messageCardEnabled={messageCardEnabled}
                  messageCardPrice={messageCardPrice}
                  shoppingBagEnabled={shoppingBagEnabled}
                  shoppingBagPrice={shoppingBagPrice}
                  preservativeEnabled={preservativeEnabled}
                  preservativePrice={preservativePrice}
                />

          </>)}

          <RequestsSection value={form.requests} onChange={(v) => set("requests", v)} />

          {/* 모바일: 결제 방법 · 결제 금액 · 동의 · 버튼 (PC는 오른쪽 결제 상자) */}
          <MobilePayBox {...payBox} refPayment={refPayment} />
        </div>

        {/* ── 오른쪽: 따라오는 결제 상자 (PC) ── */}
        <SidePayBox {...payBox} />
      </div>
    </div>
  );
}
