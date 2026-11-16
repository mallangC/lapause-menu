"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { preloadOrderInputs } from "@/components/LazyOrderInputs";
import { Product } from "@/types";
import OrderCheckout, { type CheckoutOrder } from "@/components/order/OrderCheckout";
import { EMPTY_FORM, type ConsultForm } from "@/components/order/orderTypes";
import { FLOWER_COLOR_MAP, MOODS } from "@/lib/constants";
import type { DateOverrides } from "@/lib/businessHours";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
import StoreHeader from "@/components/main/StoreHeader";
import ColorMinPriceHint from "@/components/ColorMinPriceHint";
import { recommendProducts } from "@/lib/recommend";
import { AFTER_HOURS_OFF, type AfterHours } from "@/lib/afterHours";
import { PHOTO_PRODUCT_ID, isVirtualProductId, makeStyleProduct, readPhotoOrder, type ChatAnswers, type StyleOrder, styleOrderRequests } from "@/lib/styleOrder";


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
  dateOverrides?: DateOverrides;
  minLeadTimes?: Record<string, number>;
  consultNotice?: string | null;
  storeAddress?: string | null;
  deliveryEnabled?: boolean;
  deliveryFees?: Record<string, number>;
  messageCardEnabled?: boolean;
  messageCardPrice?: number;
  shoppingBagEnabled?: boolean;
  shoppingBagPrice?: number;
  preservativeEnabled?: boolean;
  preservativePrice?: number;
  isDemo?: boolean;
  preselectedProduct?: Product | null;
  /** 첫 화면 대화('사장님 스타일로 알아서')에서 정한 주문 — 있으면 상품 고르기 없이 바로 예약 확인 */
  styleOrder?: StyleOrder | null;
  /** 첫 화면 대화형 추천에서 상품을 고르고 온 경우 — 대화에서 받은 답 (있으면 바로 예약 확인) */
  chatAnswers?: ChatAnswers | null;
  /** 오늘 매장에 있는 꽃 색상 (사장님이 오늘 알려준 경우만) */
  todayColors?: string[];
  /** 색 맞춤 가능 일수 */
  colorLeadDays?: number;
  /** 오늘 꽃 색상 기능을 켰는지 (끄면 색을 고르지 않는다) */
  colorPickEnabled?: boolean;
  /** 색 맞춤 최소 금액 (상품 금액 기준, 0이면 제한 없음) */
  colorMinPrice?: number;
  /** 영업시간 외 수령 가능 범위 (꺼져 있으면 범위 없음) */
  afterHours?: AfterHours;
  /** 무통장 입금를 받을 수 있는지 (매장 계좌가 등록돼 있을 때) */
  transferAvailable?: boolean;
  initialQuantity?: number;
  initialPaymentId?: string | null;
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


const BUDGET_MAP: Record<string, number> = {
  "3만원": 30000,
  "5만원": 50000,
  "7만원": 70000,
  "10만원": 100000,
  "12만원": 120000,
  "15만원": 150000,
};

// 추천 계산은 첫 화면 대화형 추천과 같은 규칙 (src/lib/recommend.ts)
function scoreProducts(products: Product[], form: ConsultForm): Product[] {
  // 희망 금액은 만 원 단위 글자('5.5' = 55,000원 — 직접 입력하면 천 원 단위까지)
  const budget = form.budget === "기타" ? Math.round((Number(form.budgetCustom) || 0) * 10000) : BUDGET_MAP[form.budget] ?? 0;
  return recommendProducts(products, { productType: form.productType, mood: form.mood, budget });
}

export default function ConsultClient({ slug, companyName, logoImage = null, productTypeList = [], seasonList = [], notificationEmail, products, businessHours, closedDates, dateOverrides = {}, minLeadTimes = {}, consultNotice, storeAddress = null, deliveryEnabled = false, deliveryFees = {}, messageCardEnabled = false, messageCardPrice = 2000, shoppingBagEnabled = false, shoppingBagPrice = 2000, preservativeEnabled = false, preservativePrice = 500, isDemo = false, preselectedProduct = null, styleOrder = null, chatAnswers = null, todayColors = [], colorLeadDays = 0, colorPickEnabled = true, colorMinPrice = 0, afterHours = AFTER_HOURS_OFF, transferAvailable = false, initialQuantity = 1, initialPaymentId = null }: Props) {
  // 첫 화면 대화에서 선물 정보·취향을 이미 받고 온 주문 (사장님 스타일·사진 주문·대화형 추천)
  const chat = styleOrder ?? chatAnswers;
  const fromChat = !!chat;
  // 결제창에서 돌아왔으면 바로 결제 화면(4단계) — 보관해 둔 주문서는 결제 화면이 읽는다
  const [step, setStep] = useState<1 | 2 | 3 | 4>(fromChat || initialPaymentId ? 4 : 1);
  // 사장님 스타일 주문 — 대화에서 받은 선물 정보·취향·예산을 채워 둔다 (예산은 '기타 n만원'으로)
  const [form, setForm] = useState<ConsultForm>(() =>
    chat
      ? {
          ...EMPTY_FORM,
          purpose: chat.purpose,
          purposeCustom: chat.purpose === "기타" ? "기타" : "",
          recipientGender: chat.gender,
          recipientAge: chat.age,
          productType: chat.productType,
          mood: chat.mood,
          budget: "기타",
          budgetCustom: String(chat.budget / 10000),
          // 사장님 스타일의 피하고 싶은 것은 요청 사항 맨 위에 글로 (따로 저장하지 않는다)
          requests: styleOrder ? styleOrderRequests(styleOrder) : "",
        }
      : EMPTY_FORM
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct ?? (styleOrder ? makeStyleProduct(styleOrder) : null));
  // 찾아본 사진 주문 — 이 탭에 보관해 둔 손님 사진을 상품 사진 자리에 넣는다 (서버 화면에선 읽을 수 없어 화면에 뜬 뒤 채운다)
  // 마지막 단계의 달력·주소 검색을 미리 받아 둔다 (넘어갔을 때 바로 보이게)
  useEffect(() => { preloadOrderInputs(); }, []);

  useEffect(() => {
    if (styleOrder?.kind !== "photo") return;
    const data = readPhotoOrder(slug);
    if (data) setSelectedProduct((p) => (p && p.id === PHOTO_PRODUCT_ID ? { ...p, image_url: data } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결제 실패로 돌아와 되살린 주문 — 앞 단계 화면(상품·주문서)도 같은 주문으로 맞춘다
  const restoreFromOrder = (o: CheckoutOrder) => {
    if (o.kind !== "single") return;
    setForm(o.taste);
    setSelectedProduct(
      isVirtualProductId(o.product.id)
        ? makeStyleProduct({
            kind: o.product.id === PHOTO_PRODUCT_ID ? "photo" : "style",
            productType: o.taste.productType,
            mood: o.taste.mood,
            budget: o.product.price,
            // 찾아본 사진은 이 탭에 보관해 둔 사진으로
            refImage: o.product.id === PHOTO_PRODUCT_ID ? readPhotoOrder(slug) : null,
          })
        : products.find((p) => p.id === o.product.id) ?? null
    );
    setStep(4);
  };
  const [showNotice, setShowNotice] = useState(false);
  const [step2FieldErrors, setStep2FieldErrors] = useState<string[]>([]);
  const [activeSection1, setActiveSection1] = useState(0);
  const [activeSection2, setActiveSection2] = useState(0);

  // 단계 전환 시 이전 단계에서의 스크롤 위치가 남아있지 않도록 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);


  const set = (key: keyof ConsultForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
    if (!form.budget || (form.budget === "기타" && !form.budgetCustom)) missing.push("희망 금액");
    if (missing.length > 0) {
      setStep2FieldErrors(missing);
      return;
    }
    setStep2FieldErrors([]);
    setStep(3);
  };

  const header = (
    <StoreHeader
        slug={slug}
        companyName={companyName}
        logoImage={logoImage}
        productTypeList={productTypeList}
        seasonList={seasonList}
        consultEnabled={true}
      />
  );
  // 단계 표시 줄
  const stepBar = (
      <div className="sticky top-14 md:top-20 z-30 border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          {(fromChat
            ? [{ num: 1 as const, label: "선물 · 취향" }, { num: 4 as const, label: "예약 확인" }]
            : preselectedProduct
            ? [{ num: 1 as const, label: "선물 정보" }, { num: 4 as const, label: "예약 확인" }]
            : [{ num: 1 as const, label: "선물 정보" }, { num: 2 as const, label: "취향 & 금액" }, { num: 3 as const, label: "상품 선택" }, { num: 4 as const, label: "예약 확인" }]
          ).map(({ num, label }, i) => (
            <div key={num} className="flex items-center gap-2">
              {i > 0 && <div className="flex-1 h-px bg-gray-200 w-8" />}
              <button
                type="button"
                // 사장님 스타일 주문은 선물·취향을 대화에서 정했으니 앞 단계로 돌아가지 않는다
                onClick={() => !fromChat && step > num && setStep(num)}
                className={`flex items-center gap-1.5 ${
                  step === num
                    ? "text-gold-500"
                    : fromChat && step > num
                    ? "text-gray-400 cursor-default"
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
  );

  // ── 4단계: 주문 마지막 페이지 — 모든 주문 경로가 같은 결제 화면을 쓴다 ──
  if (step === 4) {
    return (
      <>
        <OrderCheckout
          slug={slug}
          companyName={companyName}
          notificationEmail={notificationEmail ?? null}
          order={
            selectedProduct
              ? {
                  kind: "single",
                  product: selectedProduct,
                  quantity: initialQuantity,
                  taste: form,
                  // 상품 상세에서 바로 예약했으면 product_detail, 추천(대화형·단계형)에서 골랐으면 recommend
                  // (사장님 스타일·사진 주문은 서버가 상품으로 판단해 owner_style·photo_request 로 저장)
                  orderPath: preselectedProduct && !chatAnswers ? "product_detail" : "recommend",
                }
              : null
          }
          returning={!!initialPaymentId}
          draftKey={`consult_draft_${slug}`}
          header={header}
          stepBar={stepBar}
          initialRequests={form.requests}
          onRestore={restoreFromOrder}
          emptyFallback={
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
              <p className="text-gray-400">주문할 상품을 찾을 수 없어요.</p>
              <Link href={`/${slug}`} className="px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium">
                처음으로
              </Link>
            </div>
          }
          businessHours={businessHours}
          closedDates={closedDates}
          dateOverrides={dateOverrides}
          minLeadTimes={minLeadTimes}
          consultNotice={consultNotice ?? null}
          storeAddress={storeAddress}
          deliveryEnabled={deliveryEnabled}
          deliveryFees={deliveryFees}
          messageCardEnabled={messageCardEnabled}
          messageCardPrice={messageCardPrice}
          shoppingBagEnabled={shoppingBagEnabled}
          shoppingBagPrice={shoppingBagPrice}
          preservativeEnabled={preservativeEnabled}
          preservativePrice={preservativePrice}
          todayColors={todayColors}
          colorLeadDays={colorLeadDays}
          colorPickEnabled={colorPickEnabled}
          colorMinPrice={colorMinPrice}
          afterHours={afterHours}
          transferAvailable={transferAvailable}
          isDemo={isDemo}
          seasonalProductIds={products.filter((p) => p.seasons?.length).map((p) => p.id)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {header}
      {stepBar}

      <div className="mx-auto px-4 max-w-2xl py-5">

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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] placeholder:text-gray-400"
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
                  <p className="text-sm text-gray-600 text-center">선물 목적과 받는 분 정보를 알려주시면<br/>더 잘 어울리는 꽃을 준비해드릴 수 있어요.</p>
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
                              className={`w-full flex items-center justify-between pl-8 pr-4 py-3.5 text-left transition-colors ${section.selected === opt ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
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
              // 매장 상품 유형 (메뉴 설정에서 추가·삭제·숨김한 그대로) + 기타
              options: [...productTypeList.filter((t) => t !== "기타"), "기타"],
              onSelect: (v: string) => { set("productType", v); setActiveSection2(1); },
              hint: null as React.ReactNode,
              extra: null as React.ReactNode,
            },
            {
              title: "선호하는 분위기",
              selected: form.mood,
              displayValue: form.mood,
              options: [...MOODS],
              onSelect: (v: string) => { set("mood", v); setActiveSection2(2); },
              hint: null as React.ReactNode,
              extra: null as React.ReactNode,
            },
            {
              title: "희망 금액",
              selected: form.budget,
              displayValue: form.budget === "기타" ? (form.budgetCustom ? `${form.budgetCustom}만원` : "기타") : form.budget,
              options: ["3만원", "5만원", "7만원", "10만원", "12만원", "15만원", "기타"],
              onSelect: (v: string) => { set("budget", v); if (v !== "기타") setActiveSection2(-1); },
              // 금액을 고르기 전에 — 이 금액 이상이면 원하는 꽃 색을 지정할 수 있다는 안내 (오늘 꽃 색상 기능을 켠 매장만)
              hint: colorPickEnabled && colorMinPrice > 0 ? (
                <ColorMinPriceHint
                  minPrice={colorMinPrice}
                  amount={(form.budget === "기타" ? Number(form.budgetCustom) || 0 : Number(form.budget.replace(/\D/g, "")) || 0) * 10000}
                  className="pl-8 pr-4 py-3 bg-[color-mix(in_srgb,var(--color-gold-500)_5%,#fff)]"
                />
              ) : null as React.ReactNode,
              extra: form.budget === "기타" ? (
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="직접 입력"
                      value={form.budgetCustom}
                      onChange={(e) => set("budgetCustom", e.target.value)}
                      className="w-40 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] placeholder:text-gray-400"
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
                          {section.hint}
                          {section.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => section.onSelect(opt)}
                              className={`w-full flex items-center justify-between pl-8 pr-4 py-3.5 text-left transition-colors ${section.selected === opt ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
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
                선택하신 옵션에 맞는 상품을 추천드립니다.<br/>원하시는 상품을 하나 선택해주세요.
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
                                  className={`w-3.5 h-3.5 rounded-full inline-block shrink-0 border ${color === "흰색" ? "border-gray-300 shadow-sm" : "border-gray-200"}`}
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
