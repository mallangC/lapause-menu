"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
registerLocale("ko", ko);

const PRODUCT_TYPES = ["다발", "바구니", "센터피스", "화병", "기타"];

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
}

const CHANNELS = ["네이버", "카카오", "워크인"];
const CHANNEL_STYLE: Record<string, string> = {
  네이버: "border-[#03C75A] bg-[#03C75A] text-white",
  카카오: "border-[#FEE500] bg-[#FEE500] text-gray-800",
  워크인: "border-orange-400 bg-orange-400 text-white",
};
const CHANNEL_IDLE: Record<string, string> = {
  네이버: "border-gray-200 text-gray-500 hover:border-[#03C75A] hover:text-[#03C75A]",
  카카오: "border-gray-200 text-gray-500 hover:border-yellow-400 hover:text-yellow-600",
  워크인: "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-400",
};
const DELIVERY_TYPES = ["픽업", "배송"];
const GENDERS = ["여성", "남성"];
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

  // 옵션 섹션 - 상품유형 감지 + 내용 요청사항에 추가
  const optSection = text.match(/옵션\s*([\s\S]+?)(?=유입경로|예약자입력정보|결제정보|$)/);
  if (optSection) {
    const optText = optSection[1];
    const optLines = optText.split("\n").map((l) => l.trim()).filter(Boolean);
    // 상품유형 감지
    if (optText.includes("꽃다발") || optText.includes("다발")) r.productType = "다발";
    else if (optText.includes("바구니")) r.productType = "바구니";
    else if (optText.includes("센터피스")) r.productType = "센터피스";
    else if (optText.includes("화병")) r.productType = "화병꽂이";
    // 쇼핑백 / 메시지 카드 감지
    if (optText.includes("쇼핑백")) r.shoppingBag = "있음";
    if (optText.includes("메시지카드") || optText.includes("메시지 카드")) r.messageCard = "있음";
    // 옵션 내용 요청사항에 추가
    if (optLines.length > 0) extras.push(`[옵션] ${optLines.join(", ")}`);
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

export default function AddReservationModal({ companyId, onClose, onSaved, messageCardEnabled = false, messageCardPrice = 0, shoppingBagEnabled = false, shoppingBagPrice = 0 }: Props) {
  const [channel, setChannel] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [showCopyInfo, setShowCopyInfo] = useState(false);
  const [productType, setProductType] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [ordererName, setOrdererName] = useState("");
  const [ordererPhone, setOrdererPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("픽업");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [messageCard, setMessageCard] = useState("없음");
  const [messageCardContent, setMessageCardContent] = useState("");
  const [shoppingBag, setShoppingBag] = useState("없음");
  const [recipientGender, setRecipientGender] = useState("");
  const [recipientAge, setRecipientAge] = useState("");
  const [relationship, setRelationship] = useState("");
  const [mood, setMood] = useState("");
  const [requests, setRequests] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [paid, setPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const applyParsed = () => {
    const parsed = parseNaverText(pasteText);
    if (parsed.ordererName) setOrdererName(parsed.ordererName as string);
    if (parsed.ordererPhone) setOrdererPhone(parsed.ordererPhone as string);
    if (parsed.selectedDate) setSelectedDate(parsed.selectedDate as Date);
    if (parsed.productPrice) {
      let price = Number(parsed.productPrice);
      if (shoppingBagEnabled && parsed.shoppingBag === "있음") price -= shoppingBagPrice;
      if (messageCardEnabled && parsed.messageCard === "있음") price -= messageCardPrice;
      setProductPrice(String(Math.max(0, price)));
    }
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
      + (messageCardEnabled && messageCard === "있음" ? messageCardPrice : 0)
      + (shoppingBagEnabled && shoppingBag === "있음" ? shoppingBagPrice : 0)
      + (deliveryType === "배송" ? (Number(deliveryFee) || 0) : 0);
  }, [productPrice, messageCard, messageCardEnabled, messageCardPrice, shoppingBag, shoppingBagEnabled, shoppingBagPrice, deliveryType, deliveryFee]);

  const handleSubmit = async () => {
    const desiredDate = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
      : "";
    const desiredTime = selectedDate
      ? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
      : "";

    if (!ordererName || !ordererPhone) {
      setError("예약자와 연락처는 필수입니다.");
      return;
    }
    setSaving(true);
    setError(null);

    // customer_profile upsert
    let customerProfileId: string | null = null;
    if (ordererPhone) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .upsert({ company_id: companyId, phone: ordererPhone, name: ordererName }, { onConflict: "company_id,phone" })
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
      orderer_phone: ordererPhone,
      product_id: null,
      product_name: productType || "",
      product_price: Number(productPrice) || 0,
      product_type: productType,
      product_image_url: null,
      quantity: 1,
      paid: paid,
      final_price: finalPrice,
      purpose: "",
      recipient_gender: recipientGender,
      recipient_age: recipientAge,
      relationship: relationship,
      mood: mood,
      budget: "",
      message_card: messageCard,
      message_card_content: messageCard === "있음" ? messageCardContent || null : null,
      shopping_bag: shoppingBag,
      delivery_type: deliveryType,
      delivery_fee: deliveryType === "배송" && deliveryFee ? Number(deliveryFee) : null,
      desired_date: desiredDate,
      desired_time: desiredTime,
      requests: requests || null,
      recipient_name: deliveryType === "배송" ? recipientName || null : null,
      recipient_phone: deliveryType === "배송" ? recipientPhone || null : null,
      address: deliveryType === "배송" ? address || null : null,
      address_detail: deliveryType === "배송" ? addressDetail || null : null,
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
          <h3 className="font-medium text-gray-900">예약 직접 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* 네이버 예약 텍스트 붙여넣기 */}
          <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
            <div
              role="button"
              onClick={() => setShowPaste((p) => !p)}
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
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="네이버 예약 내용을 전체 복사해서 붙여넣으세요"
                  rows={5}
                  className="w-full mt-3 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gold-400 resize-none text-gray-700"
                />
                <button
                  type="button"
                  onClick={applyParsed}
                  disabled={!pasteText.trim()}
                  className="w-full py-2 bg-gold-500 text-white text-sm rounded-lg hover:bg-gold-600 disabled:opacity-40 transition-colors"
                >
                  자동 입력
                </button>
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
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  if (d.length <= 11) setOrdererPhone(d);
                }}
                placeholder="01012345678"
              />
            </div>
          </div>

          {/* 채널 */}
          <div>
            <label className={labelCls}>채널</label>
            <div className="flex gap-2">
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
            <label className={labelCls}>상품 유형</label>
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

          <div>
            <label className={labelCls}>상품 가격</label>
            <div className="flex items-center gap-2 w-1/2">
              <input
                className={inputCls}
                type="text"
                inputMode="numeric"
                value={productPrice === "" ? "" : Number(productPrice).toLocaleString()}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  if (/^\d*$/.test(raw)) setProductPrice(raw);
                }}
                placeholder="0"
              />
              <span className="text-sm text-gray-500 shrink-0">원</span>
            </div>
          </div>

          {/* 받는 분 정보 */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>받는 분 성별</label>
              <div className="flex gap-2">
                {GENDERS.map((g) => (
                  <button key={g} type="button" onClick={() => setRecipientGender(recipientGender === g ? "" : g)}
                    className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${recipientGender === g ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
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
            <div>
              <label className={labelCls}>받는 분과의 관계</label>
              <div className="flex flex-wrap gap-2">
                {RELATIONSHIPS.map((r) => (
                  <button key={r} type="button" onClick={() => setRelationship(relationship === r ? "" : r)}
                    className={`px-4 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${relationship === r ? "border-gold-500 bg-gold-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
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

          {/* 수령 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>수령 방법</label>
              <CustomSelect
                value={deliveryType}
                onChange={setDeliveryType}
                options={DELIVERY_TYPES.map((d) => ({ value: d, label: d }))}
              />
            </div>
            <div>
              <label className={labelCls}>수령 희망 일시</label>
              <DatePicker
                locale="ko"
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={30}
                dateFormat="yyyy년 MM월 dd일 (eee) HH:mm"
                minDate={new Date()}
                placeholderText="날짜와 시간을 선택해주세요"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold-400 bg-white cursor-pointer"
                wrapperClassName="w-full"
                calendarClassName="!font-sans !text-sm !border-gray-200 !rounded-xl !shadow-lg"
                popperPlacement="bottom-start"
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
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      if (d.length <= 11) setRecipientPhone(d);
                    }}
                    placeholder="01012345678"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>배송 주소</label>
                <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="주소" />
              </div>
              <div>
                <label className={labelCls}>상세 주소</label>
                <input className={inputCls} value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="상세 주소" />
              </div>
              <div>
                <label className={labelCls}>배송비 (선택)</label>
                <input className={inputCls} type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="0" />
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
                    {["있음", "없음"].map((opt) => (
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
                    {["있음", "없음"].map((opt) => (
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

          {messageCardEnabled && messageCard === "있음" && (
            <div>
              <label className={labelCls}>메시지 내용</label>
              <input className={inputCls} value={messageCardContent} onChange={(e) => setMessageCardContent(e.target.value.slice(0, 30))} placeholder="메시지 내용 (30자 이내)" />
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

          {/* 최종 가격 표시 */}
          <div className="bg-beige-50 border border-beige-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">최종 가격</span>
            <div className="text-right">
              <span className="text-base font-semibold text-gray-900">{finalPrice.toLocaleString()}원</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {Number(productPrice) > 0 && `상품 ${Number(productPrice).toLocaleString()}`}
                {messageCardEnabled && messageCard === "있음" && messageCardPrice > 0 && ` + 카드 ${messageCardPrice.toLocaleString()}`}
                {shoppingBagEnabled && shoppingBag === "있음" && shoppingBagPrice > 0 && ` + 쇼핑백 ${shoppingBagPrice.toLocaleString()}`}
                {deliveryType === "배송" && Number(deliveryFee) > 0 && ` + 배송비 ${Number(deliveryFee).toLocaleString()}`}
              </p>
            </div>
          </div>

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
              className="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-40 transition-colors"
            >
              {saving ? "저장 중..." : "예약 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
