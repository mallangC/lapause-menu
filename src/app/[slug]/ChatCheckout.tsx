"use client";

import PriceTag from "@/components/PriceTag";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TossPaymentWidget from "@/components/TossPaymentWidget";
import { LazyDatePicker } from "@/components/LazyOrderInputs";
import { ChatPayBox, DeliverySection, OrderAgreements, OrdererSection, OwnerNoticeBox, RequestsSection, type PaymentProps } from "@/components/order/OrderSections";
import PreparedColorPicker, { PhotoOrderColorNotice } from "@/components/PreparedColorPicker";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import CheckoutOptions from "@/components/order/CheckoutOptions";
import { useOrderCheckout, type Done, type OrderCheckoutProps, type SingleOrder } from "@/components/order/useOrderCheckout";
import { ymd } from "@/components/order/orderTypes";
import { formatPhone, parsePhone } from "@/lib/format";
import { PHOTO_PRODUCT_ID } from "@/lib/styleOrder";

// 첫 화면 대화 주문 — 결제 화면(OrderCheckout)의 칸을 잘라 대화로 묻고, 결제·완료까지 대화 안에서 끝낸다.
// 입력값·금액·결제·결제 복귀는 결제 화면과 같은 useOrderCheckout을 쓴다.
// 순서: 주문자 → 수령 방법 → 날짜(꽃 색) → 시간 → 추가 옵션 → 요청 사항 → 수령 정보 정리 → 결제 → 완료
// 결제창에 다녀오는 동안 대화는 부모(StoreWelcomeClient)가 이 탭에 보관했다가 되살린다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const dateLabel = (d: string) => {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WEEKDAYS[dt.getDay()]})`;
};

type StepId = "orderer" | "delivery" | "date" | "time" | "options" | "requests" | "pay";

export type CheckoutSettings = Omit<
  OrderCheckoutProps,
  "slug" | "companyName" | "order" | "returning" | "draftKey" | "header" | "stepBar" | "themeVars" | "initialRequests" | "onRestore" | "onPaid" | "emptyFallback"
>;

interface Props {
  slug: string;
  companyName: string;
  order: SingleOrder | null;
  settings: CheckoutSettings;
  /** 결제창에서 돌아오는 중 (주소에 결제 결과가 붙어 있음) */
  returning: boolean;
  /** 결제 전 대화 되살리기 — 결제 단계부터 다시 (앞 단계는 답한 것으로) */
  resumeAtPay?: boolean;
  /** 새로고침 등으로 되살린 완료 상태 (완료 대화만 다시 보여준다) */
  restoredDone?: Done | null;
  /** 요청 사항 처음 내용 (대화에서 받은 '피하고 싶은 색' 등) */
  initialRequests: string;
  /** 카드 결제창으로 떠나기 직전 — 대화를 이 탭에 보관 */
  onBeforePay: () => void;
  /** 결제·접수가 끝났을 때 — 완료 상태를 보관 (새로고침해도 같은 완료 대화) */
  onDone: (done: Done) => void;
  /** 처음 화면으로 — 보관한 대화를 지우고 새로 시작 */
  onRestart: () => void;
  kakaoChannelUrl?: string | null;
  storePhone?: string | null;
  // 말풍선 모양 (첫 화면 대화와 같게)
  avatar: React.ReactNode;
  avatarGap: React.ReactNode;
  bubbleText: string;
  replyBtn: string;
  /** 모바일에서 대화 끝을 화면 바닥에서 얼마나 띄울지(px) */
  mobileBottomGap?: number;
}

/** 답을 마친 카드가 '팍' 사라지지 않고 위로 접히며 사라지게 — 지금 높이에서 0으로 줄이며 흐려진다 */
const COLLAPSE_MS = 200;
// 열린 카드는 늘 이 상자 안에 두고(다시 그려지지 않게) closing이 되면 그때 접는다
function Collapse({ closing, children }: { closing: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.display = "none"; return; }
    // 지금 높이 → 0 (Web Animations — 스타일 전환 타이밍에 기대지 않는다)
    const h = el.scrollHeight;
    const anim = el.animate(
      [
        { height: `${h}px`, opacity: 1, transform: "none" },
        { height: "0px", opacity: 0, transform: "scaleY(.96)" },
      ],
      { duration: COLLAPSE_MS, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [closing]);
  return <div ref={ref} aria-hidden={closing || undefined} className={`origin-top ${closing ? "overflow-hidden pointer-events-none" : ""}`}>{children}</div>;
}

export default function ChatCheckout(props: Props) {
  const { slug, companyName, order, settings, returning, resumeAtPay = false, restoredDone = null, initialRequests, onBeforePay, onDone, onRestart, kakaoChannelUrl, storePhone, avatar, avatarGap, bubbleText, replyBtn, mobileBottomGap = 24 } = props;
  const c = useOrderCheckout({
    ...settings,
    slug,
    companyName,
    order,
    returning,
    draftKey: `chat_checkout_${slug}`,
    header: null,
    initialRequests,
    onPaid: () => {},
    // 결제가 끝나도 맨 위로 올리지 않는다 — 완료 말이 대화 끝에 이어 붙는다
    keepScrollOnDone: true,
  });
  const { form, set, selectedDate, setSelectedDate, desiredDate, name, phone, recipientName, recipientPhone, address, addressDetail, deliveryFee, deliveryDistance, distanceLoading, fe, clearFe, needsColor, colorMode, photoNoColorNotice, colorAmount, day, slots, extraSlots, lines, finalPrice, product } = c;
  const { messageCardEnabled, messageCardPrice, shoppingBagEnabled, shoppingBagPrice, preservativeEnabled, preservativePrice, deliveryEnabled, storeAddress, todayColors, colorMinPrice, afterHours, consultNotice, transferAvailable, isDemo } = settings;

  const hasOptions = messageCardEnabled || shoppingBagEnabled || preservativeEnabled;
  const steps: StepId[] = ["orderer", "delivery", "date", "time", ...(hasOptions ? (["options"] as StepId[]) : []), "requests", "pay"];
  const [at, setAt] = useState(resumeAtPay || returning ? steps.length - 1 : 0);
  const [editing, setEditing] = useState<StepId | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // ── 대화처럼 이어지게 ──
  // 처음 열릴 때: (앞 대화가 접히는 동안 잠깐) → 입력 중 → "좋아요!" → 입력 중 → 첫 질문
  // 결제창에서 돌아왔거나 되살린 경우는 바로 보여준다
  const fresh = !resumeAtPay && !returning && !restoredDone;
  const [intro, setIntro] = useState(fresh ? 0 : 3);
  // 다음 질문으로 넘어갈 때 잠깐 입력 중
  const [typingNow, setTypingNow] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!fresh) return;
    const t = timers.current;
    // 앞 대화가 위로 접혀 사라지면(0.42초) 요약 줄이 모이고 → 입력 중 → "좋아요!" → 첫 질문
    t.push(setTimeout(() => setIntro(1), 440));
    t.push(setTimeout(() => setIntro(2), 1200));
    t.push(setTimeout(() => setIntro(3), 1850));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 답을 마친 카드는 먼저 접히고(0.28초) → 그 자리에 내 답 말풍선 → 가게가 잠깐 입력하다 다음 질문
  const [closing, setClosing] = useState<StepId | null>(null);
  const closeThen = (id: StepId, fn: () => void) => {
    // 카드가 접히는 동안 대화 높이를 붙잡아 둔다 — 아래가 빈 공간이 될 뿐, 페이지가 짧아져 화면이 아래로 끌려 내려가지 않게
    if (rootEl) rootEl.style.minHeight = `${rootEl.offsetHeight}px`;
    setClosing(id);
    timers.current.push(setTimeout(() => { setClosing(null); fn(); }, COLLAPSE_MS));
  };
  // 답은 바로 말풍선으로 붙고, 가게가 잠깐 입력하다 다음 질문을 보낸다
  const withTyping = (fn: () => void) => {
    fn();
    setTypingNow(true);
    timers.current.push(setTimeout(() => setTypingNow(false), 400));
  };

  const done = restoredDone ?? c.done;
  // 완료되면 부모에게 알려 보관 (새로고침해도 같은 완료 대화)
  const reported = useRef(false);
  useEffect(() => {
    if (c.done && !reported.current) {
      reported.current = true;
      onDone(c.done);
    }
  }, [c.done, onDone]);

  // ── 화면 위치: 위로만, 한 번만 ──
  // 화면은 아래로 끌려 내려가지 않는다. 답한 카드가 접힌 자리(빈 공간)에 내 답 · 입력 중 · 다음 질문이 이어 붙고,
  // 대화 끝이 기준선(PC 위에서 2/3 · 모바일 화면 아래)을 넘을 때만 그만큼 위로 한 번 부드럽게 올린다.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const overflowBy = () => {
    const el = endRef.current;
    if (!el) return 0;
    const line = window.innerWidth < 768 ? window.innerHeight - mobileBottomGap : window.innerHeight * (2 / 3);
    return el.getBoundingClientRect().top - line;
  };
  const introRef = useRef(intro);
  introRef.current = intro;
  // 결제창에서 돌아왔거나 되살린 대화 — 새로 열린 페이지라 맨 위에서 시작한다. 결제를 마칠 때까지는 부드럽게 내려오지 않고 바로 대화 끝 자리로
  const jumpRef = useRef(!fresh);
  const scrollUpIfNeeded = () => {
    // 앞 대화가 위로 접히는 동안(첫 말 전)에는 화면을 건드리지 않는다
    if (introRef.current === 0) return;
    const d = overflowBy();
    if (d > 2) window.scrollTo({ top: window.scrollY + d, behavior: jumpRef.current ? "instant" : "smooth" });
  };
  // 달력처럼 늦게 그려져 길어지는 카드도 — 넘칠 때만 위로 (손님이 고치는 중 · 글을 쓰는 중에는 건드리지 않는다)
  useEffect(() => {
    if (!rootEl) return;
    const ro = new ResizeObserver(() => {
      if (editingRef.current) return;
      const a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || a.tagName === "INPUT") && rootEl.contains(a)) return;
      scrollUpIfNeeded();
    });
    ro.observe(rootEl);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootEl]);
  // 앞 답을 고치기 시작하면 그 질문이 화면 위쪽에 오게, 다 고치면 다시 대화 끝으로
  const wasEditing = useRef(false);
  useEffect(() => {
    const editEl = editing && !typingNow ? document.querySelector(`[data-chat-step="${editing}"]`) : null;
    if (editEl) {
      wasEditing.current = true;
      window.scrollTo({ top: editEl.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
      return;
    }
    if (editing) return;
    if (wasEditing.current) {
      wasEditing.current = false;
      const d = overflowBy();
      window.scrollTo({ top: Math.max(0, window.scrollY + d), behavior: "smooth" });
      return;
    }
    scrollUpIfNeeded();
    // 되살린 대화가 결제 완료(또는 결제 단계)까지 자리를 잡았으면 그다음부터는 평소처럼 부드럽게
    if (jumpRef.current && (done || (!c.processing && steps[at] === "pay"))) {
      const t = setTimeout(() => { jumpRef.current = false; }, 600);
      timers.current.push(t);
    }
    // 다음 질문까지 붙었으면 붙잡아 둔 높이를 놓는다 (이미 그보다 길어졌거나, 남는 빈 공간은 아래 여백일 뿐)
    if (!typingNow && !closing && rootEl && rootEl.style.minHeight && endRef.current) {
      const natural = endRef.current.getBoundingClientRect().bottom - rootEl.getBoundingClientRect().top;
      if (natural >= parseFloat(rootEl.style.minHeight)) rootEl.style.minHeight = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, editing, !!done, c.processing, !!c.error, intro, typingNow, closing]);

  // ── 단계별 확인 ──
  const check = (id: StepId): string | null => {
    const digits = parsePhone(phone).length;
    if (id === "orderer") {
      if (!name.trim()) return "성함을 적어주세요.";
      if (digits < 10 || digits > 11) return "연락처를 10~11자리로 적어주세요.";
    }
    if (id === "delivery") {
      if (!form.deliveryType) return "픽업과 배송 중에서 골라주세요.";
      if (form.deliveryType === "배송" && (!recipientName || !recipientPhone || !address)) return "받는 분 정보와 주소를 적어주세요.";
      if (form.deliveryType === "배송" && distanceLoading) return "배송비를 계산하고 있어요. 잠시만 기다려주세요.";
    }
    if (id === "date") {
      if (!desiredDate) return "받으실 날짜를 골라주세요.";
      if (needsColor && !form.preparedColor) return "꽃 색을 골라주세요.";
    }
    if (id === "time" && !form.desiredTime) return "받으실 시간을 골라주세요.";
    return null;
  };
  const next = (id: StepId) => {
    const err = check(id);
    if (err) { setStepError(err); return; }
    setStepError(null);
    if (closing) return;
    closeThen(id, () => afterAnswer(id));
  };
  const afterAnswer = (id: StepId) => {
    if (editing) {
      // 날짜를 고치면 시간도 꼭 다시 고르게 (그 날 영업시간이 달라 고른 시간이 없어질 수 있다)
      if (id === "date") { withTyping(() => setEditing("time")); return; }
      // 고치다 앞뒤 답이 비었으면(배송으로 바꿔 오늘 날짜가 풀린 경우 등) 그 질문을 이어서 연다
      const broken = steps.slice(0, at).find((sid) => sid !== id && sid !== "pay" && check(sid));
      if (broken) { withTyping(() => setEditing(broken)); return; }
      setEditing(null);
      return;
    }
    withTyping(() => setAt((i) => Math.min(i + 1, steps.length - 1)));
  };

  // ── 답 요약 (내 말풍선) ──
  const answerOf = (id: StepId): string => {
    switch (id) {
      case "orderer": return `${name} · ${phone}`;
      case "delivery":
        return form.deliveryType === "배송"
          ? `배송 · ${address}${addressDetail ? ` ${addressDetail}` : ""}${deliveryFee != null ? ` (배송비 ${deliveryFee.toLocaleString()}원)` : ""}`
          : "매장에서 픽업할게요";
      case "date": return `${dateLabel(desiredDate)}${form.preparedColor ? ` · 꽃 색 ${form.preparedColor}` : ""}`;
      case "time": return form.desiredTime;
      case "options": {
        const picked = [
          form.messageCard === "추가" || c.messageCardCount > 0 ? "메시지 카드" : "",
          form.shoppingBag === "추가" || c.shoppingBagCount > 0 ? "쇼핑백" : "",
          form.preservative === "추가" || c.preservativeCount > 0 ? "생화 수명연장제" : "",
        ].filter(Boolean);
        return picked.length ? `${picked.join(" · ")} 추가할게요` : "추가 없이 할게요";
      }
      case "requests": return form.requests.trim() ? form.requests.trim() : "따로 없어요";
      default: return "";
    }
  };
  const QUESTION: Record<StepId, string> = {
    orderer: "주문하시는 분 성함과 연락처를 알려주세요.",
    delivery: "어떻게 받으시겠어요?",
    date: "언제 받으시겠어요?",
    time: "몇 시에 받으시겠어요?",
    options: "추가로 필요한 게 있으세요?",
    requests: "다른 요청사항이 있으실까요?",
    pay: "주문 내용을 확인하고 결제해 주세요.",
  };

  // ── 말풍선 ──
  // (컴포넌트가 아니라 그리는 함수 — 매번 새 컴포넌트가 되면 입력칸이 다시 만들어져 글자를 칠 때마다 포커스가 빠진다)
  const shop = (children: React.ReactNode, first = true) => (
    <div className={`welcome-in flex items-start gap-2.5 ${first ? "mt-4" : ""}`}>
      {first ? avatar : avatarGap}
      <div className="min-w-0 flex-1">
        {first && <p className="text-[13px] text-gray-500 mb-1">{companyName}</p>}
        <div className={`inline-block max-w-[85%] break-keep whitespace-pre-line px-4 py-2.5 rounded-2xl rounded-tl-md bg-white text-gray-800 ${bubbleText}`}>{children}</div>
      </div>
    </div>
  );
  const shopCard = (children: React.ReactNode) => (
    <div className="welcome-in flex items-start gap-2.5">
      {avatarGap}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
  const me = (text: string, onEdit?: () => void) => (
    <div className="welcome-in flex justify-end mt-2">
      {onEdit ? (
        <button type="button" onClick={onEdit} title="다시 고르기" className={`max-w-[85%] text-right break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-gold-500 text-white hover:bg-gold-600 transition-colors ${bubbleText}`}>
          {text}
        </button>
      ) : (
        <p className={`max-w-[85%] break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-gold-500 text-white ${bubbleText}`}>{text}</p>
      )}
    </div>
  );
  const nextBtn = (id: StepId, label = "다음") => (
    <div className="flex flex-col items-end gap-1.5 mt-2">
      {stepError && <p className="text-xs text-red-500">{stepError}</p>}
      <button type="button" onClick={() => next(id)} className={replyBtn}>{editing === id ? "고쳤어요" : label}</button>
    </div>
  );
  const card = "bg-white rounded-2xl overflow-hidden";
  const typingBubble = (first: boolean) => (
    <div className={`welcome-in flex items-start gap-2.5 ${first ? "mt-4" : ""}`}>
      {first ? avatar : avatarGap}
      <span className="inline-flex items-center gap-1 px-4 py-4 rounded-2xl rounded-tl-md bg-white">
        {[0, 0.2, 0.4].map((dl) => (
          <span key={dl} className="welcome-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${dl}s` }} />
        ))}
      </span>
    </div>
  );

  // ── 단계 입력 카드 ──
  const stepCard = (id: StepId) => {
    switch (id) {
      case "orderer":
        return (
          <>
            <div className={card}>
              <OrdererSection name={name} phone={phone} onName={(v) => { c.setName(v); clearFe("name"); }} onPhone={(v) => { c.setPhone(v); clearFe("phone"); }} errors={fe} />
            </div>
            {nextBtn(id)}
          </>
        );
      case "delivery":
        return (
          <>
            <div className={card}>
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
                onRecipientName={(v) => { c.setRecipientName(v); clearFe("deliveryInfo"); }}
                recipientPhone={recipientPhone}
                onRecipientPhone={(v) => { c.setRecipientPhone(v); clearFe("deliveryInfo"); }}
                address={address}
                onAddress={c.pickAddress}
                addressDetail={addressDetail}
                onAddressDetail={c.setAddressDetail}
                storeAddress={storeAddress}
                distance={{ loading: distanceLoading, km: deliveryDistance, fee: deliveryFee }}
                errors={fe}
              />
            </div>
            {nextBtn(id)}
          </>
        );
      case "date":
        return (
          <>
            <div className={`${card} p-3`}>
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
                  filterDate={c.dateAllowed}
                />
              </div>
              {needsColor && (
                <PreparedColorPicker
                  mode={colorMode!}
                  todayColors={todayColors}
                  value={form.preparedColor}
                  onChange={(v) => { set("preparedColor", v); clearFe("color"); }}
                  error={fe.color}
                  hasPhoto
                  minPrice={colorMinPrice}
                  amount={colorAmount}
                  photoOrder={c.isPhotoOrder}
                />
              )}
              {photoNoColorNotice && <PhotoOrderColorNotice />}
            </div>
            {nextBtn(id)}
          </>
        );
      case "time":
        return (
          <>
            <div className={`${card} p-4`}>
              {!selectedDate || !day || day.closed || (slots.length === 0 && extraSlots.length === 0) ? (
                <p className="text-sm text-gray-500 break-keep">이 날은 받으실 수 있는 시간이 없어요. 날짜를 다시 골라주세요.</p>
              ) : (
                <TimeSlotGrid
                  slots={slots}
                  extraSlots={extraSlots}
                  afterHoursNote={afterHours.note}
                  value={form.desiredTime}
                  onSelect={(slot) => {
                    set("desiredTime", slot);
                    clearFe("time");
                    // 시간을 고르면 바로 다음으로
                    setStepError(null);
                    if (closing) return;
                    closeThen("time", () => {
                      if (editing === "time") setEditing(null);
                      else withTyping(() => setAt((i) => Math.min(i + 1, steps.length - 1)));
                    });
                  }}
                  error={fe.time}
                />
              )}
            </div>
            {(!selectedDate || slots.length + extraSlots.length === 0) && (
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => { setEditing("date"); setStepError(null); }} className={replyBtn}>날짜 다시 고를게요</button>
              </div>
            )}
          </>
        );
      case "options":
        return (
          <>
            <div className={card}>
              <CheckoutOptions c={c} messageCardEnabled={messageCardEnabled} messageCardPrice={messageCardPrice} shoppingBagEnabled={shoppingBagEnabled} shoppingBagPrice={shoppingBagPrice} preservativeEnabled={preservativeEnabled} preservativePrice={preservativePrice} />
            </div>
            {nextBtn(id)}
          </>
        );
      case "requests":
        return (
          <>
            <div className={card}>
              <RequestsSection value={form.requests} onChange={(v) => set("requests", v)} />
            </div>
            {nextBtn(id, form.requests.trim() ? "다음" : "따로 없어요")}
          </>
        );
      default:
        return null;
    }
  };

  // ── 결제 ──
  const payment: PaymentProps = {
    method: c.paymentMethod,
    onMethod: (m) => c.setPaymentMethod(m),
    receipt: c.cashReceipt,
    onReceipt: (r) => {
      c.setCashReceipt(r.type === "소득공제" && !r.number ? { ...r, number: parsePhone(phone) } : r);
      clearFe("receipt");
    },
    receiptError: fe.receipt,
    transferAvailable,
  };
  const agreements = (
    <OrderAgreements
      privacy={c.privacyAgreed}
      onPrivacy={(v) => { c.setPrivacyAgreed(v); clearFe("privacy"); }}
      cancellation={c.cancellationAgreed}
      onCancellation={(v) => { c.setCancellationAgreed(v); clearFe("cancellation"); }}
      errors={fe}
    />
  );
  const pay = () => {
    // 카드 결제는 결제창으로 떠난다 — 그 전에 대화를 보관 (돌아와서 되살린다)
    if (c.paymentMethod === "card") onBeforePay();
    c.confirm();
  };

  // 수령 정보 정리 (2단계 정리 카드)
  const receiveRows: { label: string; value: string }[] = [
    { label: "주문자", value: `${name} · ${phone}` },
    { label: "수령 방법", value: form.deliveryType || "-" },
    ...(form.deliveryType === "배송" ? [{ label: "받는 분", value: `${recipientName} · ${recipientPhone}` }, { label: "배송지", value: `${address}${addressDetail ? ` ${addressDetail}` : ""}` }] : []),
    { label: "받는 날", value: `${dateLabel(desiredDate)} ${form.desiredTime}`.trim() },
    ...(form.preparedColor ? [{ label: "꽃 색", value: form.preparedColor }] : []),
    ...(form.requests.trim() ? [{ label: "요청 사항", value: form.requests.trim() }] : []),
  ];

  // ── 완료 ──
  if (done) {
    const d = done.draft;
    const o = d.order;
    const transfer = done.transfer;
    const productName = o.kind === "single" ? o.product.name : "";
    const productType = o.kind === "single" ? o.product.product_type : "";
    return (
      <div ref={setRootEl} className="flex flex-col gap-1.5">
        {/* 완료 — 말풍선 하나 + (무통장이면 입금 계좌) + 주문 카드(수령 장소·알림톡 안내·문의 버튼까지) */}
        {shop(<>{transfer ? "예약이 접수됐어요!\n아래 계좌로 입금해 주시면 확정돼요." : "결제가 완료됐어요! 🎉\n사장님이 확인하고 준비를 시작할게요."}</>)}
        {transfer &&
          shopCard(<>
            <div className={`${card} w-full max-w-[320px] p-4 space-y-2`}>
              <p className="text-sm font-semibold text-gray-900">입금 계좌</p>
              {[
                ["은행", transfer.bankName],
                ["계좌번호", transfer.bankAccount],
                ["예금주", transfer.bankHolder],
                ["입금 금액", `${d.finalPrice.toLocaleString()}원`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-gray-400">{l}</span>
                  <span className="flex-1 text-gray-800 font-medium">{v ?? "-"}</span>
                  {l === "계좌번호" && v && (
                    <button type="button" onClick={() => navigator.clipboard?.writeText(String(v).replace(/\D/g, "")).catch(() => {})} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500">복사</button>
                  )}
                </div>
              ))}
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 break-keep">주문자 이름으로 입금해 주세요.</p>
            </div>
          </>)}
        {shopCard(<>
          <div className={`${card} w-full max-w-[320px] px-4 py-3.5`}>
            <p className={`font-semibold text-gray-900 mb-2 ${bubbleText}`}>주문 내용</p>
            <dl className="space-y-1.5 text-sm">
              {[
                ["상품", productType && productName ? `${productType} · ${productName}` : productName],
                ["주문자", `${d.name} · ${formatPhone(d.phone)}`],
                ["받는 날", `${dateLabel(d.form.desiredDate)} ${d.form.desiredTime}`.trim()],
                // 수령 — 배송은 배송 주소, 픽업은 매장 주소까지
                ["수령", d.form.deliveryType === "배송" ? `배송 · ${d.address}${d.addressDetail ? ` ${d.addressDetail}` : ""}` : storeAddress ? `픽업 · ${storeAddress}` : "픽업"],
                // 할인받았으면 얼마 빠졌는지 (정가에서 할인 → 이 금액)
                ...(d.lines ?? []).filter((x) => x.minus).map((x) => [x.label, `-${x.amount.toLocaleString()}원`]),
                [transfer ? "입금 금액" : "결제 금액", `${d.finalPrice.toLocaleString()}원`],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-3">
                  <dt className="w-16 shrink-0 text-gray-400">{l}</dt>
                  <dd className="flex-1 text-gray-800 break-keep">{v}</dd>
                </div>
              ))}
            </dl>
            {/* 알림톡 안내 · 문의 — 필요할 때 찾는 정보라 카드 아래 작게 */}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
              <p className="text-xs text-gray-400 break-keep">
                {transfer ? "입금이 확인되면 사장님이 예약을 확정해요. " : ""}예약이 확정되거나 취소되면 카카오 알림톡으로 알려드려요.
              </p>
              {(kakaoChannelUrl || storePhone) && (
                <div className="flex flex-wrap gap-2">
                  {kakaoChannelUrl && (
                    <a href={kakaoChannelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEE500] text-[#191919] text-[13px] font-medium">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#191919" aria-hidden><path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z" /></svg>
                      카카오톡 문의
                    </a>
                  )}
                  {storePhone && (
                    <a href={`tel:${storePhone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 text-[13px] font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                      전화하기
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </>)}
        <div className="flex flex-wrap justify-end gap-2 mt-5">
          <a href={`/${slug}/menu`} className={replyBtn}>상품 둘러보기</a>
          <button type="button" onClick={onRestart} className={replyBtn}>처음 화면으로</button>
        </div>
        <div ref={endRef} />
      </div>
    );
  }

  // 결제창에서 돌아와 확인하는 중
  if (c.processing) {
    return (
      <div ref={setRootEl} className="flex flex-col gap-1.5">
        <div className="welcome-in flex items-start gap-2.5 mt-4">
          {avatar}
          <span className="inline-flex items-center gap-1 px-4 py-4 rounded-2xl rounded-tl-md bg-white">
            <span className={`text-gray-500 mr-1 -my-1 ${bubbleText}`}>결제 확인 중</span>
            {[0, 0.2, 0.4].map((dl) => (
              <span key={dl} className="welcome-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${dl}s` }} />
            ))}
          </span>
        </div>
        <div ref={endRef} />
      </div>
    );
  }

  // 결제 정보를 잃은 채 돌아옴 (다른 브라우저로 돌아온 경우 등) — 대화도 주문서도 없으면 처음부터
  if (!order) {
    return (
      <div ref={setRootEl} className="flex flex-col gap-1.5">
        {shop(<>{"주문 정보를 찾지 못해 결제가 완료되지 않았어요.\n처음부터 다시 주문해 주세요."}</>)}
        <div className="flex justify-end mt-4">
          <button type="button" onClick={onRestart} className={replyBtn}>처음 화면으로</button>
        </div>
        <div ref={endRef} />
      </div>
    );
  }

  const photoImage = product?.id === PHOTO_PRODUCT_ID ? c.photoData : product?.image_url ?? null;

  return (
    <div ref={setRootEl} className="flex flex-col gap-1.5">
      <TossPaymentWidget ref={c.widgetRef} customerKey={c.paymentOrderId} amount={finalPrice} onReadyChange={c.setWidgetReady} onCancel={() => c.setSubmitting(false)} isDemo={isDemo} />

      {/* 지금까지 고른 것 — 맨 위에 붙어 따라온다 */}
      {intro >= 1 && <div className={`${fresh ? "summary-gather" : ""} sticky top-0 z-20 -mx-4 md:-mx-5 px-4 md:px-5 py-2 bg-beige-100/95 backdrop-blur border-b border-beige-200`}>
        <p className="text-[13px] text-gray-600 truncate">
          <span className="font-medium text-gray-800">{product?.product_type}</span>
          {` · ${finalPrice.toLocaleString()}원`}
          {desiredDate ? ` · ${dateLabel(desiredDate)}` : ""}
          {form.desiredTime ? ` ${form.desiredTime}` : ""}
          {form.deliveryType ? ` · ${form.deliveryType}` : ""}
        </p>
      </div>}

      {intro === 1 && <div className="chat-rise">{typingBubble(true)}</div>}
      {intro >= 2 && <div className={fresh ? "chat-rise" : undefined}>{shop(<>{"좋아요! 받으실 정보만 알려주시면 주문 도와드릴게요."}</>)}</div>}
      {intro === 2 && typingBubble(false)}

      {intro >= 3 && steps.slice(0, at + 1).map((id, i) => {
        if (id === "pay") return null;
        // 새 질문은 가게가 입력을 마친 뒤에
        if (i === at && typingNow) return null;
        // 날짜를 고치는 동안 시간은 접어 두고, 날짜를 마치면 시간을 새로 묻는다
        if (id === "time" && (editing === "date" || (editing === "time" && typingNow))) return null;
        // 앞 답을 고치는 동안 아직 답하지 않은 지금 질문은 숨긴다 (답한 것처럼 보이지 않게 — 다 고치면 다시 나온다)
        if (editing && i === at && id !== editing) return null;
        const isOpen = editing === id || (!editing && i === at);
        return (
          <div key={id} data-chat-step={id} className="flex flex-col gap-1.5">
            {shop(<>{QUESTION[id]}</>, i !== 0)}
            {isOpen ? <Collapse closing={closing === id}>{shopCard(stepCard(id))}</Collapse> : me(answerOf(id), () => { setEditing(id); setStepError(null); })}
          </div>
        );
      })}

      {/* 다음 질문 준비 중 */}
      {typingNow && typingBubble(true)}

      {/* 결제 — 수령 정보 정리 → 안내 사항 → 결제 카드 */}
      {intro >= 3 && steps[at] === "pay" && !editing && !typingNow && (
        <>
          {shop(<>수령 정보 확인해 주세요.</>)}
          {shopCard(<>
            <div className={`${card} w-full max-w-[320px] px-4 py-3.5`}>
              <dl className="space-y-1.5 text-sm">
                {receiveRows.map((r) => (
                  <div key={r.label} className="flex gap-3">
                    <dt className="w-16 shrink-0 text-gray-400">{r.label}</dt>
                    <dd className="flex-1 text-gray-800 break-keep whitespace-pre-line">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>)}
          {c.error && shop(<>{`결제가 완료되지 않았어요.\n${c.error}`}</>, false)}
          {shop(<>{QUESTION.pay}</>, false)}
          {shopCard(<>
            <div className="space-y-2">
              {photoImage && (
                <div className={`${card} flex items-center gap-3 p-3`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 손님 사진(data URL)일 수 있어 */}
                  <img src={photoImage} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{product?.product_type}</p>
                    <p className="text-sm font-medium text-gray-900">{product?.name}</p>
                    {product && <p className="mt-0.5"><PriceTag price={product.price} original={product.original_price} size="xs" /></p>}
                  </div>
                </div>
              )}
              {consultNotice && (
                <div className={card}>
                  <OwnerNoticeBox notice={consultNotice} agreed={c.noticeAgreed} onAgree={(v) => { c.setNoticeAgreed(v); clearFe("notice"); }} error={fe.notice} />
                </div>
              )}
              <ChatPayBox lines={lines} total={finalPrice} payment={payment} agreements={agreements} error={null} onConfirm={pay} submitting={c.submitting} cardNotReady={!c.widgetReady} />
            </div>
          </>)}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
