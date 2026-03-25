"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import DaumPostcodeEmbed from "react-daum-postcode";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import "react-datepicker/dist/react-datepicker.css";
import { Product } from "@/types";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";

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
  preselectedProduct?: Product | null;
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

export default function ConsultClient({ slug, companyName, notificationEmail, products, businessHours, closedDates, preselectedProduct = null }: Props) {
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
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ConsultForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const recommendations = useMemo(
    () => scoreProducts(products, form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.productType, form.mood, form.budget, form.budgetCustom]
  );

  const step1Valid =
    form.purpose &&
    (form.purpose !== "기타" || form.purposeCustom) &&
    form.recipientGender &&
    form.recipientAge &&
    form.relationship &&
    (form.relationship !== "기타" || form.relationshipCustom) &&
    (preselectedProduct || (form.productType && form.mood && form.budget && (form.budget !== "기타" || form.budgetCustom)));

  const handleSubmit = async () => {
    if (!selectedProduct || !name || !phone) return;
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
          form,
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            product_type: selectedProduct.product_type,
            image_url: selectedProduct.image_url,
          },
          orderer: { name, phone },
          delivery: form.deliveryType === "배송" ? {
            recipientName,
            recipientPhone,
            address,
            addressDetail,
          } : null,
          finalPrice: selectedProduct.price +
            (form.messageCard === "있음" ? 2000 : 0) +
            (form.shoppingBag === "있음" ? 2000 : 0),
        }),
      });
      if (!res.ok) throw new Error("예약 전송 실패");
      setSubmitted(true);
    } catch {
      setError("예약 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
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
    return (
      <div className="min-h-screen bg-beige-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🌸</div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">예약이 접수되었습니다</h2>
          <p className="text-gray-500 text-sm mb-6">
            확인 후 연락드리겠습니다!
            <br />감사합니다.
          </p>
          <Link
            href={`/${slug}`}
            className="text-gold-500 text-sm hover:text-gold-600 transition-colors"
          >
            홈으로 돌아가기 →
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

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── STEP 1: 옵션 선택 ── */}
        {step === 1 && (
          <div className="space-y-8">
            <Section title="선물 목적" required>
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

            <Section title="받는 분 성별" required>
              <div className="flex flex-wrap gap-2">
                {["여성", "남성"].map((v) => (
                  <Chip key={v} label={v} selected={form.recipientGender === v} onClick={() => set("recipientGender", v)} />
                ))}
              </div>
            </Section>

            <Section title="받는 분 나이대" required>
              <div className="flex flex-wrap gap-2">
                {["10대", "20대", "30대", "40대", "50대 이상"].map((v) => (
                  <Chip key={v} label={v} selected={form.recipientAge === v} onClick={() => set("recipientAge", v)} />
                ))}
              </div>
            </Section>

            <Section title="받는 분과의 관계" required>
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

            <button
              type="button"
              disabled={!step1Valid}
              onClick={() => setStep(preselectedProduct ? 3 : 2)}
              className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    className={`relative flex flex-col rounded-xl border transition-all text-left overflow-hidden ${
                      selectedProduct?.id === product.id
                        ? "border-gold-500 bg-gold-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
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
                  value: form.productType === "기타" ? form.productTypeCustom : form.productType,
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
                        (form.messageCard === "있음" ? 2000 : 0) +
                        (form.shoppingBag === "있음" ? 2000 : 0)
                      ).toLocaleString()}원
                    </span>
                    {(form.messageCard === "있음" || form.shoppingBag === "있음") && (
                      <span className="text-xs text-gray-400 ml-2">
                        상품 {selectedProduct.price.toLocaleString()}원
                        {form.messageCard === "있음" && " + 메시지카드 2,000원"}
                        {form.shoppingBag === "있음" && " + 쇼핑백 2,000원"}
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
                    {["있음", "없음"].map((v) => (
                      <Chip key={v} label={v} selected={form.messageCard === v} onClick={() => { set("messageCard", v); if (v === "없음") set("messageCardContent", ""); }} />
                    ))}
                  </div>
                  {form.messageCard === "있음" && (
                    <div className="relative">
                      <textarea
                        value={form.messageCardContent}
                        onChange={(e) => set("messageCardContent", e.target.value.slice(0, 30))}
                        placeholder="메시지 카드에 적을 내용을 입력해주세요."
                        maxLength={30}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-500 bg-white"
                      />
                      <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {form.messageCardContent.length}/30
                      </span>
                    </div>
                  )}
                </Section>

                <Section title="쇼핑백" badge="+2,000원" required>
                  <div className="flex gap-2">
                    {["있음", "없음"].map((v) => (
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
                  {["픽업", "배송"].map((v) => (
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
                        onChange={(e) => setRecipientPhone(e.target.value)}
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
                          onComplete={(data) => {
                            setAddress(data.roadAddress || data.jibunAddress);
                            setShowPostcode(false);
                          }}
                          style={{ height: 400 }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section title="수령 희망 일시" required>
                <DatePicker
                  locale="ko"
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    setSelectedDate(date);
                    if (date) {
                      set("desiredDate", date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim());
                      set("desiredTime", date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }));
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={30}
                  dateFormat="yyyy년 MM월 dd일 (eee) HH:mm"
                  minDate={new Date()}
                  filterDate={(date) => {
                    const day = businessHours[String(date.getDay())];
                    return !day?.closed;
                  }}
                  filterTime={(time) => {
                    const base = selectedDate ?? time;
                    const day = businessHours[String(base.getDay())];
                    if (!day || day.closed) return false;
                    const [oh, om] = day.open.split(":").map(Number);
                    const [ch, cm] = day.close.split(":").map(Number);
                    const mins = time.getHours() * 60 + time.getMinutes();
                    const inBusiness = mins >= oh * 60 + om && mins <= ch * 60 + cm;
                    const now = new Date();
                    const isToday =
                      base.getFullYear() === now.getFullYear() &&
                      base.getMonth() === now.getMonth() &&
                      base.getDate() === now.getDate();
                    if (isToday && time.getHours() * 60 + time.getMinutes() <= now.getHours() * 60 + now.getMinutes()) return false;
                    return inBusiness;
                  }}
                  excludeDates={closedDates.map((d) => new Date(d + "T00:00:00"))}
                  placeholderText="날짜와 시간을 선택해주세요"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-white cursor-pointer"
                  wrapperClassName="w-full"
                  calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg"
                  popperPlacement="bottom-start"
                />
              </Section>

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
                  placeholder="연락처 (숫자만)"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length <= 11) setPhone(digits);
                  }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white transition-colors ${
                    phone && (phone.length < 10 || phone.length > 11)
                      ? "border-red-300 focus:border-red-400"
                      : "border-gray-300 focus:border-gray-500"
                  }`}
                />
                {phone && (phone.length < 10 || phone.length > 11) && (
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
                disabled={
                  !name || phone.length < 10 || phone.length > 11 ||
                  !form.messageCard || !form.shoppingBag ||
                  !form.deliveryType || !form.desiredDate ||
                  (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) ||
                  !privacyAgreed ||
                  submitting
                }
                onClick={handleSubmit}
                className="flex-1 bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "예약 중..." : "예약하기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
