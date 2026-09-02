"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import "react-datepicker/dist/react-datepicker.css";
import DaumPostcodeEmbed from "react-daum-postcode";
import StoreHeader from "@/components/main/StoreHeader";
import { useCart, CartItem } from "@/hooks/useCart";
import { formatPhone, parsePhone } from "@/lib/format";

registerLocale("ko", ko);

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
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  messageCardEnabled: boolean;
  messageCardPrice: number;
  notificationEmail: string | null;
  initialPaymentKey: string | null;
  initialOrderId: string | null;
  initialAmount: number | null;
  failCode: string | null;
  failMessage: string | null;
}

interface DraftData {
  items: CartItem[];
  name: string;
  phone: string;
  deliveryType: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  desiredDate: string;
  desiredTime: string;
  requests: string;
  finalPrice: number;
  privacyAgreed: boolean;
  kakaoConsent: boolean;
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

export default function CheckoutClient({
  slug, companyName, logoImage, themeVars, consultEnabled,
  storeAddress, deliveryEnabled, deliveryFees,
  businessHours, closedDates,
  shoppingBagEnabled, shoppingBagPrice, messageCardEnabled, messageCardPrice,
  notificationEmail,
  initialPaymentKey, initialOrderId, initialAmount, failCode, failMessage,
}: CheckoutClientProps) {
  const { items: cartItems, clearCart } = useCart(slug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [showPostcode, setShowPostcode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [desiredTime, setDesiredTime] = useState("");
  const [requests, setRequests] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [kakaoConsent, setKakaoConsent] = useState(false);
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
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(!!(initialPaymentKey || (initialOrderId && !failCode)));

  const checkedItems = cartItems.filter((i) => i.checked);

  const desiredDate = selectedDate
    ? selectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim()
    : "";

  const itemsTotal = checkedItems.reduce((sum, i) => {
    let p = i.price * i.quantity;
    if (!i.bag_included) p += shoppingBagPrice * (i.shoppingBagCount ?? 0);
    p += messageCardPrice * (i.messageCardCount ?? 0);
    return sum + p;
  }, 0);
  const finalPrice = itemsTotal + (deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0);

  const isDateDisabled = (date: Date) => {
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayKey = dayNames[date.getDay()];
    const hours = businessHours[dayKey];
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

  useEffect(() => {
    if (!initialPaymentKey && !initialOrderId) return;
    window.history.replaceState({}, "", `/${slug}/cart/checkout`);

    if (failCode) {
      setError(failMessage ?? "결제가 취소되었습니다.");
      const saved = sessionStorage.getItem(`cart_checkout_draft_${slug}`);
      if (saved) {
        try {
          const draft: DraftData = JSON.parse(saved);
          setName(draft.name); setPhone(formatPhone(draft.phone));
          setDeliveryType(draft.deliveryType); setRecipientName(draft.recipientName);
          if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
          setAddress(draft.address); setAddressDetail(draft.addressDetail);
          setDesiredTime(draft.desiredTime); setRequests(draft.requests);
          setPrivacyAgreed(draft.privacyAgreed);
          setKakaoConsent(draft.kakaoConsent ?? false);
        } catch { /* ignore */ }
        sessionStorage.removeItem(`cart_checkout_draft_${slug}`);
      }
      setIsProcessingRedirect(false);
      return;
    }

    if (!initialPaymentKey) { setIsProcessingRedirect(false); return; }

    const saved = sessionStorage.getItem(`cart_checkout_draft_${slug}`);
    if (!saved) { setError("결제 정보를 찾을 수 없습니다."); setIsProcessingRedirect(false); return; }

    const draft: DraftData = JSON.parse(saved);
    sessionStorage.removeItem(`cart_checkout_draft_${slug}`);

    const run = async () => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug, companyName, notificationEmail,
            items: draft.items,
            orderer: { name: draft.name, phone: draft.phone },
            deliveryType: draft.deliveryType,
            delivery: draft.deliveryType === "배송" ? { recipientName: draft.recipientName, recipientPhone: draft.recipientPhone, address: draft.address, addressDetail: draft.addressDetail } : null,
            desiredDate: draft.desiredDate, desiredTime: draft.desiredTime,
            requests: draft.requests, finalPrice: draft.finalPrice,
            kakaoConsent: draft.kakaoConsent,
            paymentKey: initialPaymentKey, paymentOrderId: initialOrderId, paymentAmount: initialAmount,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "주문 저장 실패");
        setName(draft.name); setPhone(formatPhone(draft.phone));
        setDeliveryType(draft.deliveryType); setRecipientName(draft.recipientName);
        if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
        setAddress(draft.address); setAddressDetail(draft.addressDetail);
        setDesiredTime(draft.desiredTime); setRequests(draft.requests);
        setSubmittedItems(draft.items);
        setFinalPriceSnapshot(draft.finalPrice);
        clearCart();
        setSubmitted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
        setIsProcessingRedirect(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const draft: DraftData = {
      items: checkedItems, name, phone: parsePhone(phone),
      deliveryType, recipientName, recipientPhone: parsePhone(recipientPhone),
      address, addressDetail, desiredDate, desiredTime, requests,
      finalPrice, privacyAgreed, kakaoConsent,
    };
    sessionStorage.setItem(`cart_checkout_draft_${slug}`, JSON.stringify(draft));

    try {
      const orderId = `cart-${slug}-${Date.now()}`;
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: orderId });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: finalPrice },
        orderId,
        orderName: checkedItems.length === 1 ? checkedItems[0].name : `${checkedItems[0].name} 외 ${checkedItems.length - 1}건`,
        customerName: name,
        successUrl: `${window.location.origin}/${slug}/cart/checkout`,
        failUrl: `${window.location.origin}/${slug}/cart/checkout?code=FAIL`,
      });
    } catch (err) {
      sessionStorage.removeItem(`cart_checkout_draft_${slug}`);
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  const handleConfirm = () => {
    const fe: Record<string, boolean> = {};
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
      const firstRef = fe.name ? refName : fe.phone ? refPhone : fe.deliveryType ? refDeliveryType : fe.deliveryInfo ? refDeliveryInfo : fe.date ? refDate : fe.time ? refTime : refAgreement;
      firstRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFieldErrors({});
    setErrors([]);
    handleSubmit();
  };

  if (isProcessingRedirect) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4" style={themeVars}>
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

  if (submitted) {
    const deliveryAmt = deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0;
    const Row = ({ label, value }: { label: string; value: string }) => (
      <div className="flex px-4 py-3.5 gap-4 border-t border-gray-50">
        <span className="text-sm text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</span>
      </div>
    );
    return (
      <div className="min-h-screen bg-gray-100" style={themeVars}>
        <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
          <div className="bg-white rounded-2xl px-6 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">주문이 완료되었습니다</h2>
            <p className="text-sm text-gray-400">매장에서 확인 후 준비를 시작하겠습니다.</p>
          </div>

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
                    {(item.messageCardCount ?? 0) > 0 && ` · 메시지카드 ${item.messageCardCount}장`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  {(item.price * item.quantity + (!item.bag_included ? shoppingBagPrice * (item.shoppingBagCount ?? 0) : 0) + messageCardPrice * (item.messageCardCount ?? 0)).toLocaleString()}원
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
            {requests && <Row label="요청 사항" value={requests} />}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden">
            <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">결제 금액</p>
            <div className="px-4 py-4 space-y-3">
              {deliveryAmt > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>상품 금액</span><span>{(finalPriceSnapshot - deliveryAmt).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>배송비</span><span>+{deliveryAmt.toLocaleString()}원</span>
                  </div>
                  <div className="border-t border-gray-100" />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">총 결제금액</span>
                <span className="text-xl font-bold text-gold-500">{finalPriceSnapshot.toLocaleString()}원</span>
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

  if (checkedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4" style={themeVars}>
        <p className="text-gray-400">선택된 상품이 없습니다.</p>
        <Link href={`/${slug}/cart`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">장바구니로 돌아가기</Link>
      </div>
    );
  }

  const now = new Date();
  const dayInfo = selectedDate ? businessHours[String(selectedDate.getDay())] : null;
  const isToday = selectedDate
    ? selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate()
    : false;
  const minTimeDate = isToday ? new Date(now.getTime() + 30 * 60000) : null;
  const roundedMinutes = minTimeDate ? Math.ceil(minTimeDate.getMinutes() / 30) * 30 : 0;
  const adjustedHour = minTimeDate ? minTimeDate.getHours() + (roundedMinutes === 60 ? 1 : 0) : 0;
  const adjustedMinute = roundedMinutes === 60 ? 0 : roundedMinutes;
  const minTime = minTimeDate ? `${String(adjustedHour).padStart(2, "0")}:${String(adjustedMinute).padStart(2, "0")}` : dayInfo?.open ?? "00:00";
  const [minH, minM] = minTime.split(":").map(Number);
  const [maxH, maxM] = (dayInfo?.close ?? "23:59").split(":").map(Number);
  const timeSlots: string[] = [];
  if (selectedDate && dayInfo && !dayInfo.closed) {
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
        <input type="checkbox" checked={privacyAgreed} onChange={(e) => { setPrivacyAgreed(e.target.checked); if (fieldErrors.privacy) setFieldErrors(p => ({ ...p, privacy: false })); }} className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0" />
        <span><Link href="/privacy" target="_blank" className="underline text-gold-600">개인정보처리방침</Link>에 동의합니다. <span className="text-red-400">*</span></span>
      </label>
      <label className={`flex items-start gap-3 text-sm cursor-pointer ${fieldErrors.cancellation ? "text-red-500" : "text-gray-500"}`}>
        <input type="checkbox" checked={cancellationAgreed} onChange={(e) => { setCancellationAgreed(e.target.checked); if (fieldErrors.cancellation) setFieldErrors(p => ({ ...p, cancellation: false })); }} className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0" />
        <span>제작 착수 후 취소·환불 불가. <Link href="/refund" target="_blank" className="underline text-gold-600">환불 정책</Link> 동의 <span className="text-red-400">*</span></span>
      </label>
      <label className="flex items-start gap-3 text-sm text-gray-500 cursor-pointer">
        <input type="checkbox" checked={kakaoConsent} onChange={(e) => setKakaoConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-gold-500 shrink-0" />
        <span>카카오톡 알림 받기 (선택) — 주문 확정·취소 알림</span>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100" style={themeVars}>
      <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />

      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row md:gap-5">

          {/* ── 왼쪽: 폼 영역 ── */}
          <div className="flex-1 min-w-0 md:max-w-xl space-y-2 -mx-4 md:mx-0">

            {error && (
              <div className="bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-700">결제가 완료되지 않았습니다</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* 주문 상품 */}
            <div className="bg-white px-4 py-4 space-y-3">
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
                      {(item.messageCardCount ?? 0) > 0 && messageCardEnabled && ` · 메시지카드 ${item.messageCardCount}장`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {(item.price * item.quantity + (!item.bag_included ? shoppingBagPrice * (item.shoppingBagCount ?? 0) : 0) + messageCardPrice * (item.messageCardCount ?? 0)).toLocaleString()}원
                  </p>
                </div>
              ))}
            </div>

            {/* 주문자 정보 */}
            <div className="bg-white px-4 py-4 space-y-3">
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
            <div ref={refDeliveryType} className="bg-white overflow-hidden">
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
                          {address && (
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">상세 주소</label>
                              <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="동/호수 등" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300" />
                            </div>
                          )}
                        </div>
                        {showPostcode && (
                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                              <span className="text-xs text-gray-500">주소 검색</span>
                              <button onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                            </div>
                            <DaumPostcodeEmbed onComplete={(data) => { setAddress(data.address); setShowPostcode(false); }} style={{ height: 400 }} />
                          </div>
                        )}
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
            <div ref={refDate} className="bg-white overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">수령 날짜 <span className="text-red-400">*</span></h3>
              </div>
              <div className="large-datepicker overflow-hidden">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => { setSelectedDate(date); setDesiredTime(""); }}
                  inline locale="ko"
                  minDate={new Date()}
                  filterDate={(d) => !isDateDisabled(d)}
                />
              </div>
            </div>

            {/* 수령 시간 */}
            <div ref={refTime} className="bg-white px-4 py-4 space-y-3">
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
            <div className="bg-white px-4 py-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">요청 사항</h3>
              <textarea value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="매장에 전달할 내용을 입력해주세요 (선택)" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300" />
            </div>

            {/* 모바일 전용: 결제금액 + 동의 + 버튼 */}
            <div className="md:hidden bg-white px-4 py-4 space-y-4">
              <div className="space-y-2 pb-4 border-b border-gray-100">
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
              <button onClick={handleConfirm} disabled={submitting} className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors">
                {submitting ? "결제 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
              </button>
            </div>
          </div>

          {/* ── 오른쪽: 고정 사이드 패널 (PC 전용) ── */}
          <div className="hidden md:block w-80 shrink-0">
            <div className="sticky top-[100px] bg-white border border-gray-100 overflow-hidden">
              {/* 결제 금액 요약 */}
              <div className="px-5 py-4 border-b border-gray-100 space-y-2">
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
                <button onClick={handleConfirm} disabled={submitting} className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors">
                  {submitting ? "결제 중..." : `${finalPrice.toLocaleString()}원 결제하기`}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
