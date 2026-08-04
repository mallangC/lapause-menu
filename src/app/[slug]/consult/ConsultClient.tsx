"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { formatPhone, parsePhone } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import DaumPostcodeEmbed from "react-daum-postcode";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import "react-datepicker/dist/react-datepicker.css";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP } from "@/lib/constants";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
import StoreHeader from "@/components/main/StoreHeader";

registerLocale("ko", ko);

interface ConsultForm {
  purpose: string;
  purposeCustom: string;
  recipientGender: string;
  recipientAge: string;
  relationship: string;
  relationshipCustom: string;
  productType: string;
  productTypeCustom: string;
  mood: string;
  budget: string;
  budgetCustom: string;
  messageCard: string;
  messageCardContent: string;
  shoppingBag: string;
  deliveryType: string;
  desiredDate: string;
  desiredTime: string;
  requests: string;
}

const EMPTY_FORM: ConsultForm = {
  purpose: "",
  purposeCustom: "",
  recipientGender: "",
  recipientAge: "",
  relationship: "",
  relationshipCustom: "",
  productType: "",
  productTypeCustom: "",
  mood: "",
  budget: "",
  budgetCustom: "",
  messageCard: "",
  messageCardContent: "",
  shoppingBag: "",
  deliveryType: "",
  desiredDate: "",
  desiredTime: "",
  requests: "",
};

interface DraftData {
  form: ConsultForm;
  product: { id: string; name: string; price: number; product_type: string; image_url: string | null; bag_included?: boolean };
  name: string;
  phone: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  kakaoConsent: boolean;
  privacyAgreed: boolean;
  cancellationAgreed: boolean;
  finalPrice: number;
  source?: string | null;
}

interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

type BusinessHours = Record<string, DayHours>;

interface Props {
  slug: string;
  companyName: string;
  logoImage?: string | null;
  productTypeList?: string[];
  seasonList?: string[];
  notificationEmail?: string | null;
  products: Product[];
  businessHours: BusinessHours;
  closedDates: string[];
  minLeadTimes?: Record<string, number>;
  consultNotice?: string | null;
  storeAddress?: string | null;
  deliveryEnabled?: boolean;
  deliveryFees?: Record<string, number>;
  messageCardEnabled?: boolean;
  messageCardPrice?: number;
  shoppingBagEnabled?: boolean;
  shoppingBagPrice?: number;
  preselectedProduct?: Product | null;
  initialPaymentId?: string | null;
}

async function geocodeKakao(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function getDeliveryFeeByDistance(km: number, fees: Record<string, number>): number | null {
  const key =
    km <= 1  ? "0-1"   :
    km <= 3  ? "1-3"   :
    km <= 5  ? "3-5"   :
    km <= 10 ? "5-10"  :
    km <= 15 ? "10-15" :
    km <= 20 ? "15-20" : null;
  if (!key) return null;
  return fees[key] ?? null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-gold-500 text-white border-gold-500"
          : "bg-white text-gray-700 border-gray-200 hover:border-gold-400"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, required, badge, children }: { title: string; required?: boolean; badge?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        {title}
        {badge && <span className="text-xs font-normal text-gray-400">{badge}</span>}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </h3>
      {children}
    </div>
  );
}


const TYPE_MAP: Record<string, string> = {
  꽃다발: "꽃다발",
  꽃바구니: "꽃바구니",
  센터피스: "센터피스",
  화병꽂이: "화병꽂이",
};


const BUDGET_MAP: Record<string, number> = {
  "3만원": 30000,
  "5만원": 50000,
  "7만원": 70000,
  "10만원": 100000,
  "12만원": 120000,
  "15만원": 150000,
};

function scoreProducts(products: Product[], form: ConsultForm): Product[] {
  const budget =
    form.budget === "기타"
      ? parseInt(form.budgetCustom || "0") * 10000
      : BUDGET_MAP[form.budget] ?? 0;

  const mappedType = TYPE_MAP[form.productType];
  const isHighBudget = budget >= 100000;
  const tightUpper = isHighBudget ? 20000 : 10000;   // <10만원: +1만원 / >=10만원: +2만원
  const wideUpper  = isHighBudget ? 50000 : 30000;   // <10만원: +3만원 / >=10만원: +5만원

  const score = (p: Product) => {
    let s = 0;
    if (mappedType && p.product_type === mappedType) s += 4;
    if (form.mood && p.mood === form.mood) s += 3;
    if (p.is_recommended) s += 2;
    if (p.is_popular) s += 1;
    return s;
  };

  const typeMatch = (p: Product) => !mappedType || p.product_type === mappedType;

  // 슬롯 1~2: budget ~ budget+tightUpper
  const tight = budget > 0
    ? products.filter((p) => typeMatch(p) && p.price >= budget && p.price <= budget + tightUpper)
    : products.filter(typeMatch);
  const tightTop = [...tight].sort((a, b) => score(b) - score(a)).slice(0, 2);
  const usedIds = new Set(tightTop.map((p) => p.id));

  // 슬롯 3~4: budget+tightUpper 초과 ~ budget+wideUpper
  const wide = products.filter((p) => {
    if (!typeMatch(p) || usedIds.has(p.id)) return false;
    if (budget === 0) return true;
    return p.price > budget + tightUpper && p.price <= budget + wideUpper;
  });
  const wideTop = [...wide].sort((a, b) => score(b) - score(a)).slice(0, 2);

  const result = [...tightTop, ...wideTop];

  // 4개 미만이면 전체에서 보충
  if (result.length < 4) {
    const allIds = new Set(result.map((p) => p.id));
    const fallback = products
      .filter((p) => !allIds.has(p.id))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 4 - result.length);
    result.push(...fallback);
  }

  return result;
}

export default function ConsultClient({ slug, companyName, logoImage = null, productTypeList = [], seasonList = [], notificationEmail, products, businessHours, closedDates, minLeadTimes = {}, consultNotice, storeAddress = null, deliveryEnabled = false, deliveryFees = {}, messageCardEnabled = false, messageCardPrice = 2000, shoppingBagEnabled = false, shoppingBagPrice = 2000, preselectedProduct = null, initialPaymentId = null }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<ConsultForm>(EMPTY_FORM);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [showPostcode, setShowPostcode] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [kakaoConsent, setKakaoConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [finalPriceSnapshot, setFinalPriceSnapshot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step2FieldErrors, setStep2FieldErrors] = useState<string[]>([]);
  const [step4FieldErrors, setStep4FieldErrors] = useState<string[]>([]);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(!!initialPaymentId);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [activeSection1, setActiveSection1] = useState(0);
  const [activeSection2, setActiveSection2] = useState(0);
  const sourceRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`consult_source_${slug}`);
    if (stored) {
      sourceRef.current = stored;
      sessionStorage.removeItem(`consult_source_${slug}`);
    }
  }, [slug]);

  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim();
    setForm((prev) => ({ ...prev, desiredDate: formatted }));
  }, []);


  const set = (key: keyof ConsultForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 토스 결제 리다이렉트 복귀 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedPaymentKey = params.get("paymentKey");
    const returnedOrderId = params.get("orderId");
    const failCode = params.get("code");

    if (!returnedPaymentKey && !returnedOrderId) return;

    window.history.replaceState({}, "", `/${slug}/consult`);

    if (failCode) {
      // 결제 실패 — 드래프트에서 폼 복원 후 step 4로 이동
      const saved = sessionStorage.getItem(`consult_draft_${slug}`);
      if (saved) {
        try {
          const draft: DraftData = JSON.parse(saved);
          setForm(draft.form);
          setSelectedProduct(products.find(p => p.id === draft.product.id) ?? null);
          setName(draft.name);
          setPhone(formatPhone(draft.phone));
          setRecipientName(draft.recipientName);
          if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
          setAddress(draft.address);
          setAddressDetail(draft.addressDetail);
          setKakaoConsent(draft.kakaoConsent);
          setPrivacyAgreed(draft.privacyAgreed);
          setCancellationAgreed(draft.cancellationAgreed);
          setStep(4);
        } catch { /* 파싱 실패 시 step 1 유지 */ }
        sessionStorage.removeItem(`consult_draft_${slug}`);
      }
      setError(params.get("message") ?? "결제가 취소되었습니다.");
      setIsProcessingRedirect(false);
      return;
    }

    if (!returnedPaymentKey) {
      setError("결제 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      setIsProcessingRedirect(false);
      return;
    }

    const returnedAmount = Number(params.get("amount") ?? "0");

    const saved = sessionStorage.getItem(`consult_draft_${slug}`);
    if (!saved) {
      setError("결제 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      setIsProcessingRedirect(false);
      return;
    }

    const draft: DraftData = JSON.parse(saved);
    sessionStorage.removeItem(`consult_draft_${slug}`);

    const run = async () => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            companyName,
            notificationEmail,
            form: draft.form,
            product: draft.product,
            orderer: { name: draft.name, phone: draft.phone },
            kakaoConsent: draft.kakaoConsent,
            delivery: draft.form.deliveryType === "배송" ? {
              recipientName: draft.recipientName,
              recipientPhone: draft.recipientPhone,
              address: draft.address,
              addressDetail: draft.addressDetail,
            } : null,
            finalPrice: draft.finalPrice,
            paymentKey: returnedPaymentKey,
            paymentOrderId: returnedOrderId,
            paymentAmount: returnedAmount,
            source: draft.source ?? null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "예약 저장 실패");
        const rid = data.reservationId ?? null;
        setReservationId(rid);
        setFinalPriceSnapshot(draft.finalPrice);
        // 완료 페이지 표시용 상태 복원
        setForm(draft.form);
        setSelectedProduct(products.find((p) => p.id === draft.product.id) ?? null);
        setName(draft.name);
        setPhone(formatPhone(draft.phone));
        setRecipientName(draft.recipientName);
        if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
        setAddress(draft.address);
        setAddressDetail(draft.addressDetail);
        setSubmitted(true);
        setPaidConfirmed(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "예약 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
        setIsProcessingRedirect(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommendations = useMemo(
    () => scoreProducts(products, form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.productType, form.mood, form.budget, form.budgetCustom]
  );

  const handleStep1Next = () => {
    setStep(preselectedProduct ? 4 : 2);
  };

  const step2Valid = !!(form.productType && form.mood && form.budget && (form.budget !== "기타" || form.budgetCustom));

  const handleStep2Next = () => {
    const missing: string[] = [];
    if (!form.productType) missing.push("상품 형태");
    if (!form.mood) missing.push("분위기");
    if (!form.budget || (form.budget === "기타" && !form.budgetCustom)) missing.push("희망 예산");
    if (missing.length > 0) {
      setStep2FieldErrors(missing);
      return;
    }
    setStep2FieldErrors([]);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);

    const finalPrice = selectedProduct.price +
      (messageCardEnabled && form.messageCard === "추가" ? messageCardPrice : 0) +
      (shoppingBagEnabled && form.shoppingBag === "추가" ? shoppingBagPrice : 0) +
      (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0);

    try {
      const orderId = `order${Date.now()}`;

      // 리다이렉트 복귀 대비 폼 데이터 임시 저장
      sessionStorage.setItem(`consult_draft_${slug}`, JSON.stringify({
        form,
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          product_type: selectedProduct.product_type,
          image_url: selectedProduct.image_url,
          bag_included: selectedProduct.bag_included ?? false,
        },
        name,
        phone: parsePhone(phone),
        recipientName,
        recipientPhone: parsePhone(recipientPhone),
        address,
        addressDetail,
        kakaoConsent,
        privacyAgreed,
        cancellationAgreed,
        finalPrice,
        source: sourceRef.current,
      } satisfies DraftData));

      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: orderId });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: finalPrice },
        orderId,
        orderName: `${companyName} 맞춤 주문`,
        successUrl: `${window.location.origin}/${slug}/consult`,
        failUrl: `${window.location.origin}/${slug}/consult`,
        customerName: name,
        customerMobilePhone: parsePhone(phone),
      });
      // 위 호출은 결제 페이지로 리다이렉트되므로 이 아래는 실행되지 않음
    } catch (err) {
      sessionStorage.removeItem(`consult_draft_${slug}`);
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaidConfirm = async () => {
    if (!reservationId) return;
    setPayLoading(true);
    await fetch(`/api/reservation/${reservationId}/paid`, { method: "PATCH" });
    setPayLoading(false);
    setPaidConfirmed(true);
  };

  if (isProcessingRedirect) {
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-beige-200 border-t-gold-500 animate-spin" />
          <div className="space-y-1.5">
            <p className="text-base font-medium text-gray-800">결제를 처리하고 있습니다</p>
            <p className="text-sm text-gray-400">잠시만 기다려주세요...</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const msgCardAmt  = messageCardEnabled && form.messageCard === "추가" ? messageCardPrice : 0;
    const bagAmt      = shoppingBagEnabled && form.shoppingBag === "추가" ? shoppingBagPrice : 0;
    const deliveryAmt = form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0;
    const hasExtras   = msgCardAmt > 0 || bagAmt > 0 || deliveryAmt > 0;

    const Row = ({ label, value }: { label: string; value: string }) => (
      <div className="flex px-4 py-3.5 gap-4 border-t border-gray-50">
        <span className="text-sm text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{value}</span>
      </div>
    );

    return (
      <div className="min-h-screen bg-gray-100">
        <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={productTypeList} seasonList={seasonList} consultEnabled={true} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">

          {/* 완료 헤더 */}
          <div className="bg-white rounded-2xl px-6 py-8 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">결제가 완료되었습니다</h2>
            <p className="text-sm text-gray-400">매장에서 확인 후 준비를 시작하겠습니다.</p>
          </div>

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
          <div className="bg-white rounded-2xl overflow-hidden">
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
                      <span>메시지 카드</span>
                      <span>+{msgCardAmt.toLocaleString()}원</span>
                    </div>
                  )}
                  {bagAmt > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>쇼핑백</span>
                      <span>+{bagAmt.toLocaleString()}원</span>
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

          <Link href={`/${slug}`} className="block text-center text-gold-500 text-base py-3 hover:text-gold-600 transition-colors">
            홈으로 돌아가기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <StoreHeader
        slug={slug}
        companyName={companyName}
        logoImage={logoImage}
        productTypeList={productTypeList}
        seasonList={seasonList}
        consultEnabled={true}
      />

      {/* Step indicator */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          {(preselectedProduct
            ? [{ num: 1 as const, label: "선물 정보" }, { num: 4 as const, label: "예약 확인" }]
            : [{ num: 1 as const, label: "선물 정보" }, { num: 2 as const, label: "취향 & 예산" }, { num: 3 as const, label: "상품 선택" }, { num: 4 as const, label: "예약 확인" }]
          ).map(({ num, label }, i) => (
            <div key={num} className="flex items-center gap-2">
              {i > 0 && <div className="flex-1 h-px bg-gray-200 w-8" />}
              <button
                type="button"
                onClick={() => step > num && setStep(num)}
                className={`flex items-center gap-1.5 ${
                  step === num
                    ? "text-gold-500"
                    : step > num
                    ? "text-gray-400 cursor-pointer hover:text-gold-400"
                    : "text-gray-300 cursor-default"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === num
                      ? "bg-gold-500 text-white"
                      : step > num
                      ? "bg-gray-200 text-gray-500"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  {step > num ? "✓" : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`mx-auto px-4 ${step === 4 ? "max-w-5xl pb-5" : "max-w-2xl py-5"}`}>

        {/* ── STEP 1: 선물 정보 ── */}
        {step === 1 && (() => {
            const sections = [
              {
                title: "선물 목적",
                selected: form.purpose,
                displayValue: form.purpose === "기타" ? (form.purposeCustom || "기타") : form.purpose,
                options: ["기념", "축하", "감사", "위로", "데이트", "기타"],
                onSelect: (v: string) => {
                  set("purpose", v);
                  if (v !== "기타") setActiveSection1(1);
                },
                extra: form.purpose === "기타" ? (
                  <div className="px-4 pt-3 pb-4">
                    <input
                      type="text"
                      placeholder="직접 입력"
                      value={form.purposeCustom}
                      onChange={(e) => set("purposeCustom", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400"
                      autoFocus
                    />
                  </div>
                ) : null,
              },
              {
                title: "성별",
                selected: form.recipientGender,
                displayValue: form.recipientGender,
                options: ["여성", "남성"],
                onSelect: (v: string) => {
                  set("recipientGender", v);
                  setActiveSection1(2);
                },
                extra: null,
              },
              {
                title: "받는 분 연령대",
                selected: form.recipientAge,
                displayValue: form.recipientAge,
                options: ["10대 이하", "10대", "20대", "30대", "40대", "50대 이상"],
                onSelect: (v: string) => {
                  set("recipientAge", v);
                  setActiveSection1(3);
                },
                extra: null,
              },
            ];

            return (
              <div className="space-y-2.5">
                <div className="bg-white -mx-4 px-5 py-3.5 md:mx-0 md:rounded-xl">
                  <p className="text-sm text-gray-600 text-center">선물 목적과 받는 분 정보를 알려주시면 더 잘 어울리는 꽃을 준비해드릴 수 있어요.</p>
                </div>
                <div className="bg-white -mx-4 md:mx-0 md:rounded-xl overflow-hidden divide-y divide-gray-200">
                {sections.map((section, idx) => {
                  const isOpen = activeSection1 === idx;
                  const isDone = !!section.selected && !isOpen;

                  return (
                    <div key={section.title} className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveSection1(isOpen ? -1 : idx)}
                        className="w-full flex items-center justify-between px-4 py-4 text-left bg-gray-50"
                      >
                        <span className="text-[15px] font-semibold text-gray-700">{section.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isDone && (
                            <span className="text-sm text-gold-600 font-medium">{section.displayValue}</span>
                          )}
                          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateRows: isOpen ? "1fr" : "0fr",
                          transition: "grid-template-rows 300ms ease-in-out",
                        }}
                      >
                        <div className="overflow-hidden">
                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                          {section.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => section.onSelect(opt)}
                              className={`w-full flex items-center justify-between pl-8 pr-4 py-3.5 text-left transition-colors ${section.selected === opt ? "bg-beige-50" : "hover:bg-gray-50"}`}
                            >
                              <span className={`text-sm ${section.selected === opt ? "text-gold-600 font-medium" : "text-gray-800"}`}>{opt}</span>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${section.selected === opt ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                                {section.selected === opt && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {section.extra}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>

                {sections.some((s) => !!s.selected) ? (
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 transition-colors"
                  >
                    다음
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="w-full py-3.5 rounded-xl font-medium text-gray-400 text-sm transition-colors"
                  >
                    건너뛰기
                  </button>
                )}
              </div>
            );
          })()}

        {/* ── STEP 2: 취향 & 예산 ── */}
        {step === 2 && (() => {
          const sections2 = [
            {
              title: "상품 형태",
              selected: form.productType,
              displayValue: form.productType,
              options: ["꽃다발", "꽃바구니", "센터피스", "화병꽂이", "기타"],
              onSelect: (v: string) => { set("productType", v); setActiveSection2(1); },
              extra: null as React.ReactNode,
            },
            {
              title: "선호하는 분위기",
              selected: form.mood,
              displayValue: form.mood,
              options: ["깔끔한 화이트&그린", "화사한 파스텔톤", "선명한 비비드톤", "차분한 딥컬러"],
              onSelect: (v: string) => { set("mood", v); setActiveSection2(2); },
              extra: null as React.ReactNode,
            },
            {
              title: "희망 예산",
              selected: form.budget,
              displayValue: form.budget === "기타" ? (form.budgetCustom ? `${form.budgetCustom}만원` : "기타") : form.budget,
              options: ["3만원", "5만원", "7만원", "10만원", "12만원", "15만원", "기타"],
              onSelect: (v: string) => { set("budget", v); if (v !== "기타") setActiveSection2(-1); },
              extra: form.budget === "기타" ? (
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="직접 입력"
                      value={form.budgetCustom}
                      onChange={(e) => set("budgetCustom", e.target.value)}
                      className="w-40 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400"
                      autoFocus
                    />
                    <span className="text-sm text-gray-500">만원</span>
                  </div>
                </div>
              ) : null as React.ReactNode,
            },
          ];

          return (
            <div className="space-y-2.5">
              <div className="bg-white -mx-4 md:mx-0 md:rounded-xl overflow-hidden divide-y divide-gray-200">
              {sections2.map((section, idx) => {
                const isOpen = activeSection2 === idx;
                const isDone = !!section.selected && !isOpen;

                return (
                  <div key={section.title} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setActiveSection2(isOpen ? -1 : idx)}
                      className="w-full flex items-center justify-between px-4 py-4 text-left bg-gray-50"
                    >
                      <span className="text-[15px] font-semibold text-gray-700 flex items-center gap-1">
                        {section.title}
                        <span className="text-red-400 text-xs">*</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {isDone && (
                          <span className="text-sm text-gold-600 font-medium">{section.displayValue}</span>
                        )}
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 300ms ease-in-out" }}>
                      <div className="overflow-hidden">
                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                          {section.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => section.onSelect(opt)}
                              className={`w-full flex items-center justify-between pl-8 pr-4 py-3.5 text-left transition-colors ${section.selected === opt ? "bg-beige-50" : "hover:bg-gray-50"}`}
                            >
                              <span className={`text-sm ${section.selected === opt ? "text-gold-600 font-medium" : "text-gray-800"}`}>{opt}</span>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${section.selected === opt ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                                {section.selected === opt && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        {section.extra}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

              {step2FieldErrors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 선택해주세요.</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {step2FieldErrors.map((f) => (
                      <li key={f} className="text-xs text-red-500">{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  disabled={!step2Valid}
                  className="flex-1 bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  추천 상품 보기
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── STEP 3: 추천 상품 선택 ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">추천 상품</h2>
              <p className="text-sm text-gray-500">
                선택하신 옵션에 맞는 상품을 추천드립니다. 원하시는 상품을 하나 선택해주세요.
              </p>
            </div>

            {recommendations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                추천 가능한 상품이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-px bg-gray-200 -mx-4 md:mx-0">
                {recommendations.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className={`relative flex flex-col text-left overflow-hidden transition-all ${
                      selectedProduct?.id === product.id
                        ? "outline outline-2 outline-gold-500 z-10 bg-white"
                        : "bg-white hover:bg-beige-50"
                    }`}
                  >
                    {selectedProduct?.id === product.id && (
                      <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center text-white text-xs shadow">
                        ✓
                      </span>
                    )}
                    <div className="w-full aspect-square overflow-hidden bg-beige-200">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                          🌸
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 px-3 py-2.5 space-y-1.5">
                      <div>
                        <span className="text-xs text-gray-400">{product.product_type}</span>
                        <p className="font-medium text-gray-900 text-sm leading-snug">{product.name}</p>
                        <p className="text-gold-600 font-medium text-sm mt-0.5">{product.price.toLocaleString()}원</p>
                      </div>
                      {(product.flower_colors.length > 0 || product.wrapping_color) && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          {product.flower_colors.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {product.flower_colors.map((color) => (
                                <span
                                  key={color}
                                  className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block shrink-0"
                                  style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                                  title={color}
                                />
                              ))}
                            </div>
                          )}
                          {product.wrapping_color && (
                            <span className="text-xs text-gray-400 shrink-0">{product.wrapping_color}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(2); setSelectedProduct(null); }}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!selectedProduct}
                onClick={() => setShowNotice(true)}
                className="flex-1 bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: 예약자 정보 & 확인 ── */}
        {step === 4 && (() => {
          const finalPrice = selectedProduct
            ? selectedProduct.price +
              (messageCardEnabled && form.messageCard === "추가" ? messageCardPrice : 0) +
              (shoppingBagEnabled && form.shoppingBag === "추가" ? shoppingBagPrice : 0) +
              (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0)
            : 0;

          const handleConfirm = () => {
            const missing: string[] = [];
            if (!name) missing.push("예약자 이름");
            if (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) missing.push("연락처 (10~11자리)");
            if (!form.deliveryType) missing.push("수령 방법");
            if (!form.desiredDate) missing.push("수령 희망 날짜");
            if (form.desiredDate && !form.desiredTime) missing.push("수령 희망 시간");
            if (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) missing.push("배송 정보");
            if (form.deliveryType === "배송" && deliveryDistance !== null && deliveryFee === null) missing.push("배송 가능 여부를 매장에 문의해주세요");
            if (!privacyAgreed) missing.push("개인정보처리방침 동의");
            if (!cancellationAgreed) missing.push("맞춤 제작 취소 정책 동의");
            if (missing.length > 0) { setStep4FieldErrors(missing); return; }
            setStep4FieldErrors([]);
            handleSubmit();
          };

          const agreementJsx = (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="mt-0.5 accent-gold-500" />
                <span><Link href="/privacy" target="_blank" className="underline text-gold-600">개인정보처리방침</Link>에 동의합니다. <span className="text-red-400">*</span></span>
              </label>
              <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={cancellationAgreed} onChange={(e) => setCancellationAgreed(e.target.checked)} className="mt-0.5 accent-gold-500" />
                <span>맞춤 제작 상품으로 제작 착수 후 취소·환불 불가.{" "}<Link href="/refund" target="_blank" className="underline text-gold-600">환불 정책</Link> 동의 <span className="text-red-400">*</span></span>
              </label>
              <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={kakaoConsent} onChange={(e) => setKakaoConsent(e.target.checked)} className="mt-0.5 accent-gold-500" />
                <span>카카오톡 알림 받기(선택) — 예약 확정·취소 알림</span>
              </label>
            </div>
          );

          return (
            <div className="flex flex-col md:flex-row md:gap-8 md:items-stretch">

              {/* ── 왼쪽: 폼 영역 ── */}
              <div className="flex-1 min-w-0 space-y-2 -mx-4 md:mx-0">

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-700">결제가 완료되지 않았습니다</p>
                      <p className="text-xs text-red-500 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                {consultNotice && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{consultNotice}</p>
                  </div>
                )}

                {/* 예약자 정보 */}
                <div className="bg-white px-4 py-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">예약자 정보 <span className="text-red-400">*</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">주문자</label>
                      <input type="text" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">휴대전화</label>
                      <input
                        type="tel"
                        placeholder="010-1234-5678"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-beige-50 placeholder:text-gray-400 transition-colors ${phone && (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`}
                      />
                      {phone && (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) && (
                        <p className="mt-1 text-xs text-red-500">연락처는 10~11자리로 입력해주세요.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 선택 상품 */}
                {selectedProduct && (
                  <div className="bg-white px-4 py-4 space-y-3">
                    <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">상품 정보</h3>
                    <div className="flex items-center gap-4">
                      {selectedProduct.image_url && (
                        <Image src={selectedProduct.image_url} alt={selectedProduct.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs text-gray-400">{selectedProduct.product_type}</p>
                        <p className="text-sm font-medium text-gray-900 leading-snug">{selectedProduct.name}</p>
                        <p className="text-sm font-bold text-gold-500 pt-1">{selectedProduct.price.toLocaleString()}원</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 수령 방법 */}
                <div className="bg-white overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700">수령 방법 <span className="text-red-400">*</span></h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(deliveryEnabled ? ["픽업", "배송"] : ["픽업"]).map((v) => (
                      <div key={v}>
                        <button
                          type="button"
                          onClick={() => set("deliveryType", v)}
                          className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.deliveryType === v ? "bg-beige-50" : "hover:bg-gray-50"}`}
                        >
                          <span className={`text-sm ${form.deliveryType === v ? "text-gold-600 font-medium" : "text-gray-800"}`}>{v}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.deliveryType === v ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                            {form.deliveryType === v && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </button>
                        {v === "배송" && form.deliveryType === "배송" && (
                    <div className="px-4 pt-4 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">받는 분 이름</label>
                          <input type="text" placeholder="홍길동" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">받는 분 전화번호</label>
                          <input type="tel" placeholder="010-1234-5678" value={recipientPhone} onChange={(e) => setRecipientPhone(formatPhone(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">주소</label>
                          <div className="flex gap-2">
                            <input type="text" placeholder="주소 검색" value={address} readOnly onClick={() => setShowPostcode(true)} className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 cursor-pointer" />
                            <button type="button" onClick={() => setShowPostcode(true)} className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 bg-beige-50 transition-colors whitespace-nowrap">찾기</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">상세주소</label>
                          <input type="text" placeholder="동/호수 등" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-400" />
                        </div>
                      </div>
                      {address && (
                        <div className="text-xs px-1">
                          {!storeAddress ? (
                            <span className="text-gray-400">매장 주소가 등록되지 않아 거리를 계산할 수 없습니다.</span>
                          ) : distanceLoading ? (
                            <span className="text-gray-400">거리 계산 중...</span>
                          ) : deliveryDistance !== null ? (
                            <span className="text-gray-500">
                              📍 매장까지 직선거리 <span className="font-semibold text-gray-800">약 {deliveryDistance}km</span>
                              {deliveryFee !== null
                                ? <span className="ml-1 text-gold-600 font-semibold"> · 배송비 {deliveryFee.toLocaleString()}원</span>
                                : <span className="ml-1 text-amber-500"> · 매장에 문의 바랍니다</span>
                              }
                              <span className="text-gray-400 ml-1">(직선거리 기준)</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">거리를 계산할 수 없습니다.</span>
                          )}
                        </div>
                      )}
                      {showPostcode && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                            <span className="text-xs text-gray-500">주소 검색</span>
                            <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                          </div>
                          <DaumPostcodeEmbed
                            onComplete={async (data) => {
                              const customerAddr = data.roadAddress || data.jibunAddress;
                              setAddress(customerAddr);
                              setShowPostcode(false);
                              if (storeAddress) {
                                setDistanceLoading(true);
                                setDeliveryDistance(null);
                                setDeliveryFee(null);
                                const [storePt, customerPt] = await Promise.all([geocodeKakao(storeAddress), geocodeKakao(customerAddr)]);
                                if (storePt && customerPt) {
                                  const km = haversineKm(storePt.lat, storePt.lng, customerPt.lat, customerPt.lng);
                                  const rounded = Math.round(km * 10) / 10;
                                  setDeliveryDistance(rounded);
                                  setDeliveryFee(getDeliveryFeeByDistance(rounded, deliveryFees));
                                }
                                setDistanceLoading(false);
                              }
                            }}
                            style={{ height: 400 }}
                          />
                        </div>
                      )}
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 수령 희망 날짜 */}
                <div className="bg-white overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700">
                      수령 희망 날짜 <span className="text-red-400">*</span>
                    </h3>
                  </div>
                  <div className="large-datepicker overflow-hidden">
                    <DatePicker
                      locale="ko"
                      inline
                      selected={selectedDate}
                      onChange={(date: Date | null) => {
                        setSelectedDate(date);
                        set("desiredTime", "");
                        if (date) {
                          set("desiredDate", date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim());
                        } else {
                          set("desiredDate", "");
                        }
                      }}
                      minDate={new Date()}
                      maxDate={(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; })()}
                      filterDate={(date) => {
                        const d = businessHours[String(date.getDay())];
                        if (d?.closed) return false;
                        if (form.deliveryType === "배송") {
                          const today = new Date();
                          if (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) return false;
                        }
                        return true;
                      }}
                      excludeDates={closedDates.map((d) => new Date(d + "T00:00:00"))}
                    />
                  </div>
                </div>

                {/* 수령 희망 시간 */}
                {(() => {
                  const day = selectedDate ? businessHours[String(selectedDate.getDay())] : null;
                  const now = new Date();
                  const isToday = selectedDate
                    ? selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate()
                    : false;
                  const leadMins = (minLeadTimes[form.productType] ?? 2) * 60;
                  const minTimeDate = isToday ? new Date(now.getTime() + leadMins * 60000) : null;

                  // 리드타임 더했더니 날짜가 넘어간 경우 → 오늘 슬롯 없음
                  const leadOverflow = minTimeDate && (
                    minTimeDate.getDate() !== now.getDate() ||
                    minTimeDate.getMonth() !== now.getMonth()
                  );

                  // 분 올림 시 60분 → 시간 올림 처리
                  const roundedMinutes = minTimeDate ? Math.ceil(minTimeDate.getMinutes() / 30) * 30 : 0;
                  const adjustedHour = minTimeDate ? minTimeDate.getHours() + (roundedMinutes === 60 ? 1 : 0) : 0;
                  const adjustedMinute = roundedMinutes === 60 ? 0 : roundedMinutes;

                  const minTime = minTimeDate && !leadOverflow
                    ? `${String(adjustedHour).padStart(2, "0")}:${String(adjustedMinute).padStart(2, "0")}`
                    : day?.open ?? "00:00";
                  const maxTime = day?.close ?? "23:59";
                  const [minH, minM] = minTime.split(":").map(Number);
                  const [maxH, maxM] = maxTime.split(":").map(Number);
                  const slots: string[] = [];
                  if (selectedDate && !leadOverflow) {
                    const leadTotal = Math.ceil((minH * 60 + minM) / 30) * 30;
                    const [openH, openM] = (day?.open ?? "00:00").split(":").map(Number);
                    const openTotal = openH * 60 + openM;
                    const startTotal = Math.max(leadTotal, openTotal);
                    const maxTotal = maxH * 60 + maxM;
                    for (let t = startTotal; t <= maxTotal; t += 30) {
                      slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
                    }
                  }
                  return (
                    <div className="bg-white px-4 py-4 space-y-3">
                      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 pb-3 border-b border-gray-100">
                        수령 희망 시간 <span className="text-red-400">*</span>
                        {day && <span className="text-xs font-normal text-gray-400">영업시간 · {day.open}~{day.close}</span>}
                      </h3>
                      {!selectedDate ? (
                        <p className="text-xs text-gray-400 px-1">날짜를 먼저 선택해주세요.</p>
                      ) : slots.length === 0 ? (
                        <p className="text-xs text-gray-400 px-1">선택 가능한 시간이 없습니다.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => set("desiredTime", slot)}
                              className={`py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                form.desiredTime === slot
                                  ? "bg-gold-500 text-white"
                                  : "bg-beige-100 text-gray-700 hover:bg-beige-200"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 추가 옵션 */}
                {(messageCardEnabled || shoppingBagEnabled) && (
                  <div className="bg-white overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700">추가 옵션</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {messageCardEnabled && !selectedProduct?.message_card_unavailable && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = form.messageCard === "추가" ? "없음" : "추가";
                              set("messageCard", next);
                              if (next === "없음") set("messageCardContent", "");
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.messageCard === "추가" ? "bg-beige-50" : "hover:bg-gray-50"}`}
                          >
                            <div>
                              <span className={`text-sm ${form.messageCard === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>메시지 카드</span>
                              <span className="ml-2 text-xs text-gold-500">+{messageCardPrice.toLocaleString()}원</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.messageCard === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                              {form.messageCard === "추가" && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </button>
                          {form.messageCard === "추가" && (
                            <div className="px-4 pb-3">
                              <textarea
                                value={form.messageCardContent}
                                onChange={(e) => set("messageCardContent", e.target.value)}
                                placeholder="메시지 카드에 적을 내용을 입력해주세요. (30자 이내 작성 권장)"
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {shoppingBagEnabled && !selectedProduct?.bag_included && (
                        <button
                          type="button"
                          onClick={() => set("shoppingBag", form.shoppingBag === "추가" ? "없음" : "추가")}
                          className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.shoppingBag === "추가" ? "bg-beige-50" : "hover:bg-gray-50"}`}
                        >
                          <div>
                            <span className={`text-sm ${form.shoppingBag === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>쇼핑백</span>
                            <span className="ml-2 text-xs text-gold-500">+{shoppingBagPrice.toLocaleString()}원</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.shoppingBag === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                            {form.shoppingBag === "추가" && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 요청 사항 */}
                <div className={`bg-white px-4 pt-4 space-y-2 ${requestsOpen ? "pb-4" : "pb-0 md:pb-4"}`}>
                  {/* 모바일: 토글 헤더 */}
                  <button
                    type="button"
                    onClick={() => setRequestsOpen((v) => !v)}
                    className="md:hidden w-full flex items-center justify-between text-left pb-3 border-b border-gray-100"
                  >
                    <h3 className="text-sm font-medium text-gray-700">요청 사항</h3>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${requestsOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                    </svg>
                  </button>
                  {/* PC: 항상 보이는 레이블 */}
                  <h3 className="hidden md:block text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">요청 사항</h3>
                  <div className={`${requestsOpen ? "block" : "hidden"} md:block`}>
                    <textarea
                      value={form.requests}
                      onChange={(e) => set("requests", e.target.value)}
                      placeholder="추가 요청사항을 입력해주세요. (선택)"
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-400 bg-beige-50 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* 모바일: 동의 + 버튼 */}
                <div className="md:hidden bg-white px-4 py-4 space-y-3">
                  {agreementJsx}
                  {step4FieldErrors.length > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 입력해주세요.</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {step4FieldErrors.map((f) => <li key={f} className="text-xs text-red-500">{f}</li>)}
                      </ul>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? "결제 중..." : "결제하기"}
                  </button>
                </div>
              </div>

              {/* ── 오른쪽: 고정 사이드 패널 (PC 전용) ── */}
              <div className="hidden md:block w-80 shrink-0">
                <div className="sticky top-28 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* 결제 금액 요약 */}
                  {selectedProduct && (
                    <div className="px-5 py-4 border-b border-gray-100 space-y-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">결제 금액</p>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>상품</span>
                        <span>{selectedProduct.price.toLocaleString()}원</span>
                      </div>
                      {messageCardEnabled && form.messageCard === "추가" && (
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>메시지 카드</span>
                          <span>+{messageCardPrice.toLocaleString()}원</span>
                        </div>
                      )}
                      {shoppingBagEnabled && form.shoppingBag === "추가" && (
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>쇼핑백</span>
                          <span>+{shoppingBagPrice.toLocaleString()}원</span>
                        </div>
                      )}
                      {form.deliveryType === "배송" && deliveryFee !== null && (
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
                  )}

                  {/* 동의 + 버튼 */}
                  <div className="px-5 py-4 space-y-4">
                    {agreementJsx}
                    {step4FieldErrors.length > 0 && (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                        <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 입력해주세요.</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {step4FieldErrors.map((f) => <li key={f} className="text-xs text-red-500">{f}</li>)}
                        </ul>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? "결제 중..." : "결제하기"}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {showNotice && (
        <FlowerNoticeModal
          onConfirm={() => { setShowNotice(false); setStep(4); }}
          onClose={() => setShowNotice(false)}
        />
      )}

    </div>
  );
}
