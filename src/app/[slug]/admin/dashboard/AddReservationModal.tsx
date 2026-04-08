"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import DaumPostcodeEmbed from "react-daum-postcode";
import { Reservation } from "./reservations/types";
import { formatPhone, parsePhone, formatMoney, parseMoney } from "@/lib/format";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
registerLocale("ko", ko);

const PRODUCT_TYPES = ["다발", "바구니", "센터피스", "화병", "식물", "기타"];

interface SelectOption {
  value: string;
  label: string;
}

function CustomSelect({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
          disabled
            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
            : open
            ? "border-gray-400 bg-white text-gray-800"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        }`}
      >
        <span className={selected ? "" : "text-gray-400"}>{selected?.label ?? placeholder ?? "선택"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-1 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                o.value === value
                  ? "bg-gold-50 text-gold-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
  messageCardEnabled?: boolean;
  messageCardPrice?: number;
  shoppingBagEnabled?: boolean;
  shoppingBagPrice?: number;
  initialData?: Reservation;
  reservationId?: string;
}

const CHANNELS = ["Flo.Aide", "네이버", "카카오", "워크인"];
const CHANNEL_STYLE: Record<string, string> = {
  네이버: "border-[#03C75A] bg-[#03C75A] text-white",
  카카오: "border-[#FEE500] bg-[#FEE500] text-gray-800",
  워크인: "border-orange-400 bg-orange-400 text-white",
  "Flo.Aide": "border-gold-500 bg-gold-500 text-white",
};
const CHANNEL_IDLE: Record<string, string> = {
  네이버: "border-gray-200 text-gray-500 hover:border-[#03C75A] hover:text-[#03C75A]",
  카카오: "border-gray-200 text-gray-500 hover:border-yellow-400 hover:text-yellow-600",
  워크인: "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-400",
  "Flo.Aide": "border-gray-200 text-gray-500 hover:border-gold-500 hover:text-gold-600",
};
const DELIVERY_TYPES = ["픽업", "배송"];
const GENDERS = ["여성", "남성", "부모님"];
const AGES = ["10대", "20대", "30대", "40대", "50대 이상"];
const RELATIONSHIPS = ["연인", "가족", "친구", "직장동료/상사", "기타"];
const MOODS = ["깔끔한 화이트&그린", "화사한 파스텔톤", "선명한 비비드톤", "차분한 딥컬러"];


function parseNaverText(text: string) {
  const r: Record<string, string | Date | null | boolean> = {};

  // 예약자 이름
  const name = text.match(/예약자\s+([^\n]+)/);
  if (name) r.ordererName = name[1].trim();

  // 전화번호
  const phone = text.match(/전화번호\s+([\d\-]+)/);
  if (phone) r.ordererPhone = phone[1].replace(/\D/g, "");

  // 이용일시: 2026. 3. 7.(토) 오전 10:00
  const date = text.match(/이용일시\s+(\d{4})\.\s*(\d+)\.\s*(\d+)\.\(.+?\)\s+(오전|오후)\s+(\d+):(\d+)/);
  if (date) {
    const [, y, mo, d, ampm, h, mi] = date;
    let hour = parseInt(h);
    if (ampm === "오후" && hour !== 12) hour += 12;
    if (ampm === "오전" && hour === 12) hour = 0;
    r.selectedDate = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), hour, parseInt(mi));
  }

  // 상품명
  const productName = text.match(/상품\s+([^\n]+)/);
  if (productName) r.productName = productName[1].trim();

  // 결제금액
  const price = text.match(/결제금액\s+([\d,]+)원/);
  if (price) r.productPrice = price[1].replace(/,/g, "");

  // 결제상태
  if (text.includes("결제완료")) r.paid = true;

  // 채널 (유입경로)
  const route = text.match(/유입경로\s+([^\n]+)/);
  if (route) {
    if (route[1].includes("네이버")) r.channel = "네이버";
    else if (route[1].includes("카카오")) r.channel = "카카오";
  }

  const extras: string[] = [];

  // 옵션 섹션 - 필수 섹션 앞에서 중단
  const optSection = text.match(/옵션\s*([\s\S]+?)(?=필수|유입경로|예약자입력정보|결제정보|$)/);
  if (optSection) {
    const optText = optSection[1];
    // ** 로 시작하는 시스템 항목 제외
    const optLines = optText.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("*"));
    // 상품유형 감지
    if (optText.includes("꽃다발") || optText.includes("다발")) r.productType = "다발";
    else if (optText.includes("바구니")) r.productType = "바구니";
    else if (optText.includes("센터피스")) r.productType = "센터피스";
    else if (optText.includes("화병")) r.productType = "화병꽂이";
    // 쇼핑백 / 메시지 카드 감지
    if (optText.includes("쇼핑백")) r.shoppingBag = "추가";
    if (optText.includes("메시지카드") || optText.includes("메시지 카드")) r.messageCard = "추가";
    // 옵션 내용 요청사항에 추가
    if (optLines.length > 0) extras.push(`[옵션] ${optLines.join(", ")}`);
  }

  // 필수 섹션 - 쇼핑백/메시지카드 감지만 하고 extras에는 추가 안 함
  const reqSection = text.match(/필수\s*([\s\S]+?)(?=유입경로|예약자입력정보|결제정보|$)/);
  if (reqSection) {
    const reqText = reqSection[1];
    if (reqText.includes("쇼핑백")) r.shoppingBag = "추가";
    if (reqText.includes("메시지카드") || reqText.includes("메시지 카드")) r.messageCard = "추가";
  }

  // 예약자입력정보 답변 추출 (* 질문 및 < 포함 줄 제외)
  const infoSection = text.match(/예약자입력정보\s*([\s\S]+?)(?=결제정보|$)/);
  if (infoSection) {
    const lines = infoSection[1].split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("*") || line.includes("<")) continue;
      extras.push(line);
    }
  }

  if (extras.length > 0) r.requests = extras.join("\n");

  return r;
}

export default function AddReservationModal({ companyId, onClose, onSaved, messageCardEnabled = false, messageCardPrice = 0, shoppingBagEnabled = false, shoppingBagPrice = 0, initialData, reservationId }: Props) {
  const [channel, setChannel] = useState<string | null>(initialData?.channel ?? null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCopyInfo, setShowCopyInfo] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [showExtra, setShowExtra] = useState(!!(initialData?.purpose || initialData?.recipient_gender || initialData?.recipient_age || initialData?.relationship || initialData?.mood));
  const [refImageFiles, setRefImageFiles] = useState<File[]>([]);
  const [refImagePreviews, setRefImagePreviews] = useState<string[]>(initialData?.reference_images?.filter(Boolean) ?? []);
  const [refImageUrls, setRefImageUrls] = useState<string[]>(initialData?.reference_images?.filter(Boolean) ?? []);
  const [productType, setProductType] = useState(initialData?.product_type ?? "");
  const [productName, setProductName] = useState(initialData?.product_name ?? "");
  const [productPrice, setProductPrice] = useState(initialData?.product_price ? String(initialData.product_price) : "");
  const [ordererName, setOrdererName] = useState(initialData?.orderer_name ?? "");
  const [ordererPhone, setOrdererPhone] = useState(initialData?.orderer_phone ?? "");
  const [deliveryType, setDeliveryType] = useState(initialData?.delivery_type ?? "픽업");
  const [deliveryFee, setDeliveryFee] = useState(initialData?.delivery_fee != null ? String(initialData.delivery_fee) : "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!initialData?.desired_date) return null;
    const [y, m, d] = initialData.desired_date.split("-").map(Number);
    if (initialData.desired_time) {
      const [h, min] = initialData.desired_time.split(":").map(Number);
      return new Date(y, m - 1, d, h, min);
    }
    return new Date(y, m - 1, d);
  });
  const [messageCard, setMessageCard] = useState(initialData?.message_card ?? "없음");
  const [messageCardContent, setMessageCardContent] = useState(initialData?.message_card_content ?? "");
  const [shoppingBag, setShoppingBag] = useState(initialData?.shopping_bag ?? "없음");
  const [recipientGender, setRecipientGender] = useState(initialData?.recipient_gender ?? "");
  const [recipientAge, setRecipientAge] = useState(initialData?.recipient_age ?? "");
  const [relationship, setRelationship] = useState(initialData?.relationship ?? "");
  const [mood, setMood] = useState(initialData?.mood ?? "");
  const [purpose, setPurpose] = useState(initialData?.purpose ?? "");
  const [purposeCustom, setPurposeCustom] = useState(
    initialData?.purpose && !["기념", "축하", "감사", "위로"].includes(initialData.purpose) ? initialData.purpose : ""
  );
  const [requests, setRequests] = useState(initialData?.requests ?? "");
  const [recipientName, setRecipientName] = useState(initialData?.recipient_name ?? "");
  const [recipientPhone, setRecipientPhone] = useState(initialData?.recipient_phone ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [addressDetail, setAddressDetail] = useState(initialData?.address_detail ?? "");
  const [paid, setPaid] = useState(initialData?.paid ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const applyParsed = () => {
    const parsed = parseNaverText(pasteText);
    if (parsed.ordererName) setOrdererName(parsed.ordererName as string);
    if (parsed.ordererPhone) setOrdererPhone(formatPhone(parsed.ordererPhone as string));
    if (parsed.selectedDate) setSelectedDate(parsed.selectedDate as Date);
    if (parsed.productPrice) {
      let price = Number(parsed.productPrice);
      if (shoppingBagEnabled && parsed.shoppingBag === "추가") price -= shoppingBagPrice;
      if (messageCardEnabled && parsed.messageCard === "추가") price -= messageCardPrice;
      setProductPrice(String(Math.max(0, price)));
    }
    if (parsed.productName) setProductName(parsed.productName as string);
    if (parsed.productType) setProductType(parsed.productType as string);
    if (parsed.channel) setChannel(parsed.channel as string);
    if (parsed.requests) setRequests(parsed.requests as string);
    if (parsed.paid) setPaid(true);
    if (shoppingBagEnabled && parsed.shoppingBag) setShoppingBag(parsed.shoppingBag as string);
    if (messageCardEnabled && parsed.messageCard) setMessageCard(parsed.messageCard as string);
    setShowPaste(false);
    setPasteText("");
  };

  const finalPrice = useMemo(() => {
    return (Number(productPrice) || 0)
      + (messageCardEnabled && messageCard === "추가" ? messageCardPrice : 0)
      + (shoppingBagEnabled && shoppingBag === "추가" ? shoppingBagPrice : 0)
      + (deliveryType === "배송" ? (Number(deliveryFee) || 0) : 0);
  }, [productPrice, messageCard, messageCardEnabled, messageCardPrice, shoppingBag, shoppingBagEnabled, shoppingBagPrice, deliveryType, deliveryFee]);

  const handleRefImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - refImagePreviews.length;
    const toAdd = files.slice(0, remaining);
    setRefImageFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file);
      setRefImagePreviews((prev) => [...prev, url]);
    });
    e.target.value = "";
  };

  const handleRefImageRemove = (index: number) => {
    const isExisting = index < refImageUrls.length;
    if (isExisting) {
      setRefImageUrls((prev) => prev.filter((_, i) => i !== index));
      setRefImagePreviews((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - refImageUrls.length;
      setRefImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      setRefImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const uploadRefImages = async (): Promise<string[]> => {
    const uploaded: string[] = [];
    for (const file of refImageFiles) {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("reservation-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("reservation-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    }
    return [...refImageUrls, ...uploaded];
  };

  const handleSubmit = async () => {
    const desiredDate = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
      : "";
    const desiredTime = selectedDate
      ? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
      : "";

    const missing: string[] = [];
    if (!channel) missing.push("채널");
    if (!ordererName) missing.push("예약자 이름");
    if (!ordererPhone) missing.push("전화번호");
    if (!selectedDate) missing.push("예약 일시");
    if (!productType) missing.push("상품 유형");
    if (!productPrice) missing.push("상품 금액");
    if (missing.length > 0) {
      setFieldErrors(missing);
      return;
    }
    setFieldErrors([]);
    setSaving(true);
    setError(null);

    const uploadedImages = await uploadRefImages();

    // 수정 모드
    if (reservationId) {
      const { error: updateError } = await supabase.from("reservations").update({
        channel,
        orderer_name: ordererName,
        orderer_phone: parsePhone(ordererPhone),
        product_name: productName || productType || "",
        product_price: Number(productPrice) || 0,
        product_type: productType,
        purpose: purpose === "기타" ? purposeCustom : purpose,
        paid,
        final_price: finalPrice,
        recipient_gender: recipientGender,
        recipient_age: recipientAge,
        relationship,
        mood,
        message_card: messageCard,
        message_card_content: (messageCard === "추가" || messageCard === "서비스") ? messageCardContent || null : null,
        shopping_bag: shoppingBag,
        delivery_type: deliveryType,
        delivery_fee: deliveryType === "배송" && deliveryFee ? Number(deliveryFee) : null,
        desired_date: desiredDate,
        desired_time: desiredTime,
        requests: requests || null,
        recipient_name: deliveryType === "배송" ? recipientName || null : null,
        recipient_phone: deliveryType === "배송" ? parsePhone(recipientPhone) || null : null,
        address: deliveryType === "배송" ? address || null : null,
        address_detail: deliveryType === "배송" ? addressDetail || null : null,
        reference_images: uploadedImages.length > 0 ? uploadedImages : null,
      }).eq("id", reservationId);
      if (updateError) { setError(updateError.message); setSaving(false); return; }
      onSaved();
      return;
    }

    // customer_profile upsert
    let customerProfileId: string | null = null;
    if (ordererPhone) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .upsert({ company_id: companyId, phone: parsePhone(ordererPhone), name: ordererName }, { onConflict: "company_id,phone" })
        .select("id")
        .single();
      customerProfileId = profile?.id ?? null;
    }

    const { error: insertError } = await supabase.from("reservations").insert({
      company_id: companyId,
      customer_profile_id: customerProfileId,
      status: "준비중",
      channel: channel,
      orderer_name: ordererName,
      orderer_phone: parsePhone(ordererPhone),
      product_id: null,
      product_name: productName || productType || "",
      product_price: Number(productPrice) || 0,
      product_type: productType,
      product_image_url: null,
      quantity: 1,
      paid: paid,
      final_price: finalPrice,
      purpose: purpose === "기타" ? purposeCustom : purpose,
      recipient_gender: recipientGender,
      recipient_age: recipientAge,
      relationship: relationship,
      mood: mood,
      budget: "",
      message_card: messageCard,
      message_card_content: messageCard === "추가" ? messageCardContent || null : null,
      shopping_bag: shoppingBag,
      delivery_type: deliveryType,
      delivery_fee: deliveryType === "배송" && deliveryFee ? Number(deliveryFee) : null,
      desired_date: desiredDate,
      desired_time: desiredTime,
      requests: requests || null,
      recipient_name: deliveryType === "배송" ? recipientName || null : null,
      recipient_phone: deliveryType === "배송" ? parsePhone(recipientPhone) || null : null,
      address: deliveryType === "배송" ? address || null : null,
      address_detail: deliveryType === "배송" ? addressDetail || null : null,
      reference_images: uploadedImages.length > 0 ? uploadedImages : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    onSaved();
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white";
  const labelCls = "block text-xs text-gray-500 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">{reservationId ? "예약 수정" : "예약 직접 추가"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* 네이버 예약 텍스트 붙여넣기 */}
          <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
            <div
              role="button"
              onClick={() => {
                const next = !showPaste;
                setShowPaste(next);
                if (next) setTimeout(() => pasteTextareaRef.current?.focus(), 0);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="font-medium">네이버 예약 자동 입력</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowCopyInfo(true); }}
                  className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-500 flex items-center justify-center text-xs font-medium transition-colors"
                >
                  i
                </button>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${showPaste ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* 복사 방법 안내 모달 */}
            {showCopyInfo && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowCopyInfo(false)}>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-sm font-semibold text-gray-900">복사 방법 안내</h3>
                    <button type="button" onClick={() => setShowCopyInfo(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-5 space-y-3 overflow-y-auto">
                    <div className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
                      <p>네이버 예약 관리 페이지에서 예약 상세 내용을 아래 이미지의 범위대로 전체 선택 후 복사하여 붙여넣으세요.</p>
                      <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 pl-1">
                        <li>&#39;예약자&#39;부터 &#39;결제/환불정보&#39;까지 드래그하여 복사</li>
                        <li>이름, 전화번호, 가격, 이용 시간이 자동으로 입력됩니다.</li>
                        <li>예약자 입력 정보는 모두 요청 사항에 자동으로 입력됩니다</li>
                      </ul>
                    </div>
                    <img
                      src="/copy-info.png"
                      alt="복사 범위 안내"
                      className="w-full rounded-xl border border-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}
            {showPaste && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
                <textarea
                  ref={pasteTextareaRef}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text.trim()) {
                      setPasteText(text);
                      setTimeout(() => {
                        const parsed = parseNaverText(text);
                        if (parsed.ordererName) setOrdererName(parsed.ordererName as string);
                        if (parsed.ordererPhone) setOrdererPhone(formatPhone(parsed.ordererPhone as string));
                        if (parsed.selectedDate) setSelectedDate(parsed.selectedDate as Date);
                        if (parsed.productPrice) {
                          let price = Number(parsed.productPrice);
                          if (shoppingBagEnabled && parsed.shoppingBag === "추가") price -= shoppingBagPrice;
                          if (messageCardEnabled && parsed.messageCard === "추가") price -= messageCardPrice;
                          setProductPrice(String(Math.max(0, price)));
                        }
                        if (parsed.productName) setProductName(parsed.productName as string);
                        if (parsed.productType) setProductType(parsed.productType as string);
                        setChannel("네이버");
                        if (parsed.requests) setRequests(parsed.requests as string);
                        if (parsed.paid) setPaid(true);
                        if (shoppingBagEnabled && parsed.shoppingBag) setShoppingBag(parsed.shoppingBag as string);
                        if (messageCardEnabled && parsed.messageCard) setMessageCard(parsed.messageCard as string);
                        setShowPaste(false);
                        setPasteText("");
                      }, 0);
                      e.preventDefault();
                    }
                  }}
                  placeholder="네이버 예약 내용을 전체 복사해서 붙여넣으세요"
                  rows={5}
                  className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-400 resize-none text-gray-700"
                />
              </div>
            )}
          </div>

          {/* 예약자 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>예약자 이름 <span className="text-red-500">*</span></label>
              <input className={inputCls} value={ordererName} onChange={(e) => setOrdererName(e.target.value)} placeholder="홍길동" />
            </div>
            <div>
              <label className={labelCls}>예약자 연락처 <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                type="tel"
                value={ordererPhone}
                onChange={(e) => setOrdererPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
              />
            </div>
          </div>

          {/* 채널 */}
          <div>
            <label className={labelCls}>채널 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(channel === c ? null : c)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    channel === c ? CHANNEL_STYLE[c] : CHANNEL_IDLE[c] + " bg-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 상품 유형 */}
          <div>
            <label className={labelCls}>상품 유형 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProductType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    productType === t
                      ? "border-gold-500 bg-gold-500 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>상품명</label>
              <input
                className={inputCls}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예) 5만 핑크 꽃다발"
              />
            </div>
            <div>
              <label className={labelCls}>상품 가격 <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <input
                  className={inputCls}
                  type="text"
                  inputMode="numeric"
                  value={productPrice === "" ? "" : formatMoney(productPrice)}
                  onChange={(e) => setProductPrice(parseMoney(e.target.value) === 0 && e.target.value !== "0" ? "" : String(parseMoney(e.target.value)))}
                  placeholder="0"
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
            </div>
          </div>

          {/* 상세 정보 추가 (접기/펼치기) */}
          <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtra((p) => !p)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">상세 정보 추가</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${showExtra ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {showExtra && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
                {/* 선물 목적 */}
                <div>
                  <label className={labelCls}>선물 목적</label>
                  <div className="flex flex-wrap gap-2">
                    {["기념", "축하", "감사", "위로", "기타"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setPurpose(purpose === v ? "" : v); if (v !== "기타") setPurposeCustom(""); }}
                        className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${
                          purpose === v
                            ? "border-gold-500 bg-gold-500 text-white"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {purpose === "기타" && (
                    <input
                      className={`${inputCls} mt-2 w-40`}
                      value={purposeCustom}
                      onChange={(e) => setPurposeCustom(e.target.value)}
                      placeholder="직접 입력"
                    />
                  )}
                </div>

                {/* 받는 분 유형 */}
                <div>
                  <label className={labelCls}>받는 분 유형</label>
                  <div className="flex gap-2">
                    {GENDERS.map((g) => (
                      <button key={g} type="button" onClick={() => setRecipientGender(recipientGender === g ? "" : g)}
                        className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${recipientGender === g ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 받는 분 나이대 */}
                <div>
                  <label className={labelCls}>받는 분 나이대</label>
                  <div className="flex flex-wrap gap-2">
                    {AGES.map((a) => (
                      <button key={a} type="button" onClick={() => setRecipientAge(recipientAge === a ? "" : a)}
                        className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${recipientAge === a ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 받는 분과의 관계 */}
                <div>
                  <label className={labelCls}>받는 분과의 관계</label>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIPS.map((rel) => (
                      <button key={rel} type="button" onClick={() => setRelationship(relationship === rel ? "" : rel)}
                        className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${relationship === rel ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 선호하는 분위기 */}
                <div>
                  <label className={labelCls}>선호하는 분위기</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MOODS.map((m) => (
                      <button key={m} type="button" onClick={() => setMood(mood === m ? "" : m)}
                        className={`px-3 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${mood === m ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 수령 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>수령 방법</label>
              <div className="flex gap-2">
                {DELIVERY_TYPES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeliveryType(d)}
                    className={`flex-1 py-2 rounded-xl text-sm border-2 font-medium transition-all ${
                      deliveryType === d
                        ? "border-gold-500 bg-gold-500 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>수령 희망 일시 <span className="text-red-500">*</span></label>
              <DatePicker
                locale="ko"
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={30}
                dateFormat="yy년 M월 d일 (eee) HH:mm"
                minDate={new Date()}
                placeholderText="날짜와 시간을 선택해주세요"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-white cursor-pointer"
                wrapperClassName="w-full"
                calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg admin-modal-datepicker"
                popperPlacement="bottom-start"
                renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                  <div className="flex items-center justify-between px-3 py-1">
                    <button
                      type="button"
                      onClick={decreaseMonth}
                      disabled={prevMonthButtonDisabled}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600"
                    >
                      ‹
                    </button>
                    <span className="text-sm font-medium text-gray-800">
                      {date.getMonth() + 1}월
                    </span>
                    <button
                      type="button"
                      onClick={increaseMonth}
                      disabled={nextMonthButtonDisabled}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600"
                    >
                      ›
                    </button>
                  </div>
                )}
              />
            </div>
          </div>

          {/* 배송 정보 */}
          {deliveryType === "배송" && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>받는 분 이름</label>
                  <input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="홍길동" />
                </div>
                <div>
                  <label className={labelCls}>받는 분 연락처</label>
                  <input
                    className={inputCls}
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(formatPhone(e.target.value))}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>배송 주소</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1 min-w-0 cursor-pointer`}
                    value={address}
                    readOnly
                    onClick={() => setShowPostcode(true)}
                    placeholder="주소 검색"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPostcode(true)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 bg-white transition-colors whitespace-nowrap"
                  >
                    찾기
                  </button>
                </div>
                {showPostcode && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">주소 검색</span>
                      <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
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
              <div>
                <label className={labelCls}>상세 주소</label>
                <input className={inputCls} value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소" />
              </div>
              <div>
                <label className={labelCls}>배송비 (선택)</label>
                <input
                  className={inputCls}
                  type="text"
                  inputMode="numeric"
                  value={deliveryFee ? Number(deliveryFee).toLocaleString() : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setDeliveryFee(raw);
                  }}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* 메시지 카드 / 쇼핑백 */}
          {(messageCardEnabled || shoppingBagEnabled) && (
            <div className="grid grid-cols-2 gap-3">
              {messageCardEnabled && (
                <div>
                  <label className={labelCls}>메시지 카드{messageCardPrice > 0 && <span className="text-gray-400 font-normal ml-1">(+{messageCardPrice.toLocaleString()}원)</span>}</label>
                  <div className="flex gap-2 mt-1">
                    {["추가", "서비스", "없음"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setMessageCard(opt)}
                        className={`flex-1 py-2 rounded-xl text-sm border-2 font-medium transition-all ${
                          messageCard === opt
                            ? "border-gold-500 bg-gold-500 text-white"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {shoppingBagEnabled && (
                <div>
                  <label className={labelCls}>쇼핑백{shoppingBagPrice > 0 && <span className="text-gray-400 font-normal ml-1">(+{shoppingBagPrice.toLocaleString()}원)</span>}</label>
                  <div className="flex gap-2 mt-1">
                    {["추가", "서비스", "없음"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setShoppingBag(opt)}
                        className={`flex-1 py-2 rounded-xl text-sm border-2 font-medium transition-all ${
                          shoppingBag === opt
                            ? "border-gold-500 bg-gold-500 text-white"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messageCardEnabled && (messageCard === "추가" || messageCard === "서비스") && (
            <div>
              <label className={labelCls}>메시지 내용</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={messageCardContent} onChange={(e) => setMessageCardContent(e.target.value)} placeholder="메시지 내용 (30자 이내 작성 권장)" />
            </div>
          )}

          {/* 요청 사항 */}
          <div>
            <label className={labelCls}>요청 사항</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={5}
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              placeholder="요청 사항"
            />
          </div>

          {/* 참고 이미지 */}
          <div>
            <label className={labelCls}>참고 이미지 <span className="text-gray-300 font-normal">(최대 3장)</span></label>
            <div className="flex gap-2 flex-wrap">
              {refImagePreviews.map((url, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => handleRefImageRemove(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-900 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {refImagePreviews.length < 3 && (
                <label className="w-20 h-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-xs">추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleRefImageAdd}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 최종 가격 표시 */}
          <div className="bg-beige-50 border border-beige-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">최종 가격</span>
            <div className="text-right">
              <span className="text-base font-semibold text-gray-900">{finalPrice.toLocaleString()}원</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {Number(productPrice) > 0 && `상품 ${Number(productPrice).toLocaleString()}`}
                {messageCardEnabled && messageCard === "추가" && messageCardPrice > 0 && ` + 카드 ${messageCardPrice.toLocaleString()}`}
                {shoppingBagEnabled && shoppingBag === "추가" && shoppingBagPrice > 0 && ` + 쇼핑백 ${shoppingBagPrice.toLocaleString()}`}
                {deliveryType === "배송" && Number(deliveryFee) > 0 && ` + 배송비 ${Number(deliveryFee).toLocaleString()}`}
              </p>
            </div>
          </div>

          {fieldErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 입력해주세요.</p>
              <ul className="list-disc list-inside space-y-0.5">
                {fieldErrors.map((f) => (
                  <li key={f} className="text-xs text-red-500">{f}</li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-400 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "저장 중..." : (reservationId ? "수정 완료" : "예약 추가")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
