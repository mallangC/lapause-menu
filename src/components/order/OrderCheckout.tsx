"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import TossPaymentWidget, { type TossPaymentWidgetHandle } from "@/components/TossPaymentWidget";
import { LazyDatePicker, preloadOrderInputs } from "@/components/LazyOrderInputs";
import {
  DeliverySection,
  MobilePayBox,
  OrderAgreements,
  OrdererSection,
  OwnerNoticeBox,
  PickupDateSection,
  PickupTimeSection,
  RequestsSection,
  SidePayBox,
  type PaymentProps,
} from "@/components/order/OrderSections";
import PreparedColorPicker, { PhotoOrderColorNotice } from "@/components/PreparedColorPicker";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import OrderCompleteHeader from "@/components/OrderCompleteHeader";
import { giftInfoText, type GiftInfo } from "@/components/GiftInfoStep";
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
  orderPath: "recommend" | "product_detail";
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
interface Draft {
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
interface CheckoutFields {
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

interface OptionCounts {
  messageCardCount: number;
  shoppingBagCount: number;
  preservativeCount: number;
  messageCardContents: string[];
}

type PriceLine = { label: string; amount: number; plus?: boolean };

/** 완료 화면에 보여줄 내용 (결제·접수가 끝난 순간 그대로) */
interface Done {
  draft: Draft;
  transfer: { bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null;
}

interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

interface Props {
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

const EMPTY_FIELDS: CheckoutFields = {
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
const PAYMENT_PARAMS = ["paymentKey", "orderId", "amount", "code", "message", "paymentType"];

/** 장바구니 상품 한 줄 금액 (상품 × 수량 + 옵션) */
const cartLineAmount = (i: CartItem, prices: { bag: number; preservative: number; card: number }) =>
  i.price * i.quantity + (!i.bag_included ? prices.bag * (i.shoppingBagCount ?? 0) : 0) + prices.preservative * (i.preservativeCount ?? 0) + prices.card * (i.messageCardCount ?? 0);

export default function OrderCheckout(props: Props) {
  const {
    slug, companyName, notificationEmail = null, order: orderProp, returning, draftKey, header, stepBar, themeVars, initialRequests = "", onRestore, onPaid, emptyFallback, seasonalProductIds = [],
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
  const [cashReceipt, setCashReceipt] = useState<CashReceipt>({ type: "소득공제", number: "" });
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
  // 결제 금액 줄 — 상품 1개는 옵션을 나눠서, 여러 개는 상품 금액(옵션 포함) 한 줄로
  const lines: PriceLine[] = single
    ? [
        { label: "상품", amount: product?.price ?? 0 },
        ...(msgCardAmt > 0 ? [{ label: effMsg > 1 ? `메시지 카드 ×${effMsg}` : "메시지 카드", amount: msgCardAmt, plus: true }] : []),
        ...(bagAmt > 0 ? [{ label: effBag > 1 ? `쇼핑백 ×${effBag}` : "쇼핑백", amount: bagAmt, plus: true }] : []),
        ...(preservativeAmt > 0 ? [{ label: effPreservative > 1 ? `생화 수명연장제 ×${effPreservative}` : "생화 수명연장제", amount: preservativeAmt, plus: true }] : []),
        ...(deliveryAmt > 0 ? [{ label: "배송비", amount: deliveryAmt, plus: true }] : []),
      ]
    : [{ label: "상품 금액", amount: goodsAmt }, ...(deliveryAmt > 0 ? [{ label: "배송비", amount: deliveryAmt, plus: true }] : [])];

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
    return data as { bankName?: string | null; bankAccount?: string | null; bankHolder?: string | null };
  };

  const finish = (d: Draft, transfer: Done["transfer"]) => {
    // 주문이 끝났으니 보관해 둔 사진은 비운다
    if (d.order.kind === "single" && d.order.product.id === PHOTO_PRODUCT_ID) {
      try { sessionStorage.removeItem(photoOrderKey(slug)); } catch { /* 무시 */ }
    }
    setDone({ draft: d, transfer });
    onPaid?.();
    window.scrollTo(0, 0);
  };

  // ── 결제창에서 돌아왔을 때 ──
  useEffect(() => {
    if (!returning) return;
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
        await send(draft, { paymentKey, paymentOrderId: returnedOrderId, paymentAmount: returnedAmount || draft.finalPrice });
        finish(draft, null);
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
        finish(draft, { bankName: data.bankName ?? null, bankAccount: data.bankAccount ?? null, bankHolder: data.bankHolder ?? null });
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
                <p className="text-base font-bold text-gold-500">{o.product.price.toLocaleString()}원</p>
              </div>
            </div>
          ) : (
            o.items.map((item) => (
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
                  <div key={l.label} className="flex justify-between text-sm text-gray-600">
                    <span>{l.label}</span>
                    <span>
                      {l.plus ? "+" : ""}
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
    onMethod: (m) => {
      setPaymentMethod(m);
      // 소득공제 번호는 주문자 연락처로 미리 채운다
      if (m === "transfer" && cashReceipt.type === "소득공제" && !cashReceipt.number) setCashReceipt({ type: "소득공제", number: parsePhone(phone) });
    },
    receipt: cashReceipt,
    onReceipt: (r) => { setCashReceipt(r); clearFe("receipt"); },
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
                  <p className="text-sm font-bold text-gold-500 pt-1">{product.price.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          ) : (
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
              afterHoursNote={afterHours.note}
              value={form.desiredTime}
              onSelect={(slot) => { set("desiredTime", slot); clearFe("time"); }}
              error={fe.time}
            />
          </PickupTimeSection>

          {/* 추가 옵션 — 상품 1개 주문만 (여러 개는 장바구니에서 상품마다 정한다) */}
          {single && (<>
                {/* 추가 옵션 */}
                {(messageCardEnabled || shoppingBagEnabled || preservativeEnabled) && (
                  <div className="bg-white overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700">추가 옵션</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {messageCardEnabled && !product?.message_card_unavailable && (
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
                        product?.bag_included ? (
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
                      {preservativeEnabled && !product?.preservative_unavailable && (
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
