"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { formatPhone, parsePhone } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import AgreementCheckbox from "@/components/AgreementCheckbox";
import TossPaymentWidget, { TossPaymentWidgetHandle } from "@/components/TossPaymentWidget";
import DaumPostcodeEmbed from "react-daum-postcode";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import "react-datepicker/dist/react-datepicker.css";
import { Product } from "@/types";
import { FLOWER_COLOR_MAP } from "@/lib/constants";
import { resolveDayHours, type DateOverrides } from "@/lib/businessHours";
import FlowerNoticeModal from "@/components/FlowerNoticeModal";
import StoreHeader from "@/components/main/StoreHeader";
import OrderCompleteHeader from "@/components/OrderCompleteHeader";
import { readTrafficSource } from "@/lib/trafficSource";
import PreparedColorPicker, { PhotoOrderColorNotice } from "@/components/PreparedColorPicker";
import ColorMinPriceHint from "@/components/ColorMinPriceHint";
import { recommendProducts } from "@/lib/recommend";
import { leadHoursFor } from "@/lib/productTypes";
import { colorPickMode, isNearColorDate } from "@/lib/todayColors";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import PaymentMethodSection from "@/components/PaymentMethodSection";
import { cashReceiptError, type CashReceipt, type PaymentMethod } from "@/lib/payment";
import { AFTER_HOURS_OFF, afterHoursSlots, type AfterHours } from "@/lib/afterHours";
import { PHOTO_PRODUCT_ID, isVirtualProductId, makeStyleProduct, photoOrderKey, readPhotoOrder, type ChatAnswers, type StyleOrder, similarPointsLine } from "@/lib/styleOrder";

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
  preservative: string;
  deliveryType: string;
  desiredDate: string;
  desiredTime: string;
  requests: string;
  /** 받는 날이 색 맞춤 가능 일수 안쪽일 때 고른 준비 색 (오늘 매장에 있는 색 또는 '사장님께 맡길게요') */
  preparedColor?: string;
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
  preservative: "",
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
  privacyAgreed: boolean;
  cancellationAgreed: boolean;
  noticeAgreed: boolean;
  finalPrice: number;
  /** 유입 출처 (?utm_source= / ?from=) */
  source?: string | null;
  /** 주문 경로 — 상품 상세에서 바로 예약했으면 product_detail, 처음부터 고른 맞춤 주문이면 consult */
  orderPath?: "recommend" | "product_detail";
  quantity?: number;
  messageCardCount?: number;
  shoppingBagCount?: number;
  preservativeCount?: number;
  messageCardContents?: string[];
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
  /** 계좌이체를 받을 수 있는지 (매장 계좌가 등록돼 있을 때) */
  transferAvailable?: boolean;
  initialQuantity?: number;
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
  const budget = form.budget === "기타" ? parseInt(form.budgetCustom || "0") * 10000 : BUDGET_MAP[form.budget] ?? 0;
  return recommendProducts(products, { productType: form.productType, mood: form.mood, budget });
}

export default function ConsultClient({ slug, companyName, logoImage = null, productTypeList = [], seasonList = [], notificationEmail, products, businessHours, closedDates, dateOverrides = {}, minLeadTimes = {}, consultNotice, storeAddress = null, deliveryEnabled = false, deliveryFees = {}, messageCardEnabled = false, messageCardPrice = 2000, shoppingBagEnabled = false, shoppingBagPrice = 2000, preservativeEnabled = false, preservativePrice = 500, isDemo = false, preselectedProduct = null, styleOrder = null, chatAnswers = null, todayColors = [], colorLeadDays = 0, colorPickEnabled = true, colorMinPrice = 0, afterHours = AFTER_HOURS_OFF, transferAvailable = false, initialQuantity = 1, initialPaymentId = null }: Props) {
  // 첫 화면 대화에서 선물 정보·취향을 이미 받고 온 주문 (사장님 스타일·사진 주문·대화형 추천)
  const chat = styleOrder ?? chatAnswers;
  const fromChat = !!chat;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(fromChat ? 4 : 1);
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
          // 찾아본 사진 — 비슷했으면 하는 점은 요청 사항 맨 위에 글로 (따로 저장하지 않는다)
          requests: styleOrder ? similarPointsLine(styleOrder.similar) : "",
        }
      : EMPTY_FORM
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(preselectedProduct ?? (styleOrder ? makeStyleProduct(styleOrder) : null));
  // 찾아본 사진 주문 — 이 탭에 보관해 둔 손님 사진을 상품 사진 자리에 넣는다 (서버 화면에선 읽을 수 없어 화면에 뜬 뒤 채운다)
  useEffect(() => {
    if (styleOrder?.kind !== "photo") return;
    const data = readPhotoOrder(slug);
    if (data) setSelectedProduct((p) => (p && p.id === PHOTO_PRODUCT_ID ? { ...p, image_url: data } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결제 후 돌아왔을 때 저장해 둔 상품을 되살린다 — 사장님 스타일 주문은 목록에 없는 가상 상품이라 다시 만든다
  const restoreProduct = (draft: DraftData): Product | null =>
    isVirtualProductId(draft.product.id)
      ? makeStyleProduct({
          kind: draft.product.id === PHOTO_PRODUCT_ID ? "photo" : "style",
          productType: draft.form.productType,
          mood: draft.form.mood,
          budget: draft.product.price,
          // 찾아본 사진은 이 탭에 보관해 둔 사진으로
          refImage: draft.product.id === PHOTO_PRODUCT_ID ? readPhotoOrder(slug) : null,
        })
      : products.find((p) => p.id === draft.product.id) ?? null;
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
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null>(null);
  // 결제 방법 — 카드·간편결제(토스) / 계좌이체(결제 없이 접수 → 입금 확인 후 확정)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cashReceipt, setCashReceipt] = useState<CashReceipt>({ type: "소득공제", number: "" });
  const [transferDone, setTransferDone] = useState(false);
  const s4RefPayment = useRef<HTMLDivElement>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [finalPriceSnapshot, setFinalPriceSnapshot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step2FieldErrors, setStep2FieldErrors] = useState<string[]>([]);
  const [s4fe, setS4fe] = useState<Record<string, boolean>>({});
  const s4RefNotice = useRef<HTMLDivElement>(null);
  const s4RefName = useRef<HTMLDivElement>(null);
  const s4RefPhone = useRef<HTMLDivElement>(null);
  const s4RefDeliveryType = useRef<HTMLDivElement>(null);
  const s4RefDeliveryInfo = useRef<HTMLDivElement>(null);
  const s4RefDate = useRef<HTMLDivElement>(null);
  const s4RefTime = useRef<HTMLDivElement>(null);
  const s4RefAgreement = useRef<HTMLDivElement>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(!!initialPaymentId);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [activeSection1, setActiveSection1] = useState(0);
  const [activeSection2, setActiveSection2] = useState(0);
  const [quantity] = useState(initialQuantity);
  const [messageCardCount, setMessageCardCount] = useState(0);
  const [shoppingBagCount, setShoppingBagCount] = useState(0);
  const [preservativeCount, setPreservativeCount] = useState(0);
  const [messageCardContents, setMessageCardContents] = useState<string[]>([]);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetRef = useRef<TossPaymentWidgetHandle>(null);
  const [paymentOrderId] = useState(() => `order${Date.now()}`);

  // 단계 전환 시 이전 단계에서의 스크롤 위치가 남아있지 않도록 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);


  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(".", "").trim();
    setForm((prev) => ({ ...prev, desiredDate: formatted }));
  }, []);


  const set = (key: keyof ConsultForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 추가 불가로 둔 상품을 고르면 앞서 고른 메시지 카드·수명연장제를 비운다 (금액·주문에 남지 않도록)
  useEffect(() => {
    if (selectedProduct?.message_card_unavailable) {
      setForm((prev) => ({ ...prev, messageCard: "없음", messageCardContent: "" }));
      setMessageCardCount(0);
      setMessageCardContents([]);
    }
    if (selectedProduct?.preservative_unavailable) {
      setForm((prev) => ({ ...prev, preservative: "없음" }));
      setPreservativeCount(0);
    }
  }, [selectedProduct]);

  // 토스 결제 리다이렉트 복귀 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedPaymentKey = params.get("paymentKey");
    const returnedOrderId = params.get("orderId");
    const failCode = params.get("code");

    if (!returnedPaymentKey && !returnedOrderId) return;

    // 결제 관련 값만 주소에서 지운다 — 사장님 스타일·사진 주문 정보(?style=…)는 남겨야 새로고침해도 그 주문 그대로
    const keep = new URLSearchParams(window.location.search);
    ["paymentKey", "orderId", "amount", "code", "message", "paymentType"].forEach((k) => keep.delete(k));
    const keepQs = keep.toString();
    window.history.replaceState({}, "", `/${slug}/consult${keepQs ? `?${keepQs}` : ""}`);

    // 임시 저장해 둔 주문 내용을 화면에 되살리고 예약 확인 단계로 (결제 실패·예약 저장 실패 때)
    const restoreToStep4 = (draft: DraftData) => {
          setForm(draft.form);
          setSelectedProduct(restoreProduct(draft));
          setName(draft.name);
          setPhone(formatPhone(draft.phone));
          setRecipientName(draft.recipientName);
          if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
          setAddress(draft.address);
          setAddressDetail(draft.addressDetail);
          setPrivacyAgreed(draft.privacyAgreed);
          setCancellationAgreed(draft.cancellationAgreed);
          setNoticeAgreed(draft.noticeAgreed);
          if (draft.messageCardCount !== undefined) setMessageCardCount(draft.messageCardCount);
          if (draft.shoppingBagCount !== undefined) setShoppingBagCount(draft.shoppingBagCount);
          if (draft.preservativeCount !== undefined) setPreservativeCount(draft.preservativeCount);
          if (draft.messageCardContents !== undefined) setMessageCardContents(draft.messageCardContents);
          setStep(4);
    };

    if (failCode) {
      // 결제 실패 — 드래프트에서 폼 복원 후 step 4로 이동
      const saved = sessionStorage.getItem(`consult_draft_${slug}`);
      if (saved) {
        try {
          restoreToStep4(JSON.parse(saved));
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
      // (저장이 실패하면 아래 catch에서 이 draft로 예약 확인 단계를 되살린다)
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
            trafficSource: draft.source ?? null,
            orderPath: draft.orderPath ?? "recommend",
            // 찾아본 사진 — 이 탭에 보관해 둔 사진을 결제 승인 뒤 서버가 저장한다
            referenceImageData: draft.product.id === PHOTO_PRODUCT_ID ? readPhotoOrder(slug) : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "예약 저장 실패");
        const rid = data.reservationId ?? null;
        setReservationId(rid);
        setFinalPriceSnapshot(draft.finalPrice);
        // 완료 페이지 표시용 상태 복원
        setForm(draft.form);
        setSelectedProduct(restoreProduct(draft));
        setName(draft.name);
        setPhone(formatPhone(draft.phone));
        setRecipientName(draft.recipientName);
        if (draft.recipientPhone) setRecipientPhone(formatPhone(draft.recipientPhone));
        setAddress(draft.address);
        setAddressDetail(draft.addressDetail);
        if (draft.messageCardCount !== undefined) setMessageCardCount(draft.messageCardCount);
        if (draft.shoppingBagCount !== undefined) setShoppingBagCount(draft.shoppingBagCount);
          if (draft.preservativeCount !== undefined) setPreservativeCount(draft.preservativeCount);
        if (draft.messageCardContents !== undefined) setMessageCardContents(draft.messageCardContents);
        setSubmitted(true);
        // 주문이 끝났으니 보관해 둔 사진은 비운다
        try { sessionStorage.removeItem(photoOrderKey(slug)); } catch { /* 무시 */ }
        setPaidConfirmed(true);
      } catch (err) {
        // 예약 저장 실패 — 처음(1단계)으로 돌아가지 않고 입력한 내용 그대로 예약 확인 단계에서 오류를 보여준다
        // (결제는 서버가 이미 취소했다)
        restoreToStep4(draft);
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
    if (!form.budget || (form.budget === "기타" && !form.budgetCustom)) missing.push("희망 금액");
    if (missing.length > 0) {
      setStep2FieldErrors(missing);
      return;
    }
    setStep2FieldErrors([]);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    // 찾아본 사진 주문인데 보관된 사진이 없으면 (다른 탭·기기에서 열었을 때) 결제 전에 막는다
    if (selectedProduct.id === PHOTO_PRODUCT_ID && !readPhotoOrder(slug)) {
      setError("보내주신 사진이 없어요. 처음 화면에서 사진을 다시 보내주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const effectiveMsgCardCount = quantity >= 2 ? messageCardCount : (form.messageCard === "추가" ? 1 : 0);
    const effectiveBagCount = quantity >= 2 ? shoppingBagCount : (form.shoppingBag === "추가" ? 1 : 0);
    const effectivePreservativeCount = quantity >= 2 ? preservativeCount : (form.preservative === "추가" ? 1 : 0);
    const submittedForm: ConsultForm = {
      ...form,
      messageCard: effectiveMsgCardCount > 0 ? "추가" : "없음",
      messageCardContent: messageCardContents.filter(Boolean).join("\n[카드 구분]\n") || form.messageCardContent,
      shoppingBag: effectiveBagCount > 0 ? "추가" : "없음",
      preservative: effectivePreservativeCount > 0 ? "추가" : "없음",
      // 색을 고르는 날짜일 때만 고른 색을 보낸다 (날짜를 바꿔 고르는 방식이 달라졌으면 아래에서 비운다)
      preparedColor: colorPickMode(colorPickEnabled, todayColors, colorLeadDays, form.desiredDate) ? form.preparedColor ?? "" : "",
    };

    const finalPrice = selectedProduct.price +
      (messageCardEnabled ? effectiveMsgCardCount * messageCardPrice : 0) +
      (shoppingBagEnabled && !selectedProduct.bag_included ? effectiveBagCount * shoppingBagPrice : 0) +
      (preservativeEnabled ? effectivePreservativeCount * preservativePrice : 0) +
      (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0);

    // 계좌이체 — 토스 결제 없이 바로 예약을 저장하고, 완료 화면에서 입금 계좌를 안내한다
    if (paymentMethod === "transfer") {
      try {
        const res = await fetch("/api/reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            companyName,
            notificationEmail,
            form: submittedForm,
            product: {
              id: selectedProduct.id,
              name: selectedProduct.name,
              price: selectedProduct.price,
              product_type: selectedProduct.product_type,
              image_url: isVirtualProductId(selectedProduct.id) ? null : selectedProduct.image_url,
              bag_included: selectedProduct.bag_included ?? false,
            },
            orderer: { name, phone: parsePhone(phone) },
            delivery: submittedForm.deliveryType === "배송" ? { recipientName, recipientPhone: parsePhone(recipientPhone), address, addressDetail } : null,
            finalPrice,
            paymentMethod: "transfer",
            cashReceipt: cashReceipt.type === "신청 안 함" ? { type: "신청 안 함", number: "" } : cashReceipt,
            trafficSource: readTrafficSource(slug),
            orderPath: preselectedProduct && !chatAnswers ? "product_detail" : "recommend",
            referenceImageData: selectedProduct.id === PHOTO_PRODUCT_ID ? readPhotoOrder(slug) : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "예약 저장 실패");
        setReservationId(data.reservationId ?? null);
        setFinalPriceSnapshot(finalPrice);
        setForm(submittedForm);
        setMessageCardCount(effectiveMsgCardCount);
        setShoppingBagCount(effectiveBagCount);
        setPreservativeCount(effectivePreservativeCount);
        setBankInfo({ bankName: data.bankName ?? null, bankAccount: data.bankAccount ?? null, bankHolder: data.bankHolder ?? null });
        setTransferDone(true);
        setSubmitted(true);
        try { sessionStorage.removeItem(photoOrderKey(slug)); } catch { /* 무시 */ }
        window.scrollTo(0, 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "예약 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      // 리다이렉트 복귀 대비 폼 데이터 임시 저장
      sessionStorage.setItem(`consult_draft_${slug}`, JSON.stringify({
        form: submittedForm,
        quantity,
        messageCardCount: effectiveMsgCardCount,
        shoppingBagCount: effectiveBagCount,
        preservativeCount: effectivePreservativeCount,
        messageCardContents,
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          product_type: selectedProduct.product_type,
          // 가상 상품의 사진(손님 사진)은 크기가 커서 임시 저장에 넣지 않는다 — 따로 보관해 둔 것을 쓴다
          image_url: isVirtualProductId(selectedProduct.id) ? null : selectedProduct.image_url,
          bag_included: selectedProduct.bag_included ?? false,
        },
        name,
        phone: parsePhone(phone),
        recipientName,
        recipientPhone: parsePhone(recipientPhone),
        address,
        addressDetail,
        privacyAgreed,
        cancellationAgreed,
        noticeAgreed,
        finalPrice,
        source: readTrafficSource(slug),
        orderPath: preselectedProduct && !chatAnswers ? "product_detail" : "recommend",
      } satisfies DraftData));

      await widgetRef.current?.requestPayment({
        orderId: paymentOrderId,
        orderName: `${companyName} 맞춤 주문`,
        // 지금 주소 그대로 돌아온다 — 사장님 스타일·사진 주문 정보(?style=…)가 결제창에 다녀와도 남도록
        successUrl: `${window.location.origin}${window.location.pathname}${window.location.search}`,
        failUrl: `${window.location.origin}${window.location.pathname}${window.location.search}`,
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
      <div className="min-h-screen bg-gray-100">
        <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={productTypeList} seasonList={seasonList} consultEnabled={true} />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">

          {/* 완료 헤더 (장바구니 결제 완료와 공통) */}
          <OrderCompleteHeader transfer={transferDone && bankInfo ? { ...bankInfo, amount: finalPriceSnapshot } : null} />

          {/* 상품 정보 */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl overflow-hidden">
              <p className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-400 border-b border-gray-100">상품 정보</p>
              <div className="flex items-center gap-3 px-4 py-4">
                {selectedProduct.image_url ? (
                  <Image src={selectedProduct.image_url} alt={selectedProduct.name} width={72} height={72} className="w-18 h-18 rounded-xl object-cover shrink-0" />
                ) : selectedProduct.id === PHOTO_PRODUCT_ID ? (
                  // 찾아본 사진을 불러오는 동안 같은 자리를 비워 둔다 (글자가 밀리지 않게)
                  <div className="w-18 h-18 rounded-xl bg-beige-200 shrink-0" />
                ) : null}
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
            {form.preparedColor && <Row label="꽃 색상" value={form.preparedColor} />}
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

      <div className={`mx-auto px-4 ${step === 4 ? "max-w-5xl py-5" : "max-w-2xl py-5"}`}>

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
              options: ["깔끔한 화이트&그린", "화사한 파스텔톤", "선명한 비비드톤", "차분한 딥컬러"],
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

        {/* ── STEP 4: 예약자 정보 & 확인 ── */}
        {step === 4 && (() => {
          const effectiveMsgCardCount4 = quantity >= 2 ? messageCardCount : (form.messageCard === "추가" ? 1 : 0);
          const effectiveBagCount4 = quantity >= 2 ? shoppingBagCount : (form.shoppingBag === "추가" ? 1 : 0);
          const effectivePreservativeCount4 = quantity >= 2 ? preservativeCount : (form.preservative === "추가" ? 1 : 0);
          const finalPrice = selectedProduct
            ? selectedProduct.price +
              (messageCardEnabled ? effectiveMsgCardCount4 * messageCardPrice : 0) +
              (shoppingBagEnabled && !selectedProduct.bag_included ? effectiveBagCount4 * shoppingBagPrice : 0) +
              (preservativeEnabled ? effectivePreservativeCount4 * preservativePrice : 0) +
              (form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0)
            : 0;

          // 받는 날이 색 맞춤 가능 일수 안쪽이면 오늘 있는 색, 그 이후면 모든 색 중에서 고른다
          const colorMode = colorPickMode(colorPickEnabled, todayColors, colorLeadDays, form.desiredDate);
          const needsColor = colorMode !== null;
          // 찾아본 사진 주문 — 가까운 날인데 오늘 색이 없으면 색 고르기 대신 '매장에 준비된 꽃으로' 안내
          const isPhotoOrder = selectedProduct?.id === PHOTO_PRODUCT_ID;
          const photoNoColorNotice = isPhotoOrder && !needsColor && colorPickEnabled && isNearColorDate(colorLeadDays, form.desiredDate);

          const handleConfirm = () => {
            const fe: Record<string, boolean> = {};
            if (consultNotice && !noticeAgreed) fe.notice = true;
            if (!name) fe.name = true;
            if (parsePhone(phone).length < 10 || parsePhone(phone).length > 11) fe.phone = true;
            if (!form.deliveryType) fe.deliveryType = true;
            if (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) fe.deliveryInfo = true;
            if (!form.desiredDate) fe.date = true;
            if (form.desiredDate && !form.desiredTime) fe.time = true;
            if (needsColor && !form.preparedColor) fe.color = true;
            if (paymentMethod === "transfer" && cashReceipt.type !== "신청 안 함" && cashReceiptError(cashReceipt)) fe.receipt = true;
            if (!privacyAgreed) fe.privacy = true;
            if (!cancellationAgreed) fe.cancellation = true;

            if (Object.keys(fe).length > 0) {
              setS4fe(fe);
              const firstRef = fe.notice ? s4RefNotice : fe.name ? s4RefName : fe.phone ? s4RefPhone : fe.deliveryType ? s4RefDeliveryType : fe.deliveryInfo ? s4RefDeliveryInfo : fe.date || fe.color ? s4RefDate : fe.time ? s4RefTime : fe.receipt ? s4RefPayment : s4RefAgreement;
              firstRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            setS4fe({});
            handleSubmit();
          };

          const agreementJsx = (
            <div ref={s4RefAgreement} className="space-y-4">
              <label className={`flex items-start gap-3 text-sm cursor-pointer ${s4fe.privacy ? "text-red-500" : "text-gray-500"}`}>
                <AgreementCheckbox checked={privacyAgreed} onChange={(v) => { setPrivacyAgreed(v); if (s4fe.privacy) setS4fe(p => ({ ...p, privacy: false })); }} />
                <span><Link href="/privacy" target="_blank" className="underline text-gold-600">개인정보처리방침</Link>에 동의합니다. <span className="text-red-400">*</span></span>
              </label>
              <label className={`flex items-start gap-3 text-sm cursor-pointer ${s4fe.cancellation ? "text-red-500" : "text-gray-500"}`}>
                <AgreementCheckbox checked={cancellationAgreed} onChange={(v) => { setCancellationAgreed(v); if (s4fe.cancellation) setS4fe(p => ({ ...p, cancellation: false })); }} />
                <span>맞춤 제작 상품으로 제작 착수 후<br />취소·환불 불가.{" "}<Link href="/refund" target="_blank" className="underline text-gold-600">환불 정책</Link> 동의 <span className="text-red-400">*</span></span>
              </label>
              <p className="text-xs text-gray-400">예약이 확정되거나 취소되면 입력하신 번호로 카카오톡 알림톡을 보내드립니다.</p>
            </div>
          );

          return (
            <div className="flex flex-col md:flex-row md:gap-5">
              <TossPaymentWidget
                ref={widgetRef}
                customerKey={paymentOrderId}
                amount={finalPrice}
                onReadyChange={setWidgetReady}
                onCancel={() => setSubmitting(false)}
                isDemo={isDemo}
              />

              {/* ── 왼쪽: 폼 영역 ── */}
              <div className="flex-1 min-w-0 md:max-w-xl space-y-2 -mx-4 md:mx-0">

                {consultNotice && (
                  <div ref={s4RefNotice} className={`rounded-xl px-4 py-3 border ${s4fe.notice ? "border-red-300 bg-red-50" : "bg-amber-50 border-amber-200"}`}>
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${s4fe.notice ? "text-red-700" : "text-amber-800"}`}>{consultNotice}</p>
                    <label className={`flex items-center gap-2 mt-3 text-sm cursor-pointer ${s4fe.notice ? "text-red-500 font-medium" : "text-amber-700"}`}>
                      <AgreementCheckbox checked={noticeAgreed} onChange={(v) => { setNoticeAgreed(v); if (s4fe.notice) setS4fe(p => ({ ...p, notice: false })); }} />
                      <span>안내 사항을 확인했습니다. <span className="text-red-400">*</span></span>
                    </label>
                  </div>
                )}

                {/* 예약자 정보 */}
                <div className="bg-white px-4 py-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">예약자 정보 <span className="text-red-400">*</span></h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    <div ref={s4RefName}>
                      <label className={`block text-xs mb-1 ${s4fe.name ? "text-red-500 font-medium" : "text-gray-600"}`}>주문자{s4fe.name && " *필수"}</label>
                      <input type="text" placeholder="홍길동" value={name} onChange={(e) => { setName(e.target.value); if (s4fe.name) setS4fe(p => ({ ...p, name: false })); }} className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${s4fe.name ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`} />
                    </div>
                    <div ref={s4RefPhone}>
                      <label className={`block text-xs mb-1 ${s4fe.phone ? "text-red-500 font-medium" : "text-gray-600"}`}>휴대전화{s4fe.phone && " *필수"}</label>
                      <input
                        type="tel"
                        placeholder="010-1234-5678"
                        value={phone}
                        onChange={(e) => { setPhone(formatPhone(e.target.value)); if (s4fe.phone) setS4fe(p => ({ ...p, phone: false })); }}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 transition-colors ${s4fe.phone || (phone && (parsePhone(phone).length < 10 || parsePhone(phone).length > 11)) ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`}
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
                      {selectedProduct.image_url ? (
                        <Image src={selectedProduct.image_url} alt={selectedProduct.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      ) : selectedProduct.id === PHOTO_PRODUCT_ID ? (
                        // 찾아본 사진을 불러오는 동안 같은 자리를 비워 둔다 (글자가 밀리지 않게)
                        <div className="w-20 h-20 rounded-xl bg-beige-200 shrink-0" />
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs text-gray-400">{selectedProduct.product_type}</p>
                        <p className="text-sm font-medium text-gray-900 leading-snug">{selectedProduct.name}</p>
                        <p className="text-sm font-bold text-gold-500 pt-1">{selectedProduct.price.toLocaleString()}원</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 수령 방법 */}
                <div ref={s4RefDeliveryType} className="bg-white overflow-hidden">
                  <div className={`px-4 pt-4 pb-3 border-b ${s4fe.deliveryType ? "border-red-300 bg-red-50" : "border-gray-100"}`}>
                    <h3 className={`text-sm font-medium ${s4fe.deliveryType ? "text-red-500" : "text-gray-700"}`}>수령 방법 <span className="text-red-400">*</span>{s4fe.deliveryType && " — 선택해주세요"}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(deliveryEnabled ? ["픽업", "배송"] : ["픽업"]).map((v) => (
                      <div key={v}>
                        <button
                          type="button"
                          onClick={() => { set("deliveryType", v); setS4fe(p => ({ ...p, deliveryType: false })); }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.deliveryType === v ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
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
                    <div ref={s4RefDeliveryInfo} className="px-4 pt-4 pb-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs mb-1 ${s4fe.deliveryInfo && !recipientName ? "text-red-500 font-medium" : "text-gray-600"}`}>받는 분 이름</label>
                          <input type="text" placeholder="홍길동" value={recipientName} onChange={(e) => { setRecipientName(e.target.value); if (s4fe.deliveryInfo) setS4fe(p => ({ ...p, deliveryInfo: false })); }} className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${s4fe.deliveryInfo && !recipientName ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`} />
                        </div>
                        <div>
                          <label className={`block text-xs mb-1 ${s4fe.deliveryInfo && !recipientPhone ? "text-red-500 font-medium" : "text-gray-600"}`}>받는 분 전화번호</label>
                          <input type="tel" placeholder="010-1234-5678" value={recipientPhone} onChange={(e) => { setRecipientPhone(formatPhone(e.target.value)); if (s4fe.deliveryInfo) setS4fe(p => ({ ...p, deliveryInfo: false })); }} className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${s4fe.deliveryInfo && !recipientPhone ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className={`block text-xs mb-1 ${s4fe.deliveryInfo && !address ? "text-red-500 font-medium" : "text-gray-600"}`}>주소</label>
                        <div className="flex gap-2">
                          <input type="text" placeholder="주소 검색" value={address} readOnly onClick={() => setShowPostcode(true)} className={`flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 cursor-pointer placeholder:text-gray-300 ${s4fe.deliveryInfo && !address ? "border-red-400" : "border-gray-200 focus:border-gray-400"}`} />
                          <button type="button" onClick={() => setShowPostcode(true)} className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 bg-gray-50 transition-colors whitespace-nowrap">찾기</button>
                        </div>
                      </div>
                      {showPostcode && (
                        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
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
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-1">상세주소</label>
                        <input type="text" placeholder="동/호수 등" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-gray-50 placeholder:text-gray-300" />
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
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 수령 희망 날짜 */}
                <div ref={s4RefDate} className="bg-white overflow-hidden">
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
                  {/* 오늘 있는 색으로 준비되는 날짜면 바로 아래에서 색 고르기 */}
                  {needsColor && (
                    <PreparedColorPicker
                      mode={colorMode!}
                      todayColors={todayColors}
                      value={form.preparedColor ?? ""}
                      onChange={(v) => { set("preparedColor", v); if (s4fe.color) setS4fe((p) => ({ ...p, color: false })); }}
                      error={s4fe.color}
                      hasPhoto={!!selectedProduct?.image_url}
                      minPrice={colorMinPrice}
                      // 최소 금액은 상품 금액 기준 (추가 옵션·배송비 제외)
                      amount={selectedProduct?.price ?? 0}
                      photoOrder={isPhotoOrder}
                    />
                  )}
                  {photoNoColorNotice && <PhotoOrderColorNotice />}
                </div>

                {/* 수령 희망 시간 */}
                {(() => {
                  const day = selectedDate ? resolveDayHours(selectedDate, businessHours, dateOverrides) : null;
                  const now = new Date();
                  const isToday = selectedDate
                    ? selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth() && selectedDate.getDate() === now.getDate()
                    : false;
                  // 유형별 준비 시간 (따로 정하지 않은 유형은 기본)
                  const leadMins = leadHoursFor(minLeadTimes, form.productType) * 60;
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
                  // 영업시간 외 수령 — 오늘이면 준비 시간 이후만, 준비는 마감 전까지 끝나야 (사장님 설정에 따라)
                  const extraSlots = selectedDate && !leadOverflow
                    ? afterHoursSlots(day, afterHours, minTimeDate ? Math.ceil((minH * 60 + minM) / 30) * 30 : null, {
                        selectedDate,
                        leadHours: leadMins / 60,
                        businessHours,
                        dateOverrides,
                      })
                    : [];
                  return (
                    <div ref={s4RefTime} className="bg-white px-4 py-4 space-y-3">
                      <h3 className={`text-sm font-medium flex items-center gap-2 pb-3 border-b ${s4fe.time ? "text-red-500 border-red-200" : "text-gray-700 border-gray-100"}`}>
                        수령 희망 시간 <span className="text-red-400">*</span>
                        {day && <span className="text-xs font-normal text-gray-400">예약 가능 시간 · {day.open}~{day.close}</span>}
                        {s4fe.time && <span className="text-xs font-normal">— 시간을 선택해주세요</span>}
                      </h3>
                      {!selectedDate ? (
                        <p className="text-xs text-gray-400 px-1">날짜를 먼저 선택해주세요.</p>
                      ) : slots.length === 0 && extraSlots.length === 0 ? (
                        <p className="text-xs text-gray-400 px-1">선택 가능한 시간이 없습니다.</p>
                      ) : (
                        // 영업시간·영업시간 외 시간을 한 격자에 합쳐서 (영업시간 외는 점선)
                        <TimeSlotGrid
                          slots={slots}
                          extraSlots={extraSlots}
                          afterHoursNote={afterHours.note}
                          value={form.desiredTime}
                          onSelect={(slot) => { set("desiredTime", slot); if (s4fe.time) setS4fe(p => ({ ...p, time: false })); }}
                          error={s4fe.time}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* 추가 옵션 */}
                {(messageCardEnabled || shoppingBagEnabled || preservativeEnabled) && (
                  <div className="bg-white overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700">추가 옵션</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {messageCardEnabled && !selectedProduct?.message_card_unavailable && (
                        <div>
                          {quantity >= 2 ? (
                            /* 수량 2개 이상: 카운터 UI */
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <div>
                                <span className="text-sm text-gray-800">메시지 카드</span>
                                <span className="ml-2 text-xs text-gold-500">+{messageCardPrice.toLocaleString()}원 / 장</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(0, messageCardCount - 1);
                                    setMessageCardCount(next);
                                    setMessageCardContents((prev) => prev.slice(0, next));
                                  }}
                                  disabled={messageCardCount === 0}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                                </button>
                                <span className="text-sm font-medium w-5 text-center">{messageCardCount}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.min(quantity, messageCardCount + 1);
                                    setMessageCardCount(next);
                                    setMessageCardContents((prev) => {
                                      const arr = [...prev];
                                      if (arr.length < next) arr.push("");
                                      return arr;
                                    });
                                  }}
                                  disabled={messageCardCount >= quantity}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* 수량 1개: 기존 토글 UI */
                            <button
                              type="button"
                              onClick={() => {
                                const next = form.messageCard === "추가" ? "없음" : "추가";
                                set("messageCard", next);
                                if (next === "없음") set("messageCardContent", "");
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.messageCard === "추가" ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
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
                          )}
                          {/* 메시지 카드 내용 입력 */}
                          {quantity >= 2 && messageCardCount > 0 && (
                            <div className="px-4 pb-3 space-y-2">
                              {Array.from({ length: messageCardCount }).map((_, idx) => (
                                <div key={idx}>
                                  {messageCardCount > 1 && (
                                    <p className="text-xs text-gray-400 mb-1">{idx + 1}번 카드</p>
                                  )}
                                  <textarea
                                    value={messageCardContents[idx] ?? ""}
                                    onChange={(e) => {
                                      setMessageCardContents((prev) => {
                                        const next = Array.from({ length: messageCardCount }, (_, i) => prev[i] ?? "");
                                        next[idx] = e.target.value;
                                        return next;
                                      });
                                    }}
                                    placeholder="메시지 카드에 적을 내용을 입력해주세요. (30자 이내 작성 권장)"
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {quantity < 2 && form.messageCard === "추가" && (
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
                      {shoppingBagEnabled && (
                        selectedProduct?.bag_included ? (
                          <div className="w-full flex items-center justify-between px-4 py-3.5">
                            <span className="text-sm text-gray-400">쇼핑백 포함 제품</span>
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0" />
                          </div>
                        ) : quantity >= 2 ? (
                          /* 수량 2개 이상: 카운터 UI */
                          <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                              <span className="text-sm text-gray-800">쇼핑백</span>
                              <span className="ml-2 text-xs text-gold-500">+{shoppingBagPrice.toLocaleString()}원 / 개</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShoppingBagCount((c) => Math.max(0, c - 1))}
                                disabled={shoppingBagCount === 0}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="text-sm font-medium w-5 text-center">{shoppingBagCount}</span>
                              <button
                                type="button"
                                onClick={() => setShoppingBagCount((c) => Math.min(quantity, c + 1))}
                                disabled={shoppingBagCount >= quantity}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 수량 1개: 기존 토글 UI */
                          <button
                            type="button"
                            onClick={() => set("shoppingBag", form.shoppingBag === "추가" ? "없음" : "추가")}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.shoppingBag === "추가" ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
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
                        )
                      )}
                      {preservativeEnabled && !selectedProduct?.preservative_unavailable && (
                        quantity >= 2 ? (
                          /* 수량 2개 이상: 카운터 UI */
                          <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                              <span className="text-sm text-gray-800">생화 수명연장제</span>
                              <span className="ml-2 text-xs text-gold-500">+{preservativePrice.toLocaleString()}원 / 개</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreservativeCount((c) => Math.max(0, c - 1))}
                                disabled={preservativeCount === 0}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="text-sm font-medium w-5 text-center">{preservativeCount}</span>
                              <button
                                type="button"
                                onClick={() => setPreservativeCount((c) => Math.min(quantity, c + 1))}
                                disabled={preservativeCount >= quantity}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 수량 1개: 기존 토글 UI */
                          <button
                            type="button"
                            onClick={() => set("preservative", form.preservative === "추가" ? "없음" : "추가")}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.preservative === "추가" ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
                          >
                            <div>
                              <span className={`text-sm ${form.preservative === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>생화 수명연장제</span>
                              <span className="ml-2 text-xs text-gold-500">+{preservativePrice.toLocaleString()}원</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.preservative === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                              {form.preservative === "추가" && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
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
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-400 bg-gray-50 placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* 결제 방법 — 모바일은 동의·예약하기 버튼 바로 위 (PC는 오른쪽 결제 상자 안) */}
                <div ref={s4RefPayment} className="md:hidden">
                  <PaymentMethodSection
                    method={paymentMethod}
                    onMethod={(m) => {
                      setPaymentMethod(m);
                      // 소득공제 번호는 주문자 연락처로 미리 채운다
                      if (m === "transfer" && cashReceipt.type === "소득공제" && !cashReceipt.number) setCashReceipt({ type: "소득공제", number: parsePhone(phone) });
                    }}
                    receipt={cashReceipt}
                    onReceipt={(r) => { setCashReceipt(r); if (s4fe.receipt) setS4fe((p) => ({ ...p, receipt: false })); }}
                    receiptError={s4fe.receipt}
                    transferAvailable={transferAvailable}
                  />
                </div>

                {/* 모바일: 동의 + 버튼 */}
                <div className="md:hidden bg-white px-4 py-4 space-y-3">
                  {agreementJsx}
                  {error && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting || (paymentMethod === "card" && !widgetReady)}
                    className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (paymentMethod === "transfer" ? "예약 중..." : "결제 중...") : paymentMethod === "transfer" ? "예약하기" : "결제하기"}
                  </button>
                </div>
              </div>

              {/* ── 오른쪽: 고정 사이드 패널 (PC 전용) ── */}
              {/* top: 헤더(80px) + 단계 표시 바(약 49px) 아래로 여백을 두고 고정 — 더 작으면 단계 바에 위가 가려짐 */}
              <div className="hidden md:flex md:flex-col md:w-80 md:shrink-0 md:self-start md:sticky md:top-[150px]">
                <div className="bg-white border border-gray-100 overflow-hidden">
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
                      {preservativeEnabled && form.preservative === "추가" && (
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>생화 수명연장제</span>
                          <span>+{preservativePrice.toLocaleString()}원</span>
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

                  {/* 결제 방법 — PC는 결제 금액 아래, 결제/예약하기 버튼 바로 위 */}
                  <PaymentMethodSection
                    method={paymentMethod}
                    onMethod={(m) => {
                      setPaymentMethod(m);
                      // 소득공제 번호는 주문자 연락처로 미리 채운다
                      if (m === "transfer" && cashReceipt.type === "소득공제" && !cashReceipt.number) setCashReceipt({ type: "소득공제", number: parsePhone(phone) });
                    }}
                    receipt={cashReceipt}
                    onReceipt={(r) => { setCashReceipt(r); if (s4fe.receipt) setS4fe((p) => ({ ...p, receipt: false })); }}
                    receiptError={s4fe.receipt}
                    transferAvailable={transferAvailable}
                    inSidebar
                  />

                  {/* 동의 + 버튼 */}
                  <div className="px-5 py-4 space-y-4">
                    {agreementJsx}
                    {error && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting || (paymentMethod === "card" && !widgetReady)}
                      className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? (paymentMethod === "transfer" ? "예약 중..." : "결제 중...") : paymentMethod === "transfer" ? "예약하기" : "결제하기"}
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
