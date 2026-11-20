"use client";

import { discountAmount, discountRate } from "@/lib/discount";
import { useEffect, useRef, useState } from "react";
import type { TossPaymentWidgetHandle } from "@/components/TossPaymentWidget";
import { preloadOrderInputs } from "@/components/LazyOrderInputs";
import type { GiftInfo } from "@/components/GiftInfoStep";
import type { CartItem } from "@/hooks/useCart";
import { measureDelivery } from "@/lib/delivery";
import { formatPhone, parsePhone } from "@/lib/format";
import { resolveDayHours, type DateOverrides } from "@/lib/businessHours";
import { leadHoursFor } from "@/lib/productTypes";
import { colorPickMode, isNearColorDate } from "@/lib/todayColors";
import { cashReceiptError, type CashReceipt, type PaymentMethod } from "@/lib/payment";
import { afterHoursSlots, type AfterHours } from "@/lib/afterHours";
import { readTrafficSource } from "@/lib/trafficSource";
import { PHOTO_PRODUCT_ID, STYLE_PRODUCT_ID, isVirtualProductId, photoOrderKey, readPhotoOrder } from "@/lib/styleOrder";
import { ymd, type ConsultForm, type OrderProduct } from "./orderTypes";

// 주문 마지막 페이지 — 모든 주문 경로가 같은 화면을 쓴다
// · 상품 1개(single): 추천 주문 · 사장님 스타일 · 사진 주문 · 상품 상세 바로 예약(1개) → /api/reservation
// · 상품 여러 개(cart): 장바구니 · 상품 상세 바로 예약(2개 이상) → /api/order
// 주문자·수령·날짜·시간·꽃 색·요청 사항·결제 방법·동의 · 결제(토스/무통장 입금) · 결제 후 복귀 · 완료 화면을 한 곳에서 처리한다.
// 서버로 보내는 내용(주문 경로·선물 정보·사진·꽃 색·결제 방법)은 경로마다 예전과 같다.

/** 상품 1개 주문 — 맞춤주문 앞 단계에서 받은 선물 정보·취향(taste)과 함께 */
export interface SingleOrder {
  kind: "single";
  product: OrderProduct;
  quantity: number;
  /** 앞 단계 주문서 (선물 목적·받는 분·형태·분위기·금액) — 결제 화면 칸은 여기서 채운다 */
  taste: ConsultForm;
  orderPath: "recommend" | "product_detail" | "intro_photo";
}

/** 상품 여러 개 주문 — 장바구니 / 바로 예약(2개 이상) */
export interface CartOrder {
  kind: "cart";
  items: CartItem[];
  gift: GiftInfo;
  orderPath: "cart" | "product_detail";
}

export type CheckoutOrder = SingleOrder | CartOrder;

/** 결제창에 다녀오는 동안 보관하는 주문서 */
export interface Draft {
  v: 2;
  order: CheckoutOrder;
  form: CheckoutFields;
  counts: OptionCounts;
  name: string;
  phone: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string;
  privacyAgreed: boolean;
  cancellationAgreed: boolean;
  noticeAgreed: boolean;
  deliveryFee: number | null;
  deliveryDistance: number | null;
  lines: PriceLine[];
  finalPrice: number;
  source: string | null;
}

/** 결제 화면에서 받는 칸 (상품 1개 주문의 옵션 포함) */
export interface CheckoutFields {
  deliveryType: string;
  desiredDate: string;
  desiredTime: string;
  requests: string;
  preparedColor: string;
  messageCard: string;
  messageCardContent: string;
  shoppingBag: string;
  preservative: string;
}

export interface OptionCounts {
  messageCardCount: number;
  shoppingBagCount: number;
  preservativeCount: number;
  messageCardContents: string[];
}

/** 결제 금액 한 줄 — plus: 더하는 금액(옵션·배송비), minus: 빼는 금액(할인) */
export type PriceLine = { label: string; amount: number; plus?: boolean; minus?: boolean };

/** 완료 화면에 보여줄 내용 (결제·접수가 끝난 순간 그대로) */
export interface Done {
  draft: Draft;
  transfer: { bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null;
  /** 손님 주문 확인 페이지 코드 (/{매장}/order/{코드}) */
  orderToken?: string | null;
}

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface OrderCheckoutProps {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
  /** 주문할 것 — 결제창에서 돌아오는 중이면 없을 수 있다 (보관해 둔 주문서를 쓴다) */
  order: CheckoutOrder | null;
  /** 결제창에서 돌아오는 중인지 (주소에 결제 결과가 붙어 있음) */
  returning: boolean;
  /** 결제창 다녀오는 동안 주문서를 보관할 이름 (경로마다 따로) */
  draftKey: string;
  /** 위 머리글 (매장 헤더) · 단계 표시 줄 */
  header: React.ReactNode;
  stepBar?: React.ReactNode;
  themeVars?: Record<string, string>;
  /** 요청 사항 처음 내용 (대화에서 받은 '피하고 싶은 것' 등) */
  initialRequests?: string;
  /** 결제 실패 등으로 보관해 둔 주문서를 되살릴 때 — 앞 단계 화면도 같은 주문으로 맞춘다 */
  onRestore?: (order: CheckoutOrder) => void;
  /** 결제·접수가 끝났을 때 (장바구니 비우기 등) */
  onPaid?: () => void;
  /** 결제가 끝나도 화면 위치를 그대로 둔다 (대화 주문 — 완료 말이 대화 끝에 이어 붙는다) · 기본은 완료 화면을 맨 위부터 */
  keepScrollOnDone?: boolean;
  /** 주문할 상품이 없을 때 보여줄 화면 */
  emptyFallback?: React.ReactNode;
  /** 시즌이 걸린 상품 id — 정해진 모습 그대로 파는 상품이라 꽃 색을 고르지 않는다 */
  seasonalProductIds?: string[];
  // 매장 설정
  businessHours: Record<string, DayHours>;
  closedDates: string[];
  dateOverrides?: DateOverrides;
  minLeadTimes: Record<string, number>;
  consultNotice: string | null;
  storeAddress: string | null;
  deliveryEnabled: boolean;
  deliveryFees: Record<string, number>;
  messageCardEnabled: boolean;
  messageCardPrice: number;
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  preservativeEnabled: boolean;
  preservativePrice: number;
  todayColors: string[];
  colorLeadDays: number;
  colorPickEnabled: boolean;
  colorMinPrice: number;
  afterHours: AfterHours;
  transferAvailable: boolean;
  isDemo: boolean;
}

export const EMPTY_FIELDS: CheckoutFields = {
  deliveryType: "",
  desiredDate: "",
  desiredTime: "",
  requests: "",
  preparedColor: "",
  messageCard: "",
  messageCardContent: "",
  shoppingBag: "",
  preservative: "",
};

/** 결제창에서 돌아올 때 붙는 값 — 주소에서 지운다 */
export const PAYMENT_PARAMS = ["paymentKey", "orderId", "amount", "code", "message", "paymentType"];

/** 장바구니 상품 한 줄 금액 (상품 × 수량 + 옵션) */
export const cartLineAmount = (i: CartItem, prices: { bag: number; preservative: number; card: number }) =>
  i.price * i.quantity + (!i.bag_included ? prices.bag * (i.shoppingBagCount ?? 0) : 0) + prices.preservative * (i.preservativeCount ?? 0) + prices.card * (i.messageCardCount ?? 0);

/**
 * 주문 마지막 페이지의 상태·금액·날짜/시간·결제·결제 복귀 처리 — 결제 화면(OrderCheckout)과 첫 화면 대화 주문(ChatCheckout)이 함께 쓴다.
 * 화면 모양은 쓰는 쪽이 그리고, 입력값과 처리는 여기 한 곳에서.
 */
export function useOrderCheckout(props: OrderCheckoutProps) {
  const {
    slug, companyName, notificationEmail = null, order: orderProp, returning, draftKey, header, stepBar, themeVars, initialRequests = "", onRestore, onPaid, keepScrollOnDone = false, emptyFallback, seasonalProductIds = [],
    businessHours, closedDates, dateOverrides = {}, minLeadTimes, consultNotice, storeAddress, deliveryEnabled, deliveryFees,
    messageCardEnabled, messageCardPrice, shoppingBagEnabled, shoppingBagPrice, preservativeEnabled, preservativePrice,
    todayColors, colorLeadDays, colorPickEnabled, colorMinPrice, afterHours, transferAvailable, isDemo,
  } = props;

  // 결제 실패로 되살린 주문 — 앞 단계 값이 아직 없을 때 대신 쓴다
  const [restoredOrder, setRestoredOrder] = useState<CheckoutOrder | null>(null);
  const order = orderProp ?? restoredOrder;
  const single = order?.kind === "single" ? order : null;
  const cart = order?.kind === "cart" ? order : null;
  const product = single?.product ?? null;
  const quantity = single?.quantity ?? 1;
  const isPhotoOrder = product?.id === PHOTO_PRODUCT_ID;
  const isStyleOrder = product?.id === STYLE_PRODUCT_ID;

  // ── 입력값 ──
  const [form, setForm] = useState<CheckoutFields>({ ...EMPTY_FIELDS, requests: initialRequests });
  const set = (key: keyof CheckoutFields, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const desiredDate = selectedDate ? ymd(selectedDate) : "";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);
  // 상품 1개 주문 — 수량 2개 이상이면 옵션을 개수로
  const [messageCardCount, setMessageCardCount] = useState(0);
  const [shoppingBagCount, setShoppingBagCount] = useState(0);
  const [preservativeCount, setPreservativeCount] = useState(0);
  const [messageCardContents, setMessageCardContents] = useState<string[]>([]);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [cancellationAgreed, setCancellationAgreed] = useState(false);
  const [noticeAgreed, setNoticeAgreed] = useState(false);
  // 결제 방법 — 카드·간편결제(토스) / 무통장 입금(결제 없이 접수 → 입금 확인 후 확정)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  // 현금영수증 — 기본은 '신청 안 함'
  const [cashReceipt, setCashReceipt] = useState<CashReceipt>({ type: "신청 안 함", number: "" });
  const [fe, setFe] = useState<Record<string, boolean>>({});
  const clearFe = (k: string) => setFe((p) => (p[k] ? { ...p, [k]: false } : p));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(returning);
  const [done, setDone] = useState<Done | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetRef = useRef<TossPaymentWidgetHandle>(null);
  const [paymentOrderId] = useState(() => (orderProp?.kind === "cart" ? `cart-${slug}-${Date.now()}` : `order${Date.now()}`));
  // 찾아본 사진 — 이 탭에 보관해 둔 손님 사진 (서버 화면에선 읽을 수 없어 화면에 뜬 뒤 채운다)
  const [photoData, setPhotoData] = useState<string | null>(null);

  const refNotice = useRef<HTMLDivElement>(null);
  const refName = useRef<HTMLDivElement>(null);
  const refPhone = useRef<HTMLDivElement>(null);
  const refDeliveryType = useRef<HTMLDivElement>(null);
  const refDeliveryInfo = useRef<HTMLDivElement>(null);
  const refDate = useRef<HTMLDivElement>(null);
  const refTime = useRef<HTMLDivElement>(null);
  const refPayment = useRef<HTMLDivElement>(null);
  const refAgreement = useRef<HTMLDivElement>(null);

  // 달력·주소 검색을 미리 받아 둔다
  useEffect(() => { preloadOrderInputs(); }, []);
  useEffect(() => { setPhotoData(readPhotoOrder(slug)); }, [slug]);

  // 추가 불가로 둔 상품이면 앞서 고른 메시지 카드·수명연장제를 비운다 (금액·주문에 남지 않도록)
  useEffect(() => {
    if (product?.message_card_unavailable) {
      setForm((p) => ({ ...p, messageCard: "없음", messageCardContent: "" }));
      setMessageCardCount(0);
      setMessageCardContents([]);
    }
    if (product?.preservative_unavailable) {
      setForm((p) => ({ ...p, preservative: "없음" }));
      setPreservativeCount(0);
    }
  }, [product?.message_card_unavailable, product?.preservative_unavailable]);

  // ── 금액 ──
  const effMsg = quantity >= 2 ? messageCardCount : form.messageCard === "추가" ? 1 : 0;
  const effBag = quantity >= 2 ? shoppingBagCount : form.shoppingBag === "추가" ? 1 : 0;
  const effPreservative = quantity >= 2 ? preservativeCount : form.preservative === "추가" ? 1 : 0;
  const optionPrices = { bag: shoppingBagPrice, preservative: preservativePrice, card: messageCardPrice };
  const checkedItems = cart ? cart.items : [];
  const msgCardAmt = single && messageCardEnabled ? effMsg * messageCardPrice : 0;
  const bagAmt = single && shoppingBagEnabled && !product?.bag_included ? effBag * shoppingBagPrice : 0;
  const preservativeAmt = single && preservativeEnabled ? effPreservative * preservativePrice : 0;
  const goodsAmt = single ? (product?.price ?? 0) + msgCardAmt + bagAmt + preservativeAmt : checkedItems.reduce((s, i) => s + cartLineAmount(i, optionPrices), 0);
  const deliveryAmt = form.deliveryType === "배송" && deliveryFee !== null ? deliveryFee : 0;
  const finalPrice = goodsAmt + deliveryAmt;
  // 할인 — 정가에서 얼마 빠져 이 가격이 됐는지 보여준다 (결제 금액은 그대로 할인가 기준)
  const singleDiscount = single && product ? discountAmount(product.price, product.original_price) : 0;
  const cartDiscount = single ? 0 : checkedItems.reduce((s, i) => s + discountAmount(i.price, i.original_price) * i.quantity, 0);
  // 결제 금액 줄 — 상품 1개는 옵션을 나눠서(할인 중이면 정가 → 할인), 여러 개는 상품 금액(옵션 포함) 한 줄로(할인 중이면 정가 합계 → 할인)
  const lines: PriceLine[] = single
    ? [
        ...(singleDiscount > 0 && product
          ? [
              { label: "상품 정가", amount: product.original_price ?? 0 },
              { label: `할인 ${discountRate(product.price, product.original_price)}%`, amount: singleDiscount, minus: true },
            ]
          : [{ label: "상품", amount: product?.price ?? 0 }]),
        ...(msgCardAmt > 0 ? [{ label: effMsg > 1 ? `메시지 카드 ×${effMsg}` : "메시지 카드", amount: msgCardAmt, plus: true }] : []),
        ...(bagAmt > 0 ? [{ label: effBag > 1 ? `쇼핑백 ×${effBag}` : "쇼핑백", amount: bagAmt, plus: true }] : []),
        ...(preservativeAmt > 0 ? [{ label: effPreservative > 1 ? `생화 수명연장제 ×${effPreservative}` : "생화 수명연장제", amount: preservativeAmt, plus: true }] : []),
        ...(deliveryAmt > 0 ? [{ label: "배송비", amount: deliveryAmt, plus: true }] : []),
      ]
    : [
        { label: cartDiscount > 0 ? "상품 금액 (정가)" : "상품 금액", amount: goodsAmt + cartDiscount },
        ...(cartDiscount > 0 ? [{ label: "할인", amount: cartDiscount, minus: true }] : []),
        ...(deliveryAmt > 0 ? [{ label: "배송비", amount: deliveryAmt, plus: true }] : []),
      ];

  // ── 꽃 색 ──
  // 받는 날이 색 맞춤 가능 일수 안쪽이면 오늘 있는 색, 그 이후면 모든 색 중에서 고른다
  // 사장님 스타일은 색을 고르지 않는다 (사장님께 맡기는 주문 — 피하고 싶은 것만 대화에서 받았다)
  // 시즌 상품은 정해진 모습 그대로 파는 상품이라 색을 고르지 않는다 (장바구니에 하나라도 있으면 주문 전체)
  const hasSeasonal = single ? !!product && seasonalProductIds.includes(product.id) : checkedItems.some((i) => seasonalProductIds.includes(i.productId));
  const colorMode = isStyleOrder || hasSeasonal ? null : colorPickMode(colorPickEnabled, todayColors, colorLeadDays, desiredDate);
  const needsColor = colorMode !== null;
  // 찾아본 사진 주문 — 가까운 날인데 오늘 색이 없으면 색 고르기 대신 '매장에 준비된 꽃으로' 안내
  const photoNoColorNotice = isPhotoOrder && !needsColor && colorPickEnabled && isNearColorDate(colorLeadDays, desiredDate);
  // 색 맞춤 최소 금액은 상품 금액 기준 (추가 옵션·배송비 제외)
  const colorAmount = single ? product?.price ?? 0 : checkedItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── 배송비 — 주소를 고르면 매장까지 거리로 ──
  const pickAddress = async (addr: string) => {
    setAddress(addr);
    if (!storeAddress) return;
    setDistanceLoading(true);
    setDeliveryDistance(null);
    setDeliveryFee(null);
    const m = await measureDelivery(storeAddress, addr, deliveryFees);
    if (m) {
      setDeliveryDistance(m.km);
      setDeliveryFee(m.fee);
    }
    setDistanceLoading(false);
  };

  // ── 날짜·시간 ──
  // 고를 수 있는 날: 휴무 요일·휴무일 제외, 오늘부터 30일, 배송은 오늘 제외
  const dateAllowed = (date: Date) => {
    if (businessHours[String(date.getDay())]?.closed) return false;
    if (closedDates.includes(ymd(date))) return false;
    if (form.deliveryType === "배송" && ymd(date) === ymd(new Date())) return false;
    return true;
  };
  const now = new Date();
  const day = selectedDate ? resolveDayHours(selectedDate, businessHours, dateOverrides) : null;
  const isToday = !!selectedDate && ymd(selectedDate) === ymd(now);
  // 당일 준비 시간 — 주문 상품 유형 중 가장 오래 걸리는 것 (유형별로 정하지 않았으면 기본)
  const itemTypes = single ? [product?.product_type ?? ""] : checkedItems.map((i) => i.product_type);
  const leadHours = Math.max(0, ...itemTypes.map((t) => leadHoursFor(minLeadTimes, t)));
  const minTimeDate = isToday ? new Date(now.getTime() + leadHours * 3600_000) : null;
  // 준비 시간을 더했더니 다음 날로 넘어가면 오늘 고를 시간은 없다
  const leadOverflow = !!minTimeDate && ymd(minTimeDate) !== ymd(now);
  const leadStart = minTimeDate ? Math.ceil((minTimeDate.getHours() * 60 + minTimeDate.getMinutes()) / 30) * 30 : null;
  const slots: string[] = [];
  if (selectedDate && day && !day.closed && !leadOverflow) {
    const [oh, om] = day.open.split(":").map(Number);
    const [ch, cm] = day.close.split(":").map(Number);
    for (let t = Math.max(leadStart ?? 0, oh * 60 + om); t <= ch * 60 + cm; t += 30) {
      slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
  }
  // 영업시간 외 수령 — 오늘이면 준비 시간 이후만, 준비는 마감 전까지 끝나야 (사장님 설정에 따라)
  const extraSlots = selectedDate && !leadOverflow ? afterHoursSlots(day, afterHours, leadStart, { selectedDate, leadHours, businessHours, dateOverrides }) : [];

  // ── 보관한 주문서 되살리기 (결제 실패·저장 실패) ──
  const restore = (d: Draft) => {
    setRestoredOrder(d.order);
    onRestore?.(d.order);
    setForm(d.form);
    if (d.form.desiredDate) setSelectedDate(new Date(`${d.form.desiredDate}T00:00:00`));
    setMessageCardCount(d.counts.messageCardCount);
    setShoppingBagCount(d.counts.shoppingBagCount);
    setPreservativeCount(d.counts.preservativeCount);
    setMessageCardContents(d.counts.messageCardContents);
    setName(d.name);
    setPhone(formatPhone(d.phone));
    setRecipientName(d.recipientName);
    setRecipientPhone(d.recipientPhone ? formatPhone(d.recipientPhone) : "");
    setAddress(d.address);
    setAddressDetail(d.addressDetail);
    setDeliveryFee(d.deliveryFee);
    setDeliveryDistance(d.deliveryDistance);
    setPrivacyAgreed(d.privacyAgreed);
    setCancellationAgreed(d.cancellationAgreed);
    setNoticeAgreed(d.noticeAgreed);
  };

  const readDraft = (): Draft | null => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      const d = raw ? (JSON.parse(raw) as Draft) : null;
      return d && d.v === 2 ? d : null;
    } catch {
      return null;
    }
  };

  // ── 서버로 보내기 — 경로마다 예전과 같은 내용으로 ──
  const send = async (d: Draft, pay: { paymentKey: string; paymentOrderId: string | null; paymentAmount: number } | { transfer: CashReceipt }) => {
    const orderer = { name: d.name, phone: d.phone };
    const delivery = d.form.deliveryType === "배송" ? { recipientName: d.recipientName, recipientPhone: d.recipientPhone, address: d.address, addressDetail: d.addressDetail } : null;
    const payPart =
      "transfer" in pay
        ? { paymentMethod: "transfer", cashReceipt: pay.transfer.type === "신청 안 함" ? { type: "신청 안 함", number: "" } : pay.transfer }
        : { paymentKey: pay.paymentKey, paymentOrderId: pay.paymentOrderId, paymentAmount: pay.paymentAmount };
    let res: Response;
    if (d.order.kind === "single") {
      const o = d.order;
      const c = d.counts;
      // 예약 API가 받는 주문서 — 앞 단계 값 + 결제 화면 값 (옵션은 실제로 더한 개수로)
      const form: ConsultForm = {
        ...o.taste,
        deliveryType: d.form.deliveryType,
        desiredDate: d.form.desiredDate,
        desiredTime: d.form.desiredTime,
        requests: d.form.requests,
        preparedColor: d.form.preparedColor,
        messageCard: (o.quantity >= 2 ? c.messageCardCount : d.form.messageCard === "추가" ? 1 : 0) > 0 ? "추가" : "없음",
        messageCardContent: c.messageCardContents.filter(Boolean).join("\n[카드 구분]\n") || d.form.messageCardContent,
        shoppingBag: (o.quantity >= 2 ? c.shoppingBagCount : d.form.shoppingBag === "추가" ? 1 : 0) > 0 ? "추가" : "없음",
        preservative: (o.quantity >= 2 ? c.preservativeCount : d.form.preservative === "추가" ? 1 : 0) > 0 ? "추가" : "없음",
      };
      res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          companyName,
          notificationEmail,
          form,
          product: {
            id: o.product.id,
            name: o.product.name,
            price: o.product.price,
            product_type: o.product.product_type,
            image_url: isVirtualProductId(o.product.id) ? null : o.product.image_url,
            bag_included: o.product.bag_included ?? false,
          },
          orderer,
          delivery,
          finalPrice: d.finalPrice,
          ...payPart,
          trafficSource: d.source,
          orderPath: o.orderPath,
          // 찾아본 사진 — 이 탭에 보관해 둔 사진을 결제 승인 뒤 서버가 저장한다
          referenceImageData: o.product.id === PHOTO_PRODUCT_ID ? readPhotoOrder(slug) : null,
        }),
      });
    } else {
      const o = d.order;
      res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          companyName,
          notificationEmail,
          items: o.items,
          orderer,
          deliveryType: d.form.deliveryType,
          delivery,
          desiredDate: d.form.desiredDate,
          desiredTime: d.form.desiredTime,
          requests: d.form.requests,
          finalPrice: d.finalPrice,
          preparedColor: d.form.preparedColor,
          ...payPart,
          trafficSource: d.source,
          orderPath: o.orderPath,
          gift: o.gift ?? null,
        }),
      });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "예약 저장 실패");
    return data as { bankName?: string | null; bankAccount?: string | null; bankHolder?: string | null; orderToken?: string | null };
  };

  const finish = (d: Draft, transfer: Done["transfer"], orderToken: string | null = null) => {
    // 주문이 끝났으니 보관해 둔 사진은 비운다
    if (d.order.kind === "single" && d.order.product.id === PHOTO_PRODUCT_ID) {
      try { sessionStorage.removeItem(photoOrderKey(slug)); } catch { /* 무시 */ }
    }
    setDone({ draft: d, transfer, orderToken });
    onPaid?.();
    if (!keepScrollOnDone) window.scrollTo(0, 0);
  };

  // ── 결제창에서 돌아왔을 때 ──
  // 한 번만 처리한다 — 처리하면서 주소의 결제 값을 지우므로, 두 번 돌면(개발 모드의 effect 이중 실행 등) 두 번째가 '결제 정보 없음'으로 실패를 띄운다
  const returnHandled = useRef(false);
  useEffect(() => {
    if (!returning || returnHandled.current) return;
    returnHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const paymentKey = params.get("paymentKey");
    const returnedOrderId = params.get("orderId");
    const failCode = params.get("code");
    const returnedAmount = Number(params.get("amount") ?? "");
    const failMessage = params.get("message");
    // 결제 관련 값만 주소에서 지운다 — 사장님 스타일·사진 주문 정보(?style=…)·바로 예약(?direct=1)은 남긴다
    PAYMENT_PARAMS.forEach((k) => params.delete(k));
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);

    const draft = readDraft();
    sessionStorage.removeItem(draftKey);

    if (failCode || !paymentKey) {
      // 결제 실패·취소 — 입력해 둔 주문서를 되살려 다시 결제할 수 있게
      if (draft) restore(draft);
      setError(failCode ? failMessage ?? "결제가 취소되었습니다." : "결제 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      setProcessing(false);
      return;
    }
    if (!draft) {
      setError("결제 정보를 찾을 수 없습니다. 다시 시도해주세요.");
      setProcessing(false);
      return;
    }
    (async () => {
      setSubmitting(true);
      try {
        const data = await send(draft, { paymentKey, paymentOrderId: returnedOrderId, paymentAmount: returnedAmount || draft.finalPrice });
        finish(draft, null, data.orderToken ?? null);
      } catch (err) {
        // 저장 실패 — 입력한 내용 그대로 결제 화면에서 오류를 보여준다 (결제는 서버가 이미 취소했다)
        restore(draft);
        setError(err instanceof Error ? err.message : "예약 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
        setProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 결제하기 ──
  const makeDraft = (o: CheckoutOrder): Draft => ({
    v: 2,
    // 가상 상품의 사진(손님 사진)은 커서 보관하지 않는다 — 따로 보관해 둔 것을 쓴다
    order: o.kind === "single" ? { ...o, product: { ...o.product, image_url: isVirtualProductId(o.product.id) ? null : o.product.image_url } } : o,
    form: {
      ...form,
      desiredDate,
      // 색을 고르는 날짜일 때만 고른 색을 보낸다 (날짜를 바꿔 고르는 방식이 달라졌으면 비운다)
      preparedColor: needsColor ? form.preparedColor : "",
    },
    counts: { messageCardCount: effMsg, shoppingBagCount: effBag, preservativeCount: effPreservative, messageCardContents },
    name,
    phone: parsePhone(phone),
    recipientName,
    recipientPhone: parsePhone(recipientPhone),
    address,
    addressDetail,
    privacyAgreed,
    cancellationAgreed,
    noticeAgreed,
    deliveryFee,
    deliveryDistance,
    lines,
    finalPrice,
    // 이번 방문에서 기억해 둔 유입 출처 (?utm_source= / ?from=)
    source: readTrafficSource(slug),
  });

  const submit = async () => {
    if (!order || submitting) return;
    // 찾아본 사진 주문인데 보관된 사진이 없으면 (다른 탭·기기에서 열었을 때) 결제 전에 막는다
    if (isPhotoOrder && !readPhotoOrder(slug)) {
      setError("보내주신 사진이 없어요. 처음 화면에서 사진을 다시 보내주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const draft = makeDraft(order);

    // 무통장 입금 — 토스 결제 없이 바로 저장하고, 완료 화면에서 입금 계좌를 안내한다
    if (paymentMethod === "transfer") {
      try {
        const data = await send(draft, { transfer: cashReceipt });
        finish(draft, { bankName: data.bankName ?? null, bankAccount: data.bankAccount ?? null, bankHolder: data.bankHolder ?? null }, data.orderToken ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "예약 중 오류가 발생했습니다.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      // 결제창에 다녀오는 동안 주문서를 보관해 둔다
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
      // 지금 주소 그대로 돌아온다 — 사장님 스타일·사진 주문 정보(?style=…)·바로 예약(?direct=1)이 남도록
      const back = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      await widgetRef.current?.requestPayment({
        orderId: paymentOrderId,
        orderName:
          order.kind === "single"
            ? `${companyName} 맞춤 주문`
            : order.items.length === 1
              ? order.items[0].name
              : `${order.items[0].name} 외 ${order.items.length - 1}건`,
        successUrl: back,
        failUrl: back,
        customerName: name,
        customerMobilePhone: parsePhone(phone),
      });
      // 위 호출은 결제 페이지로 이동하므로 이 아래는 실행되지 않는다
    } catch (err) {
      sessionStorage.removeItem(draftKey);
      setError(err instanceof Error ? err.message : "결제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 빠진 칸 확인 → 첫 칸으로 이동, 다 채웠으면 결제
  const confirm = () => {
    const e: Record<string, boolean> = {};
    const digits = parsePhone(phone).length;
    if (consultNotice && !noticeAgreed) e.notice = true;
    if (!name) e.name = true;
    if (digits < 10 || digits > 11) e.phone = true;
    if (!form.deliveryType) e.deliveryType = true;
    if (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) e.deliveryInfo = true;
    if (!desiredDate) e.date = true;
    if (desiredDate && !form.desiredTime) e.time = true;
    if (needsColor && !form.preparedColor) e.color = true;
    if (paymentMethod === "transfer" && cashReceipt.type !== "신청 안 함" && cashReceiptError(cashReceipt)) e.receipt = true;
    if (!privacyAgreed) e.privacy = true;
    if (!cancellationAgreed) e.cancellation = true;
    if (Object.keys(e).length > 0) {
      setFe(e);
      const first = e.notice ? refNotice : e.name ? refName : e.phone ? refPhone : e.deliveryType ? refDeliveryType : e.deliveryInfo ? refDeliveryInfo : e.date || e.color ? refDate : e.time ? refTime : e.receipt ? refPayment : refAgreement;
      first.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFe({});
    submit();
  };


  return {
    restoredOrder, setRestoredOrder, order, single, cart, product, quantity, isPhotoOrder, isStyleOrder, form, setForm, set, selectedDate, setSelectedDate, desiredDate, name, setName, phone, setPhone, recipientName, setRecipientName, recipientPhone, setRecipientPhone, address, setAddress, addressDetail, setAddressDetail, deliveryFee, setDeliveryFee, deliveryDistance, setDeliveryDistance, distanceLoading, setDistanceLoading, messageCardCount, setMessageCardCount, shoppingBagCount, setShoppingBagCount, preservativeCount, setPreservativeCount, messageCardContents, setMessageCardContents, privacyAgreed, setPrivacyAgreed, cancellationAgreed, setCancellationAgreed, noticeAgreed, setNoticeAgreed, paymentMethod, setPaymentMethod, cashReceipt, setCashReceipt, fe, setFe, clearFe, submitting, setSubmitting, error, setError, processing, setProcessing, done, setDone, widgetReady, setWidgetReady, widgetRef, paymentOrderId, photoData, setPhotoData, refNotice, refName, refPhone, refDeliveryType, refDeliveryInfo, refDate, refTime, refPayment, refAgreement, effMsg, effBag, effPreservative, optionPrices, checkedItems, msgCardAmt, bagAmt, preservativeAmt, goodsAmt, deliveryAmt, finalPrice, lines, hasSeasonal, colorMode, needsColor, photoNoColorNotice, colorAmount, pickAddress, dateAllowed, now, day, isToday, itemTypes, leadHours, minTimeDate, leadOverflow, leadStart, slots, extraSlots, restore, readDraft, send, finish, makeDraft, submit, confirm,
  };
}

export type OrderCheckoutState = ReturnType<typeof useOrderCheckout>;
