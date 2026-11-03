"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { LazyDatePicker, LazyDaumPostcode, preloadOrderInputs } from "@/components/LazyOrderInputs";
import PreviewStoreHeader from "./PreviewStoreHeader";
import PreviewPolicyLink from "./PreviewPolicyLink";
import CheckoutCoach from "../cart/checkout/CheckoutCoach";
import { PREVIEW_CHECKOUT_KEY } from "./PreviewCartClient";
import OrderCompleteHeader from "@/components/OrderCompleteHeader";
import AgreementCheckbox from "@/components/AgreementCheckbox";
import GiftInfoStep, { EMPTY_GIFT_INFO, OrderStepBar, giftInfoText, type GiftInfo } from "@/components/GiftInfoStep";
import type { CartItem } from "@/hooks/useCart";
import { formatPhone, parsePhone } from "@/lib/format";
import { resolveDayHours, type DateOverrides } from "@/lib/businessHours";

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
  /** 상품 유형별 최소 준비 시간(시간) — 맞춤주문과 같은 기준, 미설정이면 2시간 */
  minLeadTimes: Record<string, number>;
  /** 사장님 안내 사항 — 있으면 확인 체크를 받아야 결제할 수 있다 */
  consultNotice: string | null;
  /** 상품 상세 바로 예약(수량 2개 이상)에서 왔는지 — 상품이 없을 때 돌아갈 곳만 다르다 */
  direct: boolean;
  logoNode?: React.ReactNode;
}

async function geocodeKakao(address: string) {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDeliveryFee(km: number, fees: Record<string, number>): number | null {
  const key = km <= 1 ? "0-1" : km <= 3 ? "1-3" : km <= 5 ? "3-5" : km <= 10 ? "5-10" : km <= 15 ? "10-15" : km <= 20 ? "15-20" : null;
  if (!key) return null;
  return fees[key] ?? null;
}

// 미리보기 주문서 — 실제 CheckoutClient 복사본. 결제·주문 저장 없이 입력한 내용으로 완료 화면(목업)을 보여준다
export default function PreviewCheckoutClient({
  slug, companyName, logoImage, themeVars, consultEnabled,
  storeAddress, deliveryEnabled, deliveryFees,
  businessHours, closedDates, dateOverrides = {},
  shoppingBagEnabled, shoppingBagPrice, preservativeEnabled, preservativePrice, messageCardEnabled, messageCardPrice,
  minLeadTimes, consultNotice, direct, logoNode,
}: CheckoutClientProps) {
  // 미리보기 장바구니(또는 바로 예약)에서 넘겨준 상품 — 실제 장바구니 저장소는 쓰지 않는다
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { setCartItems(JSON.parse(sessionStorage.getItem(PREVIEW_CHECKOUT_KEY) ?? "[]")); } catch { /* 저장소 막힘 */ }
    setLoaded(true);
  }, []);

  // 1단계를 보는 동안 2단계 달력·주소 검색을 미리 받아 둔다
  useEffect(() => { preloadOrderInputs(); }, []);

  // 미리보기 — 주문자·배송 정보는 예시 값으로 미리 채워 둔다 (맞춤주문 미리보기와 같은 값)
  const [name, setName] = useState("홍길동");
  const [phone, setPhone] = useState("010-1234-5678");
  // 배송을 미리 골라 둔다 — 코치마크가 수령 방법을 설명할 때 화면이 펼쳐지며 흔들리지 않게
  const [deliveryType, setDeliveryType] = useState("배송");
  const [recipientName, setRecipientName] = useState("국영수");
  const [recipientPhone, setRecipientPhone] = useState("010-5678-1234");
  const [address, setAddress] = useState("서울 강남구 강남대로 484");
  const [addressDetail, setAddressDetail] = useState("10층");
  const [showPostcode, setShowPostcode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [desiredTime, setDesiredTime] = useState("");
  const [requests, setRequests] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [gift, setGift] = useState<GiftInfo>(EMPTY_GIFT_INFO);
  // 1단계 선물 정보(맞춤주문 1단계와 같은 화면) → 2단계 예약 확인(주문서)
  const [orderStep, setOrderStep] = useState<1 | 2>(1);
  const goStep = (n: 1 | 2) => { setOrderStep(n); window.scrollTo(0, 0); };
  const refNotice = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const refName = useRef<HTMLDivElement>(null);
  const refPhone = useRef<HTMLDivElement>(null);
  const refDeliveryType = useRef<HTMLDivElement>(null);
  const refDeliveryInfo = useRef<HTMLDivElement>(null);
  const refDate = useRef<HTMLDivElement>(null);
  const refTime = useRef<HTMLDivElement>(null);
  const refAgreement = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [finalPriceSnapshot, setFinalPriceSnapshot] = useState(0);
  const [submittedItems, setSubmittedItems] = useState<CartItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  const checkedItems = cartItems.filter((i) => i.checked);

  const desiredDate = selectedDate
    ? selectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim()
    : "";

  const itemsTotal = checkedItems.reduce((sum, i) => {
    let p = i.price * i.quantity;
    if (!i.bag_included) p += shoppingBagPrice * (i.shoppingBagCount ?? 0);
    p += preservativePrice * (i.preservativeCount ?? 0);
    p += messageCardPrice * (i.messageCardCount ?? 0);
    return sum + p;
  }, 0);
  const finalPrice = itemsTotal + (deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0);

  const isDateDisabled = (date: Date) => {
    const hours = businessHours[String(date.getDay())];
    if (hours?.closed) return true;
    const formatted = date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim();
    if (closedDates.includes(formatted)) return true;
    return false;
  };

  useEffect(() => {
    if (deliveryType !== "배송" || !address || !storeAddress) { setDeliveryFee(null); setDeliveryDistance(null); return; }
    const timer = setTimeout(async () => {
      setDistanceLoading(true);
      const [storeCo, custCo] = await Promise.all([geocodeKakao(storeAddress), geocodeKakao(address)]);
      if (storeCo && custCo) {
        const km = haversineKm(storeCo.lat, storeCo.lng, custCo.lat, custCo.lng);
        setDeliveryDistance(km);
        setDeliveryFee(getDeliveryFee(km, deliveryFees));
      }
      setDistanceLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [address, deliveryType, storeAddress, deliveryFees]);

  // 미리보기 — 결제·주문 저장 없이 완료 화면으로
  const handleSubmit = () => {
    setSubmittedItems(checkedItems);
    setFinalPriceSnapshot(finalPrice);
    setSubmitted(true);
    window.scrollTo(0, 0);
  };

  const handleConfirm = () => {
    const fe: Record<string, boolean> = {};
    if (consultNotice && !noticeAgreed) fe.notice = true;
    if (!name) fe.name = true;
    if (parsePhone(phone).length < 10) fe.phone = true;
    if (!deliveryType) fe.deliveryType = true;
    if (deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) fe.deliveryInfo = true;
    if (!desiredDate) fe.date = true;
    if (desiredDate && !desiredTime) fe.time = true;
    if (!privacyAgreed) fe.privacy = true;
    if (!cancellationAgreed) fe.cancellation = true;

    if (Object.keys(fe).length > 0) {
      setFieldErrors(fe);
      const firstRef = fe.notice ? refNotice : fe.name ? refName : fe.phone ? refPhone : fe.deliveryType ? refDeliveryType : fe.deliveryInfo ? refDeliveryInfo : fe.date ? refDate : fe.time ? refTime : refAgreement;
      firstRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFieldErrors({});
    setErrors([]);
    handleSubmit();
  };

  if (submitted) {
    const deliveryAmt = deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0;
    // 결제 금액 내역 — 맞춤 주문 완료 화면처럼 상품·옵션·배송비를 나눠 보여준다 (금액 계산은 결제 화면과 동일)
    const productsAmt = submittedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const msgCardCount = submittedItems.reduce((s, i) => s + (i.messageCardCount ?? 0), 0);
    const bagCount = submittedItems.reduce((s, i) => s + (!i.bag_included ? (i.shoppingBagCount ?? 0) : 0), 0);
    const preservativeCnt = submittedItems.reduce((s, i) => s + (i.preservativeCount ?? 0), 0);
    const msgCardAmt = msgCardCount * messageCardPrice;
    const bagAmt = bagCount * shoppingBagPrice;
    const preservativeAmt = preservativeCnt * preservativePrice;
    const hasExtras = msgCardAmt > 0 || bagAmt > 0 || preservativeAmt > 0 || deliveryAmt > 0;
    const Row = ({ label, value }: { label: string; value: string }) => (
      <div className="flex px-4 py-3.5 gap-4 border-t border-gray-50">
        <span className="text-sm text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</span>
      </div>
    );
    return (
      // 미리보기 — 아래 이동 바에 맨 아래 버튼이 가리지 않게 아래 여백을 더 둔다
      <div className="min-h-screen bg-gray-100 pb-16" style={themeVars}>
        <PreviewStoreHeader slug={slug} companyName={companyName} logoImage={logoImage} logoNode={logoNode} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
          {/* 완료 헤더 (맞춤 주문 결제 완료와 공통) */}
          <div data-coach="done-header">
            <OrderCompleteHeader />
          </div>

          {/* 주문 내용 — 코치마크가 한 번에 감싸 설명한다 */}
          <div className="space-y-3" data-coach="done-info">
          <div className="bg-white rounded-2xl overflow-hidden">
            <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">주문 상품</p>
            {submittedItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-t-0">
                {item.image_url && <Image src={item.image_url} alt={item.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.quantity}개
                    {item.bag_included ? " · 쇼핑백 포함 제품" : (item.shoppingBagCount ?? 0) > 0 ? ` · 쇼핑백 ${item.shoppingBagCount}개` : ""}
                    {(item.preservativeCount ?? 0) > 0 && ` · 수명연장제 ${item.preservativeCount}개`}
                    {(item.messageCardCount ?? 0) > 0 && ` · 메시지카드 ${item.messageCardCount}장`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  {(item.price * item.quantity + (!item.bag_included ? shoppingBagPrice * (item.shoppingBagCount ?? 0) : 0) + preservativePrice * (item.preservativeCount ?? 0) + messageCardPrice * (item.messageCardCount ?? 0)).toLocaleString()}원
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">주문 정보</p>
            <Row label="주문자" value={`${name} · ${phone}`} />
            <Row label="수령 방법" value={deliveryType} />
            {deliveryType === "배송" && recipientName && (
              <>
                <Row label="받는 분" value={`${recipientName} · ${recipientPhone}`} />
                <Row label="배송지" value={`${address}${addressDetail ? ` ${addressDetail}` : ""}`} />
              </>
            )}
            <Row label="수령 날짜" value={desiredDate} />
            {desiredTime && <Row label="수령 시간" value={desiredTime} />}
            {giftInfoText(gift) && <Row label="선물 정보" value={giftInfoText(gift)} />}
            {requests && <Row label="요청 사항" value={requests} />}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">결제 금액</p>
            <div className="px-4 py-4 space-y-3">
              {hasExtras && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>상품</span><span>{productsAmt.toLocaleString()}원</span>
                  </div>
                  {msgCardAmt > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>메시지 카드 ×{msgCardCount}</span><span>+{msgCardAmt.toLocaleString()}원</span>
                    </div>
                  )}
                  {bagAmt > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>쇼핑백 ×{bagCount}</span><span>+{bagAmt.toLocaleString()}원</span>
                    </div>
                  )}
                  {preservativeAmt > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>생화 수명연장제 ×{preservativeCnt}</span><span>+{preservativeAmt.toLocaleString()}원</span>
                    </div>
                  )}
                  {deliveryAmt > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>배송비</span><span>+{deliveryAmt.toLocaleString()}원</span>
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
        <CheckoutCoach direct={direct} step="done" />
      </div>
    );
  }

  if (!loaded) return <div className="min-h-screen bg-gray-100" style={themeVars} />;

  if (checkedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4" style={themeVars}>
        <p className="text-gray-400">선택된 상품이 없습니다.</p>
        {direct ? (
          <Link href={`/${slug}`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">상품 보러가기</Link>
        ) : (
          <Link href={`/${slug}/cart`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">장바구니로 돌아가기</Link>
        )}
      </div>
    );
  }

  const now = new Date();
  const dayInfo = selectedDate ? resolveDayHours(selectedDate, businessHours, dateOverrides) : null;
  const isToday = selectedDate
    ? selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate()
    : false;
  // 최소 준비 시간 — 주문 상품 유형 중 가장 오래 걸리는 것 기준 (맞춤주문과 같은 설정, 미설정이면 2시간)
  const leadHours = Math.max(0, ...checkedItems.map((i) => minLeadTimes[i.product_type] ?? 2));
  const minTimeDate = isToday ? new Date(now.getTime() + leadHours * 60 * 60000) : null;
  // 준비 시간을 더했더니 다음 날로 넘어가면 오늘 슬롯은 없음 — 맞춤 주문(ConsultClient)과 같은 처리.
  // 이걸 안 하면 다음 날 00:xx를 기준으로 계산돼 이미 지난 오늘 영업시간이 전부 선택 가능해진다.
  const leadOverflow = !!minTimeDate && minTimeDate.getDate() !== now.getDate();
  const roundedMinutes = minTimeDate ? Math.ceil(minTimeDate.getMinutes() / 30) * 30 : 0;
  const adjustedHour = minTimeDate ? minTimeDate.getHours() + (roundedMinutes === 60 ? 1 : 0) : 0;
  const adjustedMinute = roundedMinutes === 60 ? 0 : roundedMinutes;
  const minTime = minTimeDate ? `${String(adjustedHour).padStart(2, "0")}:${String(adjustedMinute).padStart(2, "0")}` : dayInfo?.open ?? "00:00";
  const [minH, minM] = minTime.split(":").map(Number);
  const [maxH, maxM] = (dayInfo?.close ?? "23:59").split(":").map(Number);
  const timeSlots: string[] = [];
  if (selectedDate && dayInfo && !dayInfo.closed && !leadOverflow) {
    const [openH, openM] = dayInfo.open.split(":").map(Number);
    const startTotal = Math.max(minH * 60 + minM, openH * 60 + openM);
    const maxTotal = maxH * 60 + maxM;
    for (let t = startTotal; t <= maxTotal; t += 30) {
      timeSlots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
  }

  const agreementJsx = (
    <div ref={refAgreement} className="space-y-4">
      <label className={`flex items-start gap-3 text-sm cursor-pointer ${fieldErrors.privacy ? "text-red-500" : "text-gray-500"}`}>
        <AgreementCheckbox checked={privacyAgreed} onChange={(v) => { setPrivacyAgreed(v); if (fieldErrors.privacy) setFieldErrors(p => ({ ...p, privacy: false })); }} />
        <span><PreviewPolicyLink label="개인정보처리방침" />에 동의합니다. <span className="text-red-400">*</span></span>
      </label>
      <label data-coach="checkout-agree" className={`flex items-start gap-3 text-sm cursor-pointer ${fieldErrors.cancellation ? "text-red-500" : "text-gray-500"}`}>
        <AgreementCheckbox checked={cancellationAgreed} onChange={(v) => { setCancellationAgreed(v); if (fieldErrors.cancellation) setFieldErrors(p => ({ ...p, cancellation: false })); }} />
        <span>제작 착수 후 취소·환불 불가. <PreviewPolicyLink label="환불 정책" /> 동의 <span className="text-red-400">*</span></span>
      </label>
      <p className="text-xs text-gray-400">주문이 확정되거나 취소되면 입력하신 번호로 카카오톡 알림톡을 보내드립니다.</p>
    </div>
  );

  return (
    // 미리보기 — 결제 단계는 아래 이동 바(처음·손님 홈·설명 다시 보기)에 결제 버튼이 가리지 않게 아래 여백을 더 둔다
    <div className={`min-h-screen bg-gray-100 ${orderStep === 2 ? "pb-16" : ""}`} style={themeVars}>
      <PreviewStoreHeader slug={slug} companyName={companyName} logoImage={logoImage} logoNode={logoNode} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />
      <OrderStepBar step={orderStep} onBack={() => goStep(1)} />
      <CheckoutCoach key={orderStep} direct={direct} step={orderStep} />
      {orderStep === 1 ? (
        <div className="max-w-2xl mx-auto px-4 py-5">
          <GiftInfoStep value={gift} onChange={setGift} onNext={() => goStep(2)} />
        </div>
      ) : (
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row md:gap-5">

          {/* ── 왼쪽: 폼 영역 ── */}
          <div className="flex-1 min-w-0 md:max-w-xl space-y-2 -mx-4 md:mx-0">

            {/* 사장님 안내 사항 */}
            {consultNotice && (
              <div ref={refNotice} data-coach="checkout-notice" className={`rounded-xl px-4 py-3 border ${fieldErrors.notice ? "border-red-300 bg-red-50" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${fieldErrors.notice ? "text-red-700" : "text-amber-800"}`}>{consultNotice}</p>
                <label className={`flex items-center gap-2 mt-3 text-sm cursor-pointer ${fieldErrors.notice ? "text-red-500 font-medium" : "text-amber-700"}`}>
                  <AgreementCheckbox checked={noticeAgreed} onChange={(v) => { setNoticeAgreed(v); if (fieldErrors.notice) setFieldErrors(p => ({ ...p, notice: false })); }} />
                  <span>안내 사항을 확인했습니다. <span className="text-red-400">*</span></span>
                </label>
              </div>
            )}

            {/* 주문 상품 */}
            <div data-coach="checkout-items" className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">주문 상품 ({checkedItems.length})</h3>
              {checkedItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.image_url && <Image src={item.image_url} alt={item.name} width={52} height={52} className="w-13 h-13 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.product_type}</p>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.quantity}개
                      {item.bag_included ? " · 쇼핑백 포함 제품" : ((item.shoppingBagCount ?? 0) > 0 && shoppingBagEnabled ? ` · 쇼핑백 ${item.shoppingBagCount}개` : "")}
                      {(item.preservativeCount ?? 0) > 0 && preservativeEnabled && ` · 수명연장제 ${item.preservativeCount}개`}
                      {(item.messageCardCount ?? 0) > 0 && messageCardEnabled && ` · 메시지카드 ${item.messageCardCount}장`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {(item.price * item.quantity + (!item.bag_included ? shoppingBagPrice * (item.shoppingBagCount ?? 0) : 0) + preservativePrice * (item.preservativeCount ?? 0) + messageCardPrice * (item.messageCardCount ?? 0)).toLocaleString()}원
                  </p>
                </div>
              ))}
            </div>

            {/* 주문자 정보 */}
            <div data-coach="checkout-orderer" className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">주문자 정보 <span className="text-red-400">*</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div ref={refName}>
                  <label className={`block text-xs mb-1 ${fieldErrors.name ? "text-red-500 font-medium" : "text-gray-500"}`}>이름{fieldErrors.name && " *필수"}</label>
                  <input value={name} onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: false })); }} placeholder="홍길동" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${fieldErrors.name ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gold-400"}`} />
                </div>
                <div ref={refPhone}>
                  <label className={`block text-xs mb-1 ${fieldErrors.phone ? "text-red-500 font-medium" : "text-gray-500"}`}>연락처{fieldErrors.phone && " *필수"}</label>
                  <input value={phone} onChange={(e) => { setPhone(formatPhone(e.target.value)); if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: false })); }} placeholder="010-0000-0000" inputMode="numeric" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${fieldErrors.phone ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gold-400"}`} />
                </div>
              </div>
            </div>

            {/* 수령 방법 */}
            <div ref={refDeliveryType} data-coach="checkout-delivery" className="bg-white overflow-hidden">
              <div className={`px-4 pt-4 pb-3 border-b ${fieldErrors.deliveryType ? "border-red-300 bg-red-50" : "border-gray-100"}`}>
                <h3 className={`text-sm font-medium ${fieldErrors.deliveryType ? "text-red-500" : "text-gray-700"}`}>수령 방법 <span className="text-red-400">*</span>{fieldErrors.deliveryType && " — 선택해주세요"}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {["픽업", ...(deliveryEnabled ? ["배송"] : [])].map((type) => (
                  <div key={type}>
                    <button
                      onClick={() => { setDeliveryType(type); setFieldErrors(p => ({ ...p, deliveryType: false })); }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${deliveryType === type ? "bg-beige-50" : "hover:bg-gray-50"}`}
                    >
                      <span className={`text-sm ${deliveryType === type ? "text-gold-600 font-medium" : "text-gray-800"}`}>{type}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${deliveryType === type ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                        {deliveryType === type && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {type === "배송" && deliveryType === "배송" && (
                      <div ref={refDeliveryInfo} className="px-4 pt-3 pb-4 border-t border-gray-100 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className={`block text-xs mb-1 ${fieldErrors.deliveryInfo && !recipientName ? "text-red-500 font-medium" : "text-gray-500"}`}>받는 분 이름</label>
                            <input value={recipientName} onChange={(e) => { setRecipientName(e.target.value); if (fieldErrors.deliveryInfo) setFieldErrors(p => ({ ...p, deliveryInfo: false })); }} placeholder="홍길동" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${fieldErrors.deliveryInfo && !recipientName ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gold-400"}`} />
                          </div>
                          <div>
                            <label className={`block text-xs mb-1 ${fieldErrors.deliveryInfo && !recipientPhone ? "text-red-500 font-medium" : "text-gray-500"}`}>받는 분 연락처</label>
                            <input value={recipientPhone} onChange={(e) => { setRecipientPhone(formatPhone(e.target.value)); if (fieldErrors.deliveryInfo) setFieldErrors(p => ({ ...p, deliveryInfo: false })); }} placeholder="010-0000-0000" inputMode="numeric" className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${fieldErrors.deliveryInfo && !recipientPhone ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gold-400"}`} />
                          </div>
                          <div className="md:col-span-2">
                            <label className={`block text-xs mb-1 ${fieldErrors.deliveryInfo && !address ? "text-red-500 font-medium" : "text-gray-500"}`}>주소</label>
                            <div className="flex gap-2">
                              <input value={address} readOnly onClick={() => setShowPostcode(true)} placeholder="주소 검색" className={`flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 cursor-pointer placeholder:text-gray-300 ${fieldErrors.deliveryInfo && !address ? "border-red-400" : "border-gray-200 focus:border-gold-400"}`} />
                              <button onClick={() => setShowPostcode(true)} className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 bg-gray-50 transition-colors">찾기</button>
                            </div>
                          </div>
                          {showPostcode && (
                            <div className="md:col-span-2 border border-gray-200 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                                <span className="text-xs text-gray-500">주소 검색</span>
                                <button onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                              </div>
                              <LazyDaumPostcode onComplete={(data) => { setAddress(data.address); setShowPostcode(false); }} style={{ height: 400 }} />
                            </div>
                          )}
                          {address && (
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">상세 주소</label>
                              <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="동/호수 등" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs px-1">
                          {distanceLoading && <span className="text-gray-400">배송 가능 여부 확인 중...</span>}
                          {!distanceLoading && deliveryDistance !== null && deliveryFee !== null && (
                            <span className="text-gold-600">📍 배송비 {deliveryFee.toLocaleString()}원 ({deliveryDistance.toFixed(1)}km)</span>
                          )}
                          {!distanceLoading && deliveryDistance !== null && deliveryFee === null && (
                            <span className="text-amber-500">배송 가능 거리를 초과했습니다. 매장에 문의해 주세요.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 수령 날짜 */}
            <div ref={refDate} data-coach="checkout-date" className="bg-white overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">수령 날짜 <span className="text-red-400">*</span></h3>
              </div>
              <div className="large-datepicker overflow-hidden">
                <LazyDatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => { setSelectedDate(date); setDesiredTime(""); }}
                  inline locale="ko"
                  minDate={new Date()}
                  filterDate={(d) => !isDateDisabled(d)}
                />
              </div>
            </div>

            {/* 수령 시간 */}
            <div ref={refTime} data-coach="checkout-time" className="bg-white px-4 py-4 space-y-3">
              <h3 className={`text-sm font-medium flex items-center gap-2 pb-3 border-b ${fieldErrors.time ? "text-red-500 border-red-200" : "text-gray-700 border-gray-100"}`}>
                수령 시간 <span className="text-red-400">*</span>{fieldErrors.time && <span className="text-xs font-normal">— 시간을 선택해주세요</span>}
                {dayInfo && !dayInfo.closed && <span className="text-xs font-normal text-gray-400">영업시간 · {dayInfo.open}~{dayInfo.close}</span>}
              </h3>
              {!selectedDate ? (
                <p className="text-xs text-gray-400 px-1">날짜를 먼저 선택해주세요.</p>
              ) : !dayInfo || dayInfo.closed ? (
                <p className="text-xs text-gray-400 px-1">해당 날짜는 휴무입니다.</p>
              ) : timeSlots.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">선택 가능한 시간이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button key={slot} onClick={() => { setDesiredTime(slot); if (fieldErrors.time) setFieldErrors(p => ({ ...p, time: false })); }}
                      className={`py-3 rounded-lg text-sm font-medium transition-colors ${desiredTime === slot ? "bg-gold-500 text-white" : fieldErrors.time ? "bg-red-50 border border-red-200 text-gray-700 hover:bg-red-100" : "bg-beige-100 text-gray-700 hover:bg-beige-200"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 요청 사항 */}
            <div data-coach="checkout-requests" className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">요청 사항</h3>
              <textarea value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="매장에 전달할 내용을 입력해주세요 (선택)" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300" />
            </div>

            {/* 모바일 전용: 결제금액 + 동의 + 버튼 */}
            <div className="md:hidden bg-white px-4 py-4 space-y-4">
              <div className="space-y-2 pb-4 border-b border-gray-100" data-coach="checkout-summary">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">결제 금액</p>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>상품 금액</span><span>{itemsTotal.toLocaleString()}원</span>
                </div>
                {deliveryType === "배송" && deliveryFee !== null && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>배송비</span><span>+{deliveryFee.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                  <span className="text-lg font-bold text-gold-500">{finalPrice.toLocaleString()}원</span>
                </div>
              </div>
              {agreementJsx}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
              <button onClick={handleConfirm} disabled={submitting} className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors">
                {submitting ? "결제 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
              </button>
            </div>
          </div>

          {/* ── 오른쪽: 고정 사이드 패널 (PC 전용) ── */}
          {/* 맞춤주문 결제 화면과 같은 방식 — 패널 자체를 sticky로, top은 헤더(80px) + 단계 표시 바(약 49px) 아래 */}
          <div className="hidden md:flex md:flex-col md:w-80 md:shrink-0 md:self-start md:sticky md:top-[150px]">
            <div className="bg-white border border-gray-100 overflow-hidden">
              {/* 결제 금액 요약 */}
              <div data-coach="checkout-summary" className="px-5 py-4 border-b border-gray-100 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">결제 금액</p>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>상품 금액</span>
                  <span>{itemsTotal.toLocaleString()}원</span>
                </div>
                {deliveryType === "배송" && deliveryFee !== null && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>배송비</span>
                    <span>+{deliveryFee.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
                  <span className="text-lg font-bold text-gold-500">{finalPrice.toLocaleString()}원</span>
                </div>
              </div>

              {/* 동의 + 버튼 */}
              <div className="px-5 py-4 space-y-4">
                {agreementJsx}
                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <button onClick={handleConfirm} disabled={submitting} className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors">
                  {submitting ? "결제 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
    </div>
  );
}
