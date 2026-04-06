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
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
// import * as PortOne from "@portone/browser-sdk/v2"; // 결제 비활성화 중

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

interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

type BusinessHours = Record<string, DayHours>;

interface Props {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
  products: Product[];
  businessHours: BusinessHours;
  closedDates: string[];
  minLeadTimes?: Record<string, number>;
  consultNotice?: string | null;
  storeAddress?: string | null;
  deliveryEnabled?: boolean;
  deliveryFees?: Record<string, number>;
  preselectedProduct?: Product | null;
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

function TimePicker({ value, onChange, minTime, maxTime, disabled }: {
  value: string;
  onChange: (v: string) => void;
  minTime: string;
  maxTime: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const slots = useMemo(() => {
    const [minH, minM] = minTime.split(":").map(Number);
    const [maxH, maxM] = maxTime.split(":").map(Number);
    const minTotal = minH * 60 + minM;
    const maxTotal = maxH * 60 + maxM;
    const result: string[] = [];
    // 첫 슬롯: minTotal을 30분 단위로 올림
    const startTotal = Math.ceil(minTotal / 30) * 30;
    for (let t = startTotal; t <= maxTotal; t += 30) {
      const h = String(Math.floor(t / 60)).padStart(2, "0");
      const m = String(t % 60).padStart(2, "0");
      result.push(`${h}:${m}`);
    }
    return result;
  }, [minTime, maxTime]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between transition-colors bg-white ${disabled ? "border-gray-200 bg-gray-50 cursor-not-allowed" : open ? "border-gold-400" : "border-gray-300 hover:border-gray-400"} ${value ? "text-gray-900" : "text-gray-400"}`}
      >
        <span>{value || "시간을 선택해주세요"}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2 max-h-52 overflow-y-auto">
          {slots.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">선택 가능한 시간이 없습니다</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 px-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { onChange(slot); setOpen(false); }}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${value === slot ? "bg-gold-500 text-white" : "text-gray-700 hover:bg-beige-100"}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TYPE_MAP: Record<string, string> = {
  꽃다발: "다발",
  바구니: "바구니",
  센터피스: "센터피스",
  화병꽂이: "화병꽂이",
};

const MOOD_COLORS: Record<string, string[]> = {
  "깔끔한 화이트&그린": ["흰색", "초록색"],
  "화사한 파스텔톤": ["핑크색", "노란색", "주황색"],
  "선명한 비비드톤": ["빨간색", "주황색", "노란색"],
  "차분한 딥컬러": ["빨간색", "보라색", "검은색"],
};

const MOOD_WRAPPING: Record<string, string> = {
  "깔끔한 화이트&그린": "밝은 계열",
  "화사한 파스텔톤": "밝은 계열",
  "선명한 비비드톤": "밝은 계열",
  "차분한 딥컬러": "어두운 계열",
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

  const inBudget = (p: Product) =>
    budget > 0 ? p.price >= budget && p.price <= budget + 50000 : true;
  const inBudgetExpanded = (p: Product) =>
    budget > 0 ? p.price >= budget - 10000 && p.price <= budget + 50000 : true;

  // 1차: 가격 + 상품 형태 일치
  let pool = products.filter((p) => inBudget(p) && (!mappedType || p.product_type === mappedType));
  // 2차: 가격 범위 확장 + 상품 형태 일치
  if (pool.length < 4)
    pool = products.filter((p) => inBudgetExpanded(p) && (!mappedType || p.product_type === mappedType));
  // 3차: 상품 형태 무관, 가격만 맞는 것
  if (pool.length < 4)
    pool = products.filter((p) => inBudgetExpanded(p));
  if (pool.length === 0) pool = products;

  const moodColors = MOOD_COLORS[form.mood] ?? [];

  return pool
    .map((p) => {
      let score = 0;

      if (mappedType && p.product_type === mappedType) score += 4;

      const moodColorMatches = p.flower_colors.filter((c) => moodColors.includes(c)).length;
      score += moodColorMatches * 2;

      if (p.wrapping_color === MOOD_WRAPPING[form.mood]) score += 1;
      if (p.is_recommended) score += 2;
      if (p.is_popular) score += 1;

      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ product }) => product);
}

export default function ConsultClient({ slug, companyName, notificationEmail, products, businessHours, closedDates, minLeadTimes = {}, consultNotice, storeAddress = null, deliveryEnabled = false, deliveryFees = {}, preselectedProduct = null }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<ConsultForm>(EMPTY_FORM);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPostcode, setShowPostcode] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [kakaoConsent, setKakaoConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [finalPriceSnapshot, setFinalPriceSnapshot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step1FieldErrors, setStep1FieldErrors] = useState<string[]>([]);
  const [step3FieldErrors, setStep3FieldErrors] = useState<string[]>([]);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  const set = (key: keyof ConsultForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const recommendations = useMemo(
    () => scoreProducts(products, form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.productType, form.mood, form.budget, form.budgetCustom]
  );

  const step1Valid =
    preselectedProduct || (form.productType && form.mood && form.budget && (form.budget !== "기타" || form.budgetCustom));

  const handleStep1Next = () => {
    const missing: string[] = [];
    if (!preselectedProduct) {
      if (!form.productType) missing.push("상품 형태");
      if (!form.mood) missing.push("분위기");
      if (!form.budget || (form.budget === "기타" && !form.budgetCustom)) missing.push("희망 예산");
    }
    if (missing.length > 0) {
      setStep1FieldErrors(missing);
      return;
    }
    setStep1FieldErrors([]);
    setStep(preselectedProduct ? 3 : 2);
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!name) missing.push("예약자 이름");
    if (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) missing.push("연락처 (10~11자리)");
    if (!form.deliveryType) missing.push("수령 방법");
    if (!form.desiredDate) missing.push("수령 희망 날짜");
    if (form.desiredDate && !form.desiredTime) missing.push("수령 희망 시간");
    if (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) missing.push("배송 정보");
    if (form.deliveryType === "배송" && deliveryDistance !== null && deliveryFee === null) missing.push("배송 가능 여부를 매장에 문의해주세요");
    if (!privacyAgreed) missing.push("개인정보처리방침 동의");
    if (missing.length > 0) {
      setStep3FieldErrors(missing);
      return;
    }
    setStep3FieldErrors([]);
    if (!selectedProduct) return;
    setSubmitting(true);
    setError(null);

    const finalPrice = selectedProduct.price +
      (form.messageCard === "추가" ? 2000 : 0) +
      (form.shoppingBag === "추가" ? 2000 : 0) +
      (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0);

    try {
      /* ── 포트원 카드 결제 (임시 비활성화) ──────────────────────────
      const paymentId = `order${Date.now()}`;
      const payResponse = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${companyName} 맞춤 주문`,
        totalAmount: finalPrice,
        currency: "KRW",
        payMethod: "CARD",
        customer: { fullName: name, phoneNumber: parsePhone(phone) },
      });
      if (!payResponse || "code" in payResponse) {
        setError(("message" in (payResponse ?? {}) ? (payResponse as { message: string }).message : null) ?? "결제가 취소되었습니다.");
        setSubmitting(false);
        return;
      }
      ─────────────────────────────────────────────────────────────── */

      // 계좌이체 모드 — paymentId 없이 예약 저장
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          companyName,
          notificationEmail,
          form,
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            product_type: selectedProduct.product_type,
            image_url: selectedProduct.image_url,
          },
          orderer: { name, phone: parsePhone(phone) },
          kakaoConsent,
          delivery: form.deliveryType === "배송" ? {
            recipientName,
            recipientPhone: parsePhone(recipientPhone),
            address,
            addressDetail,
          } : null,
          finalPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "예약 저장 실패");
      setReservationId(data.reservationId ?? null);
      setBankInfo({
        bankName: data.bankName ?? null,
        bankAccount: data.bankAccount ?? null,
        bankHolder: data.bankHolder ?? null,
      });
      setFinalPriceSnapshot(finalPrice);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "예약 중 오류가 발생했습니다. 다시 시도해주세요.");
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

  if (showNotice) {
    return (
      <FlowerNoticeModal
        onConfirm={() => { setShowNotice(false); setStep(3); }}
        onClose={() => setShowNotice(false)}
      />
    );
  }

  if (submitted) {
    if (paidConfirmed) {
      return (
        <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-beige-200 p-8 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900">입금 확인 감사합니다</h2>
            <p className="text-sm text-gray-400">매장에서 확인 후 준비를 시작하겠습니다.</p>
            <Link href={`/${slug}`} className="block text-center text-gold-500 text-sm hover:text-gold-600 transition-colors">
              홈으로 돌아가기 →
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-beige-200 p-8 space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-beige-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gold-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900">주문이 접수되었습니다</h2>
            <p className="text-sm text-gray-400 mt-1">아래 계좌로 입금해주세요.</p>
          </div>

          {bankInfo?.bankAccount ? (
            <div className="bg-beige-50 border border-beige-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">은행</span>
                <span className="font-medium text-gray-800">{bankInfo.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">계좌번호</span>
                <span className="font-medium text-gray-800">{bankInfo.bankAccount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">예금주</span>
                <span className="font-medium text-gray-800">{bankInfo.bankHolder}</span>
              </div>
              <div className="border-t border-beige-200 pt-2 flex justify-between text-sm">
                <span className="text-gray-400">입금 금액</span>
                <span className="font-semibold text-gray-900">{finalPriceSnapshot.toLocaleString()}원</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">매장에서 계좌 정보를 안내드릴 예정입니다.</p>
          )}

          <button
            type="button"
            onClick={handlePaidConfirm}
            disabled={payLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#2c2416" }}
          >
            {payLoading ? "처리 중..." : "입금 완료 시 눌러주세요"}
          </button>
          <Link href={`/${slug}`} className="block text-center text-gray-400 text-sm hover:text-gray-600 transition-colors">
            나중에 입금하기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
      <header className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            ← 홈으로
          </Link>
          <span className="text-sm font-medium text-gray-700">{companyName} — 맞춤 주문</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          {(preselectedProduct
            ? [{ num: 1 as const, label: "옵션 선택" }, { num: 3 as const, label: "예약 확인" }]
            : [{ num: 1 as const, label: "옵션 선택" }, { num: 2 as const, label: "상품 추천" }, { num: 3 as const, label: "예약 확인" }]
          ).map(({ num, label }, i) => (
            <div key={num} className="flex items-center gap-2">
              {i > 0 && <div className="flex-1 h-px bg-gray-200 w-8" />}
              <div
                className={`flex items-center gap-1.5 ${
                  step === num
                    ? "text-gold-500"
                    : step > num
                    ? "text-gray-400"
                    : "text-gray-300"
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
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* ── STEP 1: 옵션 선택 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <Section title="선물 목적">
              <div className="flex flex-wrap gap-2">
                {["기념", "축하", "감사", "위로", "기타"].map((v) => (
                  <Chip key={v} label={v} selected={form.purpose === v} onClick={() => set("purpose", v)} />
                ))}
              </div>
              {form.purpose === "기타" && (
                <input
                  type="text"
                  placeholder="직접 입력"
                  value={form.purposeCustom}
                  onChange={(e) => set("purposeCustom", e.target.value)}
                  className="mt-2 w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                />
              )}
            </Section>

            <Section title="받는 분 유형">
              <div className="flex flex-wrap gap-2">
                {["여성", "남성", "부모님"].map((v) => (
                  <Chip key={v} label={v} selected={form.recipientGender === v} onClick={() => set("recipientGender", v)} />
                ))}
              </div>
            </Section>

            <Section title="받는 분 나이대">
              <div className="flex flex-wrap gap-2">
                {["10대", "20대", "30대", "40대", "50대 이상"].map((v) => (
                  <Chip key={v} label={v} selected={form.recipientAge === v} onClick={() => set("recipientAge", v)} />
                ))}
              </div>
            </Section>

            <Section title="받는 분과의 관계">
              <div className="flex flex-wrap gap-2">
                {["연인", "가족", "친구", "직장동료/상사", "기타"].map((v) => (
                  <Chip key={v} label={v} selected={form.relationship === v} onClick={() => set("relationship", v)} />
                ))}
              </div>
              {form.relationship === "기타" && (
                <input
                  type="text"
                  placeholder="직접 입력"
                  value={form.relationshipCustom}
                  onChange={(e) => set("relationshipCustom", e.target.value)}
                  className="mt-2 w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                />
              )}
            </Section>

            {!preselectedProduct && (
              <>
                <Section title="상품 형태" required>
                  <div className="flex flex-wrap gap-2">
                    {["꽃다발", "바구니", "센터피스", "화병꽂이", "기타"].map((v) => (
                      <Chip key={v} label={v} selected={form.productType === v} onClick={() => set("productType", v)} />
                    ))}
                  </div>
                </Section>

                <Section title="선호하는 분위기" required>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: "깔끔한 화이트&그린", swatches: ["#f5f5f5", "#e8ede0", "#22c55e"] },
                      { value: "화사한 파스텔톤", swatches: ["#f9c0d0", "#fff4a3", "#ffd4b8"] },
                      { value: "선명한 비비드톤", swatches: ["#ff4040", "#ff8c00", "#ffe600"] },
                      { value: "차분한 딥컬러", swatches: ["#c0392b", "#7d3c98", "#2c2416"] },
                    ].map(({ value, swatches }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("mood", value)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                          form.mood === value
                            ? "border-gold-500 bg-white shadow-sm"
                            : "border-transparent bg-white hover:border-gray-200 shadow-none"
                        } ring-1 ${form.mood === value ? "ring-gold-300" : "ring-gray-200"}`}
                      >
                        {form.mood === value && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center text-white text-xs">
                            ✓
                          </span>
                        )}
                        <div className="flex gap-1.5 mb-2">
                          {swatches.map((c) => (
                            <div key={c} className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className={`text-sm font-medium transition-colors ${form.mood === value ? "text-gold-600" : "text-gray-700"}`}>{value}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="희망 예산" required>
                  <div className="flex flex-wrap gap-2">
                    {["3만원", "5만원", "7만원", "10만원", "12만원", "15만원", "기타"].map((v) => (
                      <Chip key={v} label={v} selected={form.budget === v} onClick={() => set("budget", v)} />
                    ))}
                  </div>
                  {form.budget === "기타" && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="직접 입력"
                        value={form.budgetCustom}
                        onChange={(e) => set("budgetCustom", e.target.value)}
                        className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 bg-white"
                      />
                      <span className="text-sm text-gray-500">만원</span>
                    </div>
                  )}
                </Section>
              </>
            )}

            {step1FieldErrors.length > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 선택해주세요.</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {step1FieldErrors.map((f) => (
                    <li key={f} className="text-xs text-red-500">{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={handleStep1Next}
              className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 transition-colors"
            >
              {preselectedProduct ? "예약 정보 입력하기" : "추천 상품 보기"}
            </button>
          </div>
        )}

        {/* ── STEP 2: 추천 상품 선택 ── */}
        {step === 2 && (
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
              <div className="grid grid-cols-2 gap-3">
                {recommendations.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className={`relative flex flex-col rounded-xl text-left overflow-hidden transition-all ${
                      selectedProduct?.id === product.id
                        ? "border-2 border-gold-500 bg-white"
                        : "border border-gray-200 bg-white hover:border-gray-300"
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
                    <div className="flex-1 min-w-0 p-3">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-gray-900 text-sm leading-snug">{product.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{product.product_type}</span>
                      <div className="mt-1 text-gold-600 font-medium text-sm">
                        {product.price.toLocaleString()}원
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setSelectedProduct(null); }}
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

        {/* ── STEP 3: 예약자 정보 & 확인 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">예약 확인</h2>
              <p className="text-sm text-gray-500">정보를 확인하고 예약을 완료해주세요.</p>
            </div>

            {consultNotice && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{consultNotice}</p>
              </div>
            )}

            {/* 선택 상품 */}
            {selectedProduct && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-beige-200 shrink-0">
                  {selectedProduct.image_url ? (
                    <Image
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🌸</div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{selectedProduct.product_type}</div>
                  <div className="text-gold-600 font-medium text-sm mt-1">
                    {selectedProduct.price.toLocaleString()}원
                  </div>
                </div>
              </div>
            )}

            {/* 선택 옵션 요약 */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
              {[
                {
                  label: "선물 목적",
                  value: form.purpose === "기타" ? form.purposeCustom : form.purpose,
                },
                {
                  label: "받는 분",
                  value: `${form.recipientGender} · ${form.recipientAge} · ${form.relationship === "기타" ? form.relationshipCustom : form.relationship}`,
                },
                {
                  label: "상품 형태",
                  value: form.productType === "기타" ? form.productTypeCustom : (form.productType || selectedProduct?.product_type || ""),
                },
                { label: "선호 분위기", value: form.mood },
                {
                  label: "희망 예산",
                  value: form.budget === "기타" ? `${form.budgetCustom}만원` : form.budget,
                },
                { label: "메세지 카드", value: form.messageCard === "있음" && form.messageCardContent ? `있음 — ${form.messageCardContent}` : form.messageCard },
                { label: "쇼핑백", value: form.shoppingBag },
                { label: "수령 방법", value: form.deliveryType },
                {
                  label: "수령 희망 일시",
                  value: `${form.desiredDate}${form.desiredTime ? ` ${form.desiredTime}` : ""}`,
                },
                ...(form.requests ? [{ label: "요청 사항", value: form.requests }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex px-4 py-3">
                  <span className="text-gray-400 w-28 shrink-0">{label}</span>
                  <span className="text-gray-700">{value}</span>
                </div>
              ))}
              {selectedProduct && (
                <div className="flex px-4 py-3 bg-beige-50">
                  <span className="text-gray-500 font-medium w-28 shrink-0">최종 가격</span>
                  <div className="text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {(
                        selectedProduct.price +
                        (form.messageCard === "추가" ? 2000 : 0) +
                        (form.shoppingBag === "추가" ? 2000 : 0) +
                        (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0)
                      ).toLocaleString()}원
                    </span>
                    {(form.messageCard === "추가" || form.shoppingBag === "추가" || (form.deliveryType === "배송" && deliveryFee !== null)) && (
                      <span className="text-xs text-gray-400 ml-2">
                        상품 {selectedProduct.price.toLocaleString()}원
                        {form.messageCard === "추가" && " + 메시지카드 2,000원"}
                        {form.shoppingBag === "추가" && " + 쇼핑백 2,000원"}
                        {form.deliveryType === "배송" && deliveryFee !== null && ` + 배송비 ${deliveryFee.toLocaleString()}원`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 메세지 카드 / 쇼핑백 / 수령 방법 / 일시 / 요청사항 */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <Section title="메세지 카드" badge="+2,000원" required>
                  <div className="flex gap-2">
                    {["추가", "없음"].map((v) => (
                      <Chip key={v} label={v} selected={form.messageCard === v} onClick={() => { set("messageCard", v); if (v === "없음") set("messageCardContent", ""); }} />
                    ))}
                  </div>
                  {form.messageCard === "추가" && (
                    <textarea
                      value={form.messageCardContent}
                      onChange={(e) => set("messageCardContent", e.target.value)}
                      placeholder="메시지 카드에 적을 내용을 입력해주세요. (30자 이내 작성 권장)"
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-500 bg-white"
                    />
                  )}
                </Section>

                <Section title="쇼핑백" badge="+2,000원" required>
                  <div className="flex gap-2">
                    {["추가", "없음"].map((v) => (
                      <Chip key={v} label={v} selected={form.shoppingBag === v} onClick={() => set("shoppingBag", v)} />
                    ))}
                  </div>
                  {selectedProduct && selectedProduct.price >= 100000 && (
                    <p className="text-xs text-gold-600">10만원 이상 상품엔 쇼핑백 1개가 서비스로 제공됩니다.</p>
                  )}
                </Section>
              </div>
              <Section title="수령 방법" required>
                <div className="flex gap-2">
                  {(deliveryEnabled ? ["픽업", "배송"] : ["픽업"]).map((v) => (
                    <Chip key={v} label={v} selected={form.deliveryType === v} onClick={() => set("deliveryType", v)} />
                  ))}
                </div>
                {form.deliveryType === "배송" && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="받는 분 이름"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500 bg-white"
                      />
                      <input
                        type="tel"
                        placeholder="받는 분 전화번호"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(formatPhone(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="주소"
                          value={address}
                          readOnly
                          onClick={() => setShowPostcode(true)}
                          className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500 bg-white cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPostcode(true)}
                          className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-gray-500 bg-white transition-colors whitespace-nowrap"
                        >
                          찾기
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="상세주소"
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500 bg-white"
                      />
                    </div>
                    {/* 거리 표시 */}
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
                          <button
                            type="button"
                            onClick={() => setShowPostcode(false)}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                          >
                            ✕
                          </button>
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
                              const [storePt, customerPt] = await Promise.all([
                                geocodeKakao(storeAddress),
                                geocodeKakao(customerAddr),
                              ]);
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
              </Section>

              <div className="grid grid-cols-2 gap-3 items-start">
              <Section title="수령 희망 날짜" required>
                <DatePicker
                  locale="ko"
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
                  dateFormat="yyyy년 MM월 dd일 (eee)"
                  minDate={new Date()}
                  filterDate={(date) => {
                    const day = businessHours[String(date.getDay())];
                    if (day?.closed) return false;
                    if (form.deliveryType === "배송") {
                      const today = new Date();
                      const isToday =
                        date.getFullYear() === today.getFullYear() &&
                        date.getMonth() === today.getMonth() &&
                        date.getDate() === today.getDate();
                      if (isToday) return false;
                    }
                    return true;
                  }}
                  excludeDates={closedDates.map((d) => new Date(d + "T00:00:00"))}
                  placeholderText="날짜를 선택해주세요"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-white cursor-pointer"
                  wrapperClassName="w-full"
                  calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg"
                  popperPlacement="bottom-start"
                />
              </Section>

              {(() => {
                const day = selectedDate ? businessHours[String(selectedDate.getDay())] : null;
                const now = new Date();
                const isToday = selectedDate
                  ? selectedDate.getFullYear() === now.getFullYear() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getDate() === now.getDate()
                  : false;
                const leadMins = (minLeadTimes[form.productType] ?? 2) * 60;
                const minTimeDate = isToday ? new Date(now.getTime() + leadMins * 60000) : null;
                const minTime = minTimeDate
                  ? `${String(minTimeDate.getHours()).padStart(2, "0")}:${String(Math.ceil(minTimeDate.getMinutes() / 30) * 30 === 60 ? 0 : Math.ceil(minTimeDate.getMinutes() / 30) * 30).padStart(2, "0")}`
                  : day?.open ?? "00:00";
                return (
                  <Section
                    title="수령 희망 시간"
                    required
                    badge={day ? `영업시간 · ${day.open}~${day.close}${isToday ? ` (${minLeadTimes[form.productType] ?? 2}h 후~)` : ""}` : undefined}
                  >
                    <TimePicker
                      value={form.desiredTime}
                      onChange={(v) => set("desiredTime", v)}
                      minTime={minTime}
                      maxTime={day?.close ?? "23:59"}
                      disabled={!selectedDate}
                    />
                    {!selectedDate && <p className="text-xs text-gray-300">날짜를 먼저 선택해주세요</p>}
                  </Section>
                );
              })()}
              </div>

              <Section title="요청 사항">
                <textarea
                  value={form.requests}
                  onChange={(e) => set("requests", e.target.value)}
                  placeholder="추가 요청사항을 입력해주세요. (선택)"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-500 bg-white"
                />
              </Section>
            </div>

            {/* 예약자 정보 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                예약자 정보 <span className="text-red-400">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 items-start">
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500 bg-white"
              />
              <div>
                <input
                  type="tel"
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white transition-colors ${
                    phone && (parsePhone(phone).length < 10 || parsePhone(phone).length > 11)
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-300 focus:border-gray-500"
                  }`}
                />
                {phone && (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) && (
                  <p className="mt-1 text-xs text-red-500">연락처는 10~11자리로 입력해주세요.</p>
                )}
              </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="mt-0.5 accent-gold-500"
              />
              <span>
                <Link href="/privacy" target="_blank" className="underline text-gold-600">개인정보처리방침</Link>에 동의합니다. (필수)
              </span>
            </label>

            <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={kakaoConsent}
                onChange={(e) => setKakaoConsent(e.target.checked)}
                className="mt-0.5 accent-gold-500"
              />
              <span>
                카카오톡 알림 받기(선택) - 예약 확정, 예약 취소 알림 발송
              </span>
            </label>

            {step3FieldErrors.length > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 입력해주세요.</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {step3FieldErrors.map((f) => (
                    <li key={f} className="text-xs text-red-500">{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(preselectedProduct ? 1 : 2)}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-400 transition-colors"
              >
                이전
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-40 transition-colors"
              >
                {submitting ? "결제 중..." : "결제 및 예약하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
