"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DaumPostcodeEmbed from "react-daum-postcode";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import { ProductInput } from "@/types";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { formatMoney, formatPhone, parseMoney, parsePhone } from "@/lib/format";
import type { BusinessHours } from "@/lib/businessHours";
import { DEFAULT_TYPE_KEY } from "@/lib/productTypes";
import { ONBOARDING_QUESTIONS, ONBOARDING_SECTIONS, type OnboardingQuestionId } from "@/lib/onboarding";

// 시작 설정 — 손님 첫 화면 대화처럼, 질문 하나에 답 하나.
// 입력 중(…) → 질문 → 답할 칸 순서로 나오고, 답하면 내 말풍선이 붙고 다음 질문으로.
// 메뉴판 열기(매장 정보 → 영업시간 → 첫 상품 → 링크) 뒤에 판매 신청과 판매 준비까지 같은 대화로 이어서,
// 끝까지 하면 운영자 승인만 남는다 ('승인되면 바로 시작'을 고르면 승인 순간 판매가 켜진다).
// 답할 때마다 바로 저장하고, 보던 질문은 DB(company_settings.onboarding_step)에 남겨 어디서든 이어서 한다.

type ApplyStatus = "pending" | "approved" | "rejected" | null;
interface OptionValue { enabled: boolean; price: number }

export interface OnboardingInitial {
  step: string | null;
  phone: string | null;
  ownerPhone: string | null;
  address: string | null;
  parking: string | null;
  businessHours: BusinessHours | null;
  productCount: number;
  consultApplyStatus: ApplyStatus;
  consultRejectReason: string | null;
  consultEnabled: boolean;
  businessNumber: string | null;
  businessVerified: boolean;
  businessDocUploaded: boolean;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankDocUploaded: boolean;
  mailOrderNumber: string | null;
  minLeadTimes: Record<string, number> | null;
  deliveryEnabled: boolean;
  deliveryFees: Record<string, number | null> | null;
  messageCard: OptionValue;
  shoppingBag: OptionValue;
  preservative: OptionValue;
  consultNotice: string | null;
}

interface Props {
  slug: string;
  companyId: string;
  companyName: string;
  logoImage: string | null;
  initial: OnboardingInitial;
}

type Qid = OnboardingQuestionId;

const APPLY_IDS: Qid[] = ["contact", "bizno", "bizdoc", "bank", "bankdoc", "mailorder", "submit"];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, "0")).flatMap((hh) => [`${hh}:00`, `${hh}:30`]);
const PARKING_OPTIONS = [
  ["주차 가능", "주차할 수 있어요"],
  ["잠시 주차 가능", "잠깐은 세울 수 있어요"],
  ["주차 불가", "주차는 안 돼요"],
] as const;
const SHARE_CHANNELS = [
  ["instagram", "인스타그램"],
  ["kakao", "카카오톡"],
  ["blog", "블로그"],
  ["naver", "네이버"],
] as const;
const LEAD_OPTIONS = [
  [1, "1시간이면 돼요"],
  [2, "2시간"],
  [3, "3시간"],
  [4, "4시간"],
  [24, "하루 전 주문만 받을게요"],
] as const;
const FEE_TIERS = [
  ["0-1", "1km 이내"],
  ["1-3", "1 ~ 3km"],
  ["3-5", "3 ~ 5km"],
  ["5-10", "5 ~ 10km"],
  ["10-15", "10 ~ 15km"],
  ["15-20", "15 ~ 20km"],
] as const;
const OPTION_ITEMS = [
  ["messageCard", "메시지 카드", "message_card"],
  ["shoppingBag", "쇼핑백", "shopping_bag"],
  ["preservative", "생화 수명연장제", "preservative"],
] as const;
const BANKS = ["국민은행", "신한은행", "우리은행", "하나은행", "농협은행", "기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "새마을금고", "우체국", "SC제일은행", "수협은행", "신협", "부산은행", "대구은행", "경남은행", "광주은행", "전북은행", "제주은행"];
const DEFAULT_DAY = { closed: false, open: "09:00", close: "18:00" };
const SKIPPED = "나중에 할게요";

// 입력 중 시간 — 질문이 많아 짧게
const TYPING_MS = 600;
const INPUT_DELAY_MS = 200;

const formatBizNo = (v: string) => {
  const raw = v.replace(/\D/g, "").slice(0, 10);
  return raw.length <= 3 ? raw : raw.length <= 5 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
};
const won = (n: number) => (n > 0 ? `${n.toLocaleString("ko-KR")}원` : "무료");

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const options = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [value, ...TIME_OPTIONS];
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 border border-gray-300 rounded-xl px-3 py-3 text-base text-gray-800 bg-white focus:outline-none focus:border-gold-400 cursor-pointer"
    >
      {options.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

// Flo.Aide 프로필 사진 (public/logo_small.png)
const Avatar = () => (
  <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
    <Image src="/logo_small.png" alt="Flo.Aide" fill sizes="32px" className="object-cover" />
  </div>
);

/** Flo.Aide 말풍선 — 같은 사람이 이어 말하면 아바타 자리를 비운다 */
function Bot({ children, first = true, animate }: { children: React.ReactNode; first?: boolean; animate?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 ${animate ? "onb-in" : ""}`}>
      {first ? <Avatar /> : <div className="w-8 shrink-0" />}
      <p className="max-w-[80%] break-keep whitespace-pre-line bg-white rounded-2xl rounded-tl-md px-4 py-2.5 text-[15px] text-gray-800 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

/** 내 답 말풍선 — 누르면 그 질문으로 돌아가 고친다 */
function Me({ children, onEdit }: { children: string; onEdit?: () => void }) {
  return (
    <div className="flex justify-end onb-in">
      <button
        type="button"
        onClick={onEdit}
        disabled={!onEdit}
        aria-label={onEdit ? `${children} — 눌러서 고치기` : undefined}
        className="max-w-[80%] break-keep px-4 py-2.5 rounded-2xl rounded-br-md bg-gold-500 text-white text-[15px] text-left leading-relaxed enabled:hover:bg-gold-600 transition-colors"
      >
        {children}
      </button>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-start gap-2.5 onb-in">
      <Avatar />
      <span className="inline-flex items-center gap-1 px-4 py-4 rounded-2xl rounded-tl-md bg-white" aria-label="입력 중">
        {[0, 0.2, 0.4].map((d) => (
          <span key={d} className="onb-dot w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${d}s` }} />
        ))}
      </span>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {ok ? (
        <svg className="w-4 h-4 mt-0.5 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="w-4 h-4 mt-0.5 rounded-full border-2 border-red-300 shrink-0" />
      )}
      <span className={`break-keep ${ok ? "text-gray-700" : "text-red-500"}`}>{children}</span>
    </div>
  );
}

export default function OnboardingClient({ slug, companyId, companyName, logoImage, initial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const bizDocRef = useRef<HTMLInputElement>(null);
  const bankDocRef = useRef<HTMLInputElement>(null);

  // ── 답할 값 ──
  const [status, setStatus] = useState<ApplyStatus>(initial.consultApplyStatus);
  const [consultEnabled, setConsultEnabled] = useState(initial.consultEnabled);
  // 판매 신청을 했으면(검토 중·승인) 전화번호·주소는 심사에 쓰인 정보라 묻지 않는다 (판매 신청 탭에서 바꾼다)
  const infoLocked = initial.consultApplyStatus === "pending" || initial.consultApplyStatus === "approved";

  const [phone, setPhone] = useState(formatPhone(initial.phone ?? ""));
  const [address, setAddress] = useState(initial.address ?? "");
  const [addressDetail, setAddressDetail] = useState("");
  const [showPostcode, setShowPostcode] = useState(false);
  const [addressPicked, setAddressPicked] = useState(false);

  // 영업시간 — 모든 요일 같은 시간 + 쉬는 요일 (요일마다 다른 시간은 영업 설정에서)
  const baseHours: BusinessHours = initial.businessHours && Object.keys(initial.businessHours).length > 0
    ? initial.businessHours
    : Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { ...DEFAULT_DAY, closed: i === 0 }]));
  const openDays = DAY_ORDER.filter((i) => !(baseHours[String(i)] ?? DEFAULT_DAY).closed);
  const firstOpen = baseHours[String(openDays[0] ?? 1)] ?? DEFAULT_DAY;
  // 이미 요일마다 시간이 다르게 저장돼 있으면, 시간을 건드리지 않는 한 그대로 둔다
  const mixedHours = openDays.some((i) => {
    const d = baseHours[String(i)] ?? DEFAULT_DAY;
    return d.open !== firstOpen.open || d.close !== firstOpen.close;
  });
  const [openTime, setOpenTime] = useState(firstOpen.open);
  const [closeTime, setCloseTime] = useState(firstOpen.close);
  const [timeTouched, setTimeTouched] = useState(false);
  const [closedDays, setClosedDays] = useState<Set<number>>(
    new Set(DAY_ORDER.filter((i) => (baseHours[String(i)] ?? DEFAULT_DAY).closed))
  );

  const [productCount, setProductCount] = useState(initial.productCount);
  const [productFormOpen, setProductFormOpen] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const menuUrl = `${origin}/${slug}`;

  // 판매 신청
  const [bizNo, setBizNo] = useState(formatBizNo(initial.businessNumber ?? ""));
  const [bizVerified, setBizVerified] = useState(initial.businessVerified);
  const [bizDoc, setBizDoc] = useState(initial.businessDocUploaded);
  const [bankName, setBankName] = useState(initial.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(initial.bankAccount ?? "");
  const [bankHolder, setBankHolder] = useState(initial.bankHolder ?? "");
  const [bankDoc, setBankDoc] = useState(initial.bankDocUploaded);
  const [mailOrder, setMailOrder] = useState(initial.mailOrderNumber ?? "");
  const [uploading, setUploading] = useState(false);

  // 판매 준비
  const [deliveryOn, setDeliveryOn] = useState(initial.deliveryEnabled);
  const [fees, setFees] = useState<Record<string, string>>(() =>
    Object.fromEntries(FEE_TIERS.map(([k]) => {
      const v = initial.deliveryFees?.[k];
      return [k, v != null ? formatMoney(String(v)) : ""];
    }))
  );
  const [options, setOptions] = useState({
    messageCard: { enabled: initial.messageCard.enabled, price: initial.messageCard.price ? formatMoney(String(initial.messageCard.price)) : "" },
    shoppingBag: { enabled: initial.shoppingBag.enabled, price: initial.shoppingBag.price ? formatMoney(String(initial.shoppingBag.price)) : "" },
    preservative: { enabled: initial.preservative.enabled, price: initial.preservative.price ? formatMoney(String(initial.preservative.price)) : "" },
  });
  const [notice, setNotice] = useState(initial.consultNotice ?? "");
  // 마지막에 고른 것 — 끝인사 문구에 쓴다
  const [autoStart, setAutoStart] = useState<boolean | null>(null);

  // ── 질문 순서 ──
  type Ctx = { status: ApplyStatus; deliveryOn: boolean; consultEnabled: boolean };
  const skipped = (id: Qid, c: Ctx): boolean => {
    if ((id === "phone" || id === "address") && infoLocked) return true;
    // 신청했거나 승인된 매장은 신청서를 다시 묻지 않는다
    if (APPLY_IDS.includes(id) && (c.status === "pending" || c.status === "approved")) return true;
    // 매장 연락처는 앞에서 넣었으면 다시 묻지 않는다 (판매에는 꼭 필요)
    if (id === "contact") return !!(parsePhone(phone).length >= 9 && address);
    if (id === "fees") return !c.deliveryOn;
    if (id === "golive") return c.status === "approved" && c.consultEnabled;
    return false;
  };
  const ctxNow: Ctx = { status, deliveryOn, consultEnabled };
  const indexOf = (id: Qid) => ONBOARDING_QUESTIONS.findIndex((x) => x.id === id);
  const nextIndex = (from: number, c: Ctx) => {
    for (let i = from + 1; i < ONBOARDING_QUESTIONS.length; i++) if (!skipped(ONBOARDING_QUESTIONS[i].id, c)) return i;
    return ONBOARDING_QUESTIONS.length - 1;
  };
  const [startAt] = useState(() => {
    const at = ONBOARDING_QUESTIONS.findIndex((x) => x.id === initial.step || x.section === initial.step);
    if (at < 0) return nextIndex(-1, ctxNow);
    return skipped(ONBOARDING_QUESTIONS[at].id, ctxNow) ? nextIndex(at, ctxNow) : at;
  });

  const [qi, setQi] = useState(startAt);
  // 이번에 답한 질문 — 지나간 대화로 보여준다 (다시 들어오면 이어서 묻기만 하고 지난 대화는 보이지 않는다)
  const [answered, setAnswered] = useState<{ id: Qid; text: string }[]>([]);
  const [typing, setTyping] = useState(true);
  // 0: 아직 · 1: 앞말 · 2: 질문 · 3: 답할 칸
  const [shown, setShown] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = ONBOARDING_QUESTIONS[qi];

  // ── 대화 문구 ──
  /** 질문 앞에 붙는 한마디 — i: 이번 대화에서 몇 번째 질문인지, prev: 바로 앞에 답한 질문 */
  const leadOf = (id: Qid, i: number, prev: Qid | undefined): string | null => {
    if (i === 0) {
      if (startAt === 0) return "안녕하세요! 몇 가지만 답하시면 메뉴판 준비가 끝나요. 모르는 건 건너뛰어도 돼요.";
      if (id === "sales") return "안녕하세요! 판매 준비를 같이 해 볼게요.";
      return "다시 오셨네요! 하던 데서 이어서 할게요.";
    }
    if (prev === "sales" && APPLY_IDS.includes(id)) return "좋아요! 신청서를 같이 채워 볼게요. 5분이면 돼요.";
    if (prev === "submit") return "신청 완료! 검토를 기다리는 동안 판매 준비를 마쳐 둘게요. 승인되면 바로 팔 수 있게요.";
    if (prev === "sales" && id === "lead") return "좋아요! 판매 준비를 해 볼게요.";
    if (id === "open") return "좋아요! 이제 영업시간이에요.";
    if (id === "product") return "거의 다 왔어요.";
    if (id === "ready") return productCount > 0 ? "메뉴판이 열렸어요!" : "메뉴판 주소가 준비됐어요. 상품을 올리면 손님에게 보여요.";
    if (id === "sales" && status === "rejected")
      return `지난 판매 신청이 반려됐어요.${initial.consultRejectReason ? `\n사유: ${initial.consultRejectReason}` : ""}`;
    if (id === "golive") return "준비 끝!";
    return null;
  };
  const questionOf = (id: Qid): string => {
    switch (id) {
      case "phone": return "매장 전화번호를 알려주세요.";
      case "address": return "매장 주소는 어디예요?";
      case "parking":
        return infoLocked
          ? "전화번호·주소는 판매 신청 때 넣으신 걸 그대로 써요. 손님이 차로 오면 주차할 수 있나요?"
          : "손님이 차로 오면 주차할 수 있나요?";
      case "open": return "몇 시에 열고 몇 시에 닫으세요?";
      case "closed": return "쉬는 요일이 있으면 골라 주세요.";
      case "product": return productCount > 0 ? `메뉴판에 상품이 ${productCount}개 있어요. 더 올릴까요?` : "메뉴판에 올릴 첫 상품을 등록해 볼까요?";
      case "ready": return "어디에 올리실 거예요? 누르면 링크가 복사돼요.";
      case "sales":
        if (status === "pending") return "판매 신청은 검토 중이에요. 기다리는 동안 판매 준비를 마쳐 둘까요? 승인되면 바로 팔 수 있어요.";
        if (status === "approved") return consultEnabled ? "지금 판매 중이에요. 판매 준비 내용을 대화로 다시 볼까요?" : "판매 신청이 승인됐어요! 판매 준비를 마쳐 볼까요?";
        if (status === "rejected") return "고쳐서 다시 신청해 볼까요?";
        return "손님이 메뉴판에서 바로 예약·결제하게 하시겠어요?";
      case "contact": return "판매하려면 매장 전화번호와 주소가 꼭 있어야 해요. 알려주세요.";
      case "bizno": return "사업자등록번호를 알려주세요. 국세청에서 바로 확인해요.";
      case "bizdoc": return "사업자등록증 사진을 보내 주세요. 찍은 사진이나 PDF 모두 돼요.";
      case "bank": return "판매 대금을 받을 계좌를 알려주세요.";
      case "bankdoc": return "그 계좌의 통장사본 사진도 보내 주세요.";
      case "mailorder": return "통신판매업 신고번호가 있나요?\n없으면 나중에 넣어도 돼요. 다만 신고 없이는 50개까지만 팔 수 있어요.";
      case "submit": return "이대로 신청할게요. 확인해 주세요.";
      case "lead": return "주문을 받고 꽃을 준비하는 데 최소 몇 시간이 필요해요?";
      case "delivery": return "배송도 하세요?";
      case "fees": return "거리별 배송비를 알려주세요. 비워 둔 거리는 배송을 받지 않아요.";
      case "options": return "메시지 카드·쇼핑백·생화 수명연장제를 따로 파시나요?";
      case "notice": return "주문하는 손님께 꼭 알릴 말이 있나요? 결제 직전에 보여요.";
      case "golive":
        return status === "approved"
          ? "지금 판매를 켤까요? 켜면 손님이 메뉴판에서 바로 주문할 수 있어요."
          : "승인되면 바로 판매를 시작할까요?";
      case "done":
        if (status === "approved" && consultEnabled) return "다 됐어요! 이제 손님이 메뉴판에서 바로 주문할 수 있어요.";
        if (status === "pending" && autoStart) return "다 됐어요! 승인되면 판매가 바로 시작돼요. 검토 결과는 대시보드에서 볼 수 있어요.";
        if (status === "pending") return "다 됐어요! 승인되면 설정 > 판매 설정에서 판매를 켜 주세요.";
        return "다 됐어요! 판매는 설정 > 판매 설정에서 언제든 켤 수 있어요.";
    }
  };
  const prevId = answered[answered.length - 1]?.id;
  const currentLead = leadOf(q.id, answered.length, prevId);

  // ── 입력 중 → (앞말) → 질문 → 답할 칸 ──
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyping(false);
      setShown(3);
      return;
    }
    setShown(0);
    setTyping(true);
    let t = 0;
    const at = (ms: number, fn: () => void) => { t += ms; timers.current.push(setTimeout(fn, t)); };
    if (currentLead) at(TYPING_MS, () => setShown(1));
    at(TYPING_MS, () => { setTyping(false); setShown(2); });
    at(INPUT_DELAY_MS, () => setShown(3));
    return () => timers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, answered.length]);

  // 새 말이 나올 때마다 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [shown, typing, answered.length, showPostcode, productFormOpen, error]);

  // 진행 저장 — 실패해도 진행은 막지 않는다
  const saveProgress = (patch: Record<string, unknown>) =>
    supabase.from("company_settings").update(patch).eq("company_id", companyId).then(() => {});

  /** 이 질문에 답하고 다음 질문으로 — ctx: 이 답으로 바뀌는 값(배송 여부·신청 상태)을 순서 계산에 바로 쓴다 */
  const answer = (text: string, ctx: Partial<Ctx> = {}) => {
    setError(null);
    setShowPostcode(false);
    setProductFormOpen(false);
    setAnswered((prev) => [...prev, { id: q.id, text }]);
    const ni = nextIndex(qi, { ...ctxNow, ...ctx });
    setQi(ni);
    saveProgress({ onboarding_step: ONBOARDING_QUESTIONS[ni].id });
  };

  /** 지나간 답을 눌러 그 질문으로 돌아간다 — 그 뒤 대화는 다시 묻는다 (입력해 둔 값은 남아 있다) */
  const editFrom = (i: number) => {
    const id = answered[i].id;
    setError(null);
    setShowPostcode(false);
    setProductFormOpen(false);
    setAnswered((prev) => prev.slice(0, i));
    setQi(indexOf(id));
    saveProgress({ onboarding_step: id });
  };
  /** 신청 확인 화면에서 빠진 항목으로 돌아가기 */
  const jumpTo = (id: Qid) => {
    const i = answered.findIndex((a) => a.id === id);
    if (i >= 0) { editFrom(i); return; }
    setError(null);
    setQi(indexOf(id));
    saveProgress({ onboarding_step: id });
  };
  // 신청한 뒤에는 신청서 답을 고칠 수 없다 (판매 신청 탭에서)
  const canEdit = (id: Qid) => !(APPLY_IDS.includes(id) && (status === "pending" || status === "approved")) && id !== "sales";

  const finish = async (tab?: string) => {
    setSaving(true);
    await saveProgress({ onboarding_done_at: new Date().toISOString(), onboarding_step: null });
    router.push(tab ? `/${slug}/admin/dashboard?tab=${tab}` : `/${slug}/admin/dashboard`);
  };

  /** 저장하고 답하기 — 저장에 실패하면 이 질문에 머문다 */
  const saveThen = async (
    run: () => PromiseLike<{ error: { message: string } | null }>,
    text: string,
    ctx: Partial<Ctx> = {},
  ) => {
    setSaving(true);
    setError(null);
    const { error: err } = await run();
    setSaving(false);
    if (err) { setError("저장하지 못했어요: " + err.message); return false; }
    notifyMenuChanged();
    answer(text, ctx);
    return true;
  };
  const updateSettings = (patch: Record<string, unknown>) => () =>
    supabase.from("company_settings").update(patch).eq("company_id", companyId);

  // ── 매장 정보 ──
  const savePhone = (value: string) => {
    const digits = parsePhone(value);
    if (digits.length < 9) { setError("전화번호를 끝까지 입력해 주세요."); return; }
    setPhone(formatPhone(digits));
    saveThen(() => supabase.from("companies").update({ phone: digits }).eq("id", companyId), formatPhone(digits));
  };

  const fullAddress = () => (addressDetail.trim() ? `${address} ${addressDetail.trim()}` : address);
  const saveAddress = async () => {
    const full = fullAddress();
    if (await saveThen(updateSettings({ address: full }), full)) {
      setAddress(full);
      setAddressDetail("");
      setAddressPicked(false);
    }
  };

  /** 판매에 필요한 연락처 — 전화번호·주소를 한 번에 */
  const saveContact = async () => {
    const digits = parsePhone(phone);
    if (digits.length < 9) { setError("전화번호를 끝까지 입력해 주세요."); return; }
    if (!address) { setError("주소를 찾아 주세요."); return; }
    const full = fullAddress();
    setSaving(true);
    setError(null);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("companies").update({ phone: digits }).eq("id", companyId),
      supabase.from("company_settings").update({ address: full }).eq("company_id", companyId),
    ]);
    setSaving(false);
    if (e1 || e2) { setError("저장하지 못했어요: " + (e1 ?? e2)!.message); return; }
    notifyMenuChanged();
    setAddress(full);
    setAddressDetail("");
    setAddressPicked(false);
    answer(`${formatPhone(digits)} · ${full}`);
  };

  const saveParking = (value: string, label: string) => saveThen(updateSettings({ parking: value }), label);

  // ── 영업시간 ──
  const hoursPatch = (): BusinessHours =>
    Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => {
        const prev = baseHours[String(i)] ?? DEFAULT_DAY;
        const keepPrev = mixedHours && !timeTouched && !prev.closed;
        return [String(i), { closed: closedDays.has(i), open: keepPrev ? prev.open : openTime, close: keepPrev ? prev.close : closeTime }];
      })
    );
  const saveOpenTime = () => {
    if (openTime >= closeTime) { setError("닫는 시간이 여는 시간보다 늦어야 해요."); return; }
    saveThen(updateSettings({ business_hours: hoursPatch() }), mixedHours && !timeTouched ? "지금 시간 그대로 할게요" : `${openTime} ~ ${closeTime}`);
  };
  const closedLabel = () => {
    const days = DAY_ORDER.filter((i) => closedDays.has(i)).map((i) => WEEKDAYS[i]);
    return days.length ? `${days.join("·")}요일은 쉬어요` : "쉬는 날 없어요";
  };
  const saveClosedDays = () => {
    if (closedDays.size === 7) { setError("여는 요일을 하나 이상 남겨 주세요."); return; }
    saveThen(updateSettings({ business_hours: hoursPatch() }), closedLabel());
  };

  // ── 첫 상품 · 링크 ──
  const saveProduct = async (data: ProductInput) => {
    setError(null);
    const { error: err } = await supabase.from("products").insert({ ...data, company_id: companyId });
    if (err) { setError("상품을 저장하지 못했어요: " + err.message); return; }
    notifyMenuChanged();
    setProductCount((c) => c + 1);
    answer(`'${data.name}' 올렸어요`);
  };
  const copyLink = async (source: string) => {
    const url = `${menuUrl}?utm_source=${source}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("아래 주소를 길게 눌러 복사해 주세요", url);
    }
    setCopied(source);
  };

  // ── 판매 신청 ──
  const verifyBiz = async () => {
    // 이미 확인된 번호면 다시 조회하지 않는다
    if (bizVerified) { answer(`${bizNo} · 확인됐어요`); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/verify-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_number: bizNo, company_id: companyId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "확인하지 못했어요. 번호를 다시 봐 주세요."); return; }
      if (!data.isActive) { setBizVerified(false); setError(`조회 결과: ${data.status}. 계속 사업 중인 사업자만 판매할 수 있어요.`); return; }
      setBizVerified(true);
      answer(`${bizNo} · 확인됐어요`);
    } catch {
      setError("확인하지 못했어요. 잠시 후 다시 해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async (kind: "business" | "bank", file: File) => {
    setUploading(true);
    setError(null);
    try {
      let upload: File = file;
      if (file.type.startsWith("image/")) {
        upload = await imageCompression(file, kind === "business"
          ? { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true }
          : { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      }
      const form = new FormData();
      form.append("file", upload, file.name);
      form.append("company_id", companyId);
      const res = await fetch(kind === "business" ? "/api/company/business-doc" : "/api/company/bank-doc", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError("올리지 못했어요: " + (data.error ?? "잠시 후 다시 해 주세요."));
        return;
      }
      if (kind === "business") { setBizDoc(true); answer("사업자등록증 보냈어요"); }
      else { setBankDoc(true); answer("통장사본 보냈어요"); }
    } catch {
      setError("올리지 못했어요. 잠시 후 다시 해 주세요.");
    } finally {
      setUploading(false);
    }
  };

  const saveBank = () => {
    if (!bankName.trim() || !bankAccount.trim() || !bankHolder.trim()) { setError("은행·계좌번호·예금주를 모두 넣어 주세요."); return; }
    saveThen(
      updateSettings({ bank_name: bankName.trim(), bank_account: bankAccount.trim(), bank_holder: bankHolder.trim() }),
      `${bankName.trim()} ${bankAccount.trim()} · ${bankHolder.trim()}`,
    );
  };

  const saveMailOrder = (value: string | null) =>
    saveThen(updateSettings({ mail_order_number: value }), value ? value : "아직 없어요");

  const bankFilled = !!(bankName.trim() && bankAccount.trim() && bankHolder.trim());
  const canSubmit = bizVerified && bizDoc && bankFilled && bankDoc;
  const submitApply = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/company/consult-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "신청하지 못했어요. 잠시 후 다시 해 주세요."); return; }
      setStatus("pending");
      answer("이대로 신청할게요", { status: "pending" });
    } catch {
      setError("신청하지 못했어요. 잠시 후 다시 해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  // ── 판매 준비 ──
  const saveLead = (hours: number, label: string) =>
    saveThen(updateSettings({ min_lead_times: { ...(initial.minLeadTimes ?? {}), [DEFAULT_TYPE_KEY]: hours } }), label);

  const pickupOnly = () => {
    setDeliveryOn(false);
    saveThen(updateSettings({ delivery_enabled: false }), "픽업만 받을게요", { deliveryOn: false });
  };
  const wantDelivery = () => {
    setDeliveryOn(true);
    answer("배송도 할게요", { deliveryOn: true });
  };
  const saveFees = () => {
    if (!fees["0-1"]) { setError("1km 이내 배송비는 꼭 넣어 주세요. 무료면 0을 넣어 주세요."); return; }
    const patch = Object.fromEntries(FEE_TIERS.map(([k]) => [k, fees[k] === "" ? null : parseMoney(fees[k])]));
    const set = FEE_TIERS.filter(([k]) => fees[k] !== "");
    const far = set[set.length - 1]?.[1].replace(/.*~\s*/, "").replace("1km 이내", "1km");
    saveThen(updateSettings({ delivery_enabled: true, delivery_fees: patch }), `${far}까지 배송해요 · 1km 이내 ${won(parseMoney(fees["0-1"]))}`);
  };

  const saveOptions = (none = false) => {
    const o = none
      ? { messageCard: { enabled: false, price: "" }, shoppingBag: { enabled: false, price: "" }, preservative: { enabled: false, price: "" } }
      : options;
    const patch: Record<string, unknown> = {};
    for (const [key, , col] of OPTION_ITEMS) {
      patch[`${col}_enabled`] = o[key].enabled;
      patch[`${col}_price`] = o[key].enabled ? parseMoney(o[key].price) : 0;
    }
    const on = OPTION_ITEMS.filter(([key]) => o[key].enabled).map(([key, label]) => `${label} ${won(parseMoney(o[key].price))}`);
    if (none) setOptions(o);
    saveThen(updateSettings(patch), on.length ? on.join(" · ") : "따로 팔지 않아요");
  };

  const saveNotice = (value: string | null) =>
    saveThen(updateSettings({ consult_notice: value }), value ? `"${value.length > 30 ? value.slice(0, 30) + "…" : value}"` : "없어요");

  const goLive = (on: boolean) => {
    if (status === "approved") {
      if (!on) { answer("나중에 켤게요"); return; }
      setConsultEnabled(true);
      saveThen(updateSettings({ consult_enabled: true }), "켤게요", { consultEnabled: true });
      return;
    }
    setAutoStart(on);
    saveThen(updateSettings({ sales_auto_start: on }), on ? "네, 승인되면 바로 시작해요" : "승인되면 제가 직접 켤게요");
  };

  // ── 스타일 ──
  const sectionIndex = ONBOARDING_SECTIONS.indexOf(q.section);
  const optBtn = "max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md border border-gold-400 bg-white text-gold-600 text-[15px] font-medium text-left hover:bg-gold-500/10 disabled:opacity-50 transition-colors";
  const primaryBtn = "w-full bg-gold-500 text-white py-3.5 rounded-xl text-base font-medium hover:bg-gold-600 disabled:opacity-40 transition-colors";
  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:border-gold-400";
  const card = "bg-white rounded-2xl p-4 space-y-3";
  const busy = saving || uploading;
  const skip = (
    <div className="flex justify-end">
      <button type="button" onClick={() => answer(SKIPPED)} disabled={busy} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 px-2 py-1">
        건너뛰기
      </button>
    </div>
  );
  const options3 = (items: [string, () => void][]) => (
    <div className="flex flex-col items-end gap-2">
      {items.map(([label, fn]) => (
        <button key={label} type="button" onClick={fn} disabled={busy} className={optBtn}>{label}</button>
      ))}
    </div>
  );

  // 주소 찾기 — 매장 주소·판매 연락처 질문이 함께 쓴다
  const addressPicker = (
    <>
      {showPostcode ? (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">주소 검색</span>
            <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm" aria-label="주소 검색 닫기">✕</button>
          </div>
          <DaumPostcodeEmbed
            onComplete={(data) => {
              setAddress(data.roadAddress || data.jibunAddress);
              setAddressDetail("");
              setAddressPicked(true);
              setShowPostcode(false);
            }}
            style={{ height: 420 }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPostcode(true)}
          className={`w-full text-left border border-gray-300 rounded-xl px-4 py-3 text-base bg-white hover:border-gray-400 break-keep ${address ? "text-gray-800" : "text-gray-400"}`}
        >
          {address || "눌러서 주소 찾기"}
        </button>
      )}
      {addressPicked && !showPostcode && (
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="상세주소 (층·호수 등, 없으면 비워 두세요)"
          aria-label="상세주소"
          className={inputCls}
        />
      )}
    </>
  );

  /** 서류 올리기 — 이미 올렸으면 그대로 넘어가기 */
  const docAnswer = (kind: "business" | "bank", done: boolean, inputRef: React.RefObject<HTMLInputElement | null>, label: string) => (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadDoc(kind, f); }}
      />
      {uploading ? (
        <div className="flex justify-end"><span className="px-4 py-3 text-sm text-gray-500">올리는 중…</span></div>
      ) : (
        options3([
          ...(done ? [[`이미 올렸어요 · 그대로 할게요`, () => answer(`${label} 그대로 둘게요`)] as [string, () => void]] : []),
          [done ? "다시 올릴게요" : "사진 고르기", () => inputRef.current?.click()],
        ])
      )}
      {skip}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @keyframes onb-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .onb-in { animation: onb-in .28s ease-out both; }
        @keyframes onb-dot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
        .onb-dot { animation: onb-dot 1.2s infinite; }
        @media (prefers-reduced-motion: reduce) { .onb-in, .onb-dot { animation: none; } }
      `}</style>

      {/* 머리 — 매장 · 진행 막대(묶음 단위) · 나중에 하기 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          {logoImage ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-100 shrink-0">
              <Image src={logoImage} alt="" fill className="object-contain" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-beige-200 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {companyName} {sectionIndex >= ONBOARDING_SECTIONS.indexOf("apply") ? "판매 준비" : "시작 설정"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-gold-500 transition-all duration-300" style={{ width: `${((sectionIndex + 1) / ONBOARDING_SECTIONS.length) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-400 tabular-nums">{sectionIndex + 1}/{ONBOARDING_SECTIONS.length}</span>
            </div>
          </div>
          <button type="button" onClick={() => router.push(`/${slug}/admin/dashboard`)} className="shrink-0 text-xs text-gray-400 hover:text-gray-600">
            나중에 하기
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 pb-10 space-y-2">
        {/* 지나간 대화 */}
        {answered.map((a, i) => {
          const lead = leadOf(a.id, i, answered[i - 1]?.id);
          return (
            <div key={`${a.id}-${i}`} className="space-y-2 pb-2">
              {lead && <Bot>{lead}</Bot>}
              <Bot first={!lead}>{questionOf(a.id)}</Bot>
              <Me onEdit={busy || !canEdit(a.id) ? undefined : () => editFrom(i)}>{a.text}</Me>
            </div>
          );
        })}

        {/* 지금 질문 */}
        {currentLead && shown >= 1 && <Bot animate>{currentLead}</Bot>}
        {shown >= 2 && <Bot animate first={!currentLead}>{questionOf(q.id)}</Bot>}
        {typing && <Typing />}

        {/* 답할 칸 */}
        {shown >= 3 && (
          <div className="onb-in pt-2 space-y-2">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm break-keep">{error}</div>}

            {/* ───── 메뉴판 열기 ───── */}
            {q.id === "phone" && (
              <>
                <div className={card}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    onKeyDown={(e) => { if (e.key === "Enter" && phone) savePhone(phone); }}
                    placeholder="010-1234-5678"
                    aria-label="매장 전화번호"
                    className={inputCls}
                  />
                  <button type="button" onClick={() => savePhone(phone)} disabled={!phone || busy} className={primaryBtn}>
                    {saving ? "저장 중..." : "이 번호로 할게요"}
                  </button>
                </div>
                {initial.ownerPhone && parsePhone(phone) !== initial.ownerPhone &&
                  options3([["매장 전화가 없어요 · 내 휴대폰 번호 쓸게요", () => savePhone(initial.ownerPhone!)]])}
                {skip}
              </>
            )}

            {q.id === "address" && (
              <>
                <div className={card}>
                  {addressPicker}
                  {address && !showPostcode && (
                    <button type="button" onClick={saveAddress} disabled={busy} className={primaryBtn}>
                      {saving ? "저장 중..." : "이 주소로 할게요"}
                    </button>
                  )}
                </div>
                {!showPostcode && skip}
              </>
            )}

            {q.id === "parking" && (
              <>
                {options3(PARKING_OPTIONS.map(([value, label]) => [label, () => saveParking(value, label)]))}
                {skip}
              </>
            )}

            {q.id === "open" && (
              <>
                <div className={card}>
                  <div className="flex items-center gap-2">
                    <TimeSelect label="여는 시간" value={openTime} onChange={(v) => { setOpenTime(v); setTimeTouched(true); }} />
                    <span className="text-gray-300">~</span>
                    <TimeSelect label="닫는 시간" value={closeTime} onChange={(v) => { setCloseTime(v); setTimeTouched(true); }} />
                  </div>
                  {mixedHours && !timeTouched && (
                    <p className="text-xs text-gray-400">요일마다 다른 시간이 저장돼 있어요. 시간을 바꾸지 않으면 그대로 둬요.</p>
                  )}
                  <button type="button" onClick={saveOpenTime} disabled={busy} className={primaryBtn}>
                    {saving ? "저장 중..." : "이 시간으로 할게요"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 px-1">요일마다 다른 시간은 나중에 영업 설정에서 바꿀 수 있어요.</p>
                {skip}
              </>
            )}

            {q.id === "closed" && (
              <>
                <div className={card}>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_ORDER.map((i) => {
                      const off = closedDays.has(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={off}
                          aria-label={`${WEEKDAYS[i]}요일 ${off ? "쉬는 날" : "여는 날"}`}
                          onClick={() => setClosedDays((prev) => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s; })}
                          className={`aspect-square rounded-xl border text-sm transition-colors ${off ? "border-gray-700 bg-gray-700 text-white font-medium" : "border-gray-200 text-gray-700 bg-white hover:border-gray-400"}`}
                        >
                          {WEEKDAYS[i]}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={saveClosedDays} disabled={busy} className={primaryBtn}>
                    {saving ? "저장 중..." : closedLabel()}
                  </button>
                </div>
                <p className="text-xs text-gray-400 px-1">임시 휴무·특정 날짜 휴무는 영업 설정에서 따로 정할 수 있어요.</p>
                {skip}
              </>
            )}

            {q.id === "product" && (
              productFormOpen ? (
                <>
                  <p className="text-xs text-gray-400 px-1">사진·이름·가격만 넣어도 충분해요. 나머지는 나중에 고칠 수 있어요.</p>
                  <div className="bg-gray-50 rounded-2xl overflow-hidden">
                    <ProductForm onSubmit={saveProduct} onCancel={() => setProductFormOpen(false)} companyId={companyId} />
                  </div>
                </>
              ) : (
                options3([
                  [productCount > 0 ? "하나 더 올릴게요" : "올려 볼게요", () => setProductFormOpen(true)],
                  [productCount > 0 ? "지금은 이대로 둘게요" : "나중에 할게요", () => answer(productCount > 0 ? "지금은 이대로 둘게요" : SKIPPED)],
                ])
              )
            )}

            {q.id === "ready" && (
              <>
                <div className={card}>
                  <div className="rounded-xl bg-beige-50 border border-beige-200 px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">내 메뉴판 주소</p>
                    <p className="text-sm text-gray-800 font-mono break-all">{menuUrl}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SHARE_CHANNELS.map(([source, label]) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => copyLink(source)}
                        className={`py-3 rounded-xl border text-sm transition-colors ${copied === source ? "border-gold-500 bg-gold-500/10 text-gold-600 font-medium" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}
                      >
                        {copied === source ? "복사됨 ✓" : label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">어디서 손님이 왔는지 통계에 따로 잡혀요.</p>
                  <a
                    href={`/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-3 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-400 transition-colors"
                  >
                    손님 화면으로 내 메뉴판 보기 ↗
                  </a>
                </div>
                {options3([[copied ? "복사했어요, 다음으로" : "다음으로", () => answer(copied ? "링크 복사했어요" : "확인했어요")]])}
              </>
            )}

            {/* ───── 판매 신청 ───── */}
            {q.id === "sales" && (
              status === "pending" || status === "approved" ? (
                options3([
                  ["좋아요, 할게요", () => answer("좋아요, 할게요")],
                  ["나중에 할게요", () => finish()],
                ])
              ) : (
                <>
                  <div className={card}>
                    <p className="text-sm text-gray-600 leading-relaxed break-keep">
                      판매는 사업자 확인 심사가 필요해요. 신청서는 여기서 바로 채울 수 있고, 기다리는 동안 픽업·배송도 미리 정해 둘 수 있어요.
                    </p>
                    <div className="rounded-xl bg-beige-50 border border-beige-200 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500">곁에 두면 빨라요</p>
                      {["사업자등록번호", "사업자등록증 사진", "통장사본 사진 · 정산받을 계좌"].map((t) => (
                        <Check key={t} ok>{t}</Check>
                      ))}
                    </div>
                  </div>
                  {options3([
                    [status === "rejected" ? "다시 신청할게요" : "지금 신청할게요", () => answer(status === "rejected" ? "다시 신청할게요" : "지금 신청할게요")],
                    ["나중에 할게요 · 메뉴판만 쓸게요", () => finish()],
                  ])}
                </>
              )
            )}

            {q.id === "contact" && (
              <div className={card}>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="매장 전화번호 (010-1234-5678)"
                  aria-label="매장 전화번호"
                  className={inputCls}
                />
                {initial.ownerPhone && !phone && (
                  <button type="button" onClick={() => setPhone(formatPhone(initial.ownerPhone!))} className="text-xs text-gold-600 underline underline-offset-2">
                    매장 전화가 없어요 · 내 휴대폰 번호 쓰기
                  </button>
                )}
                {addressPicker}
                {!showPostcode && (
                  <button type="button" onClick={saveContact} disabled={busy || !phone || !address} className={primaryBtn}>
                    {saving ? "저장 중..." : "이대로 할게요"}
                  </button>
                )}
              </div>
            )}

            {q.id === "bizno" && (
              <>
                <div className={card}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bizNo}
                    onChange={(e) => { setBizNo(formatBizNo(e.target.value)); setBizVerified(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && bizNo.replace(/\D/g, "").length === 10) verifyBiz(); }}
                    placeholder="000-00-00000"
                    aria-label="사업자등록번호"
                    className={inputCls}
                  />
                  <button type="button" onClick={verifyBiz} disabled={busy || bizNo.replace(/\D/g, "").length !== 10} className={primaryBtn}>
                    {saving ? "확인 중..." : bizVerified ? "확인된 번호예요 · 다음으로" : "확인할게요"}
                  </button>
                </div>
                {skip}
              </>
            )}

            {q.id === "bizdoc" && docAnswer("business", bizDoc, bizDocRef, "사업자등록증")}

            {q.id === "bank" && (
              <>
                <div className={card}>
                  <input list="onb-banks" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="은행 (예: 국민은행)" aria-label="은행" className={inputCls} />
                  <datalist id="onb-banks">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
                  <input inputMode="numeric" value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/[^\d-]/g, ""))} placeholder="계좌번호" aria-label="계좌번호" className={inputCls} />
                  <input value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="예금주" aria-label="예금주" className={inputCls} />
                  <p className="text-xs text-gray-400 break-keep">계좌번호를 잘못 적어서 생기는 불이익은 책임지지 않아요. 한 번 더 확인해 주세요.</p>
                  <button type="button" onClick={saveBank} disabled={busy || !bankFilled} className={primaryBtn}>
                    {saving ? "저장 중..." : "이 계좌로 할게요"}
                  </button>
                </div>
                {skip}
              </>
            )}

            {q.id === "bankdoc" && docAnswer("bank", bankDoc, bankDocRef, "통장사본")}

            {q.id === "mailorder" && (
              <>
                <div className={card}>
                  <input value={mailOrder} onChange={(e) => setMailOrder(e.target.value)} placeholder="예: 제2024-서울강남-0000호" aria-label="통신판매업 신고번호" className={inputCls} />
                  <button type="button" onClick={() => saveMailOrder(mailOrder.trim())} disabled={busy || !mailOrder.trim()} className={primaryBtn}>
                    {saving ? "저장 중..." : "이 번호로 할게요"}
                  </button>
                </div>
                {!initial.mailOrderNumber && options3([["아직 없어요 · 나중에 넣을게요", () => saveMailOrder(null)]])}
              </>
            )}

            {q.id === "submit" && (
              <>
                <div className={card}>
                  <Check ok={bizVerified}>사업자등록번호 {bizVerified ? `${bizNo} 확인됨` : "확인이 필요해요"}</Check>
                  <Check ok={bizDoc}>사업자등록증 {bizDoc ? "보냄" : "사진이 필요해요"}</Check>
                  <Check ok={bankFilled}>{bankFilled ? `${bankName} ${bankAccount} · ${bankHolder}` : "정산 계좌가 필요해요"}</Check>
                  <Check ok={bankDoc}>통장사본 {bankDoc ? "보냄" : "사진이 필요해요"}</Check>
                  <p className="text-xs text-gray-400">통신판매업 신고번호 · {mailOrder.trim() || "나중에"}</p>
                  <button type="button" onClick={submitApply} disabled={busy || !canSubmit} className={primaryBtn}>
                    {saving ? "신청 중..." : "이대로 신청할게요"}
                  </button>
                </div>
                {!canSubmit && options3([
                  ...(!bizVerified ? [["사업자등록번호 넣을게요", () => jumpTo("bizno")] as [string, () => void]] : []),
                  ...(!bizDoc ? [["사업자등록증 보낼게요", () => jumpTo("bizdoc")] as [string, () => void]] : []),
                  ...(!bankFilled ? [["계좌 넣을게요", () => jumpTo("bank")] as [string, () => void]] : []),
                  ...(!bankDoc ? [["통장사본 보낼게요", () => jumpTo("bankdoc")] as [string, () => void]] : []),
                ])}
                <div className="flex justify-end">
                  <button type="button" onClick={() => finish()} disabled={busy} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 px-2 py-1">
                    나중에 신청할게요
                  </button>
                </div>
              </>
            )}

            {/* ───── 판매 준비 ───── */}
            {q.id === "lead" && (
              <>
                {options3(LEAD_OPTIONS.map(([h, label]) => [label, () => saveLead(h, label === "1시간이면 돼요" ? "1시간이면 돼요" : label === "하루 전 주문만 받을게요" ? label : `${label} 필요해요`)]))}
                <p className="text-xs text-gray-400 text-right px-1">상품 유형마다 다르게는 영업 설정에서 정할 수 있어요.</p>
                {skip}
              </>
            )}

            {q.id === "delivery" && (
              <>
                {options3([
                  ["픽업만 받을게요", pickupOnly],
                  ["배송도 할게요", wantDelivery],
                ])}
                {skip}
              </>
            )}

            {q.id === "fees" && (
              <>
                <div className={card}>
                  <div className="divide-y divide-gray-100">
                    {FEE_TIERS.map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-sm text-gray-700">{label}{key === "0-1" && <span className="text-red-400"> *</span>}</span>
                        <span className="flex items-center gap-1.5">
                          <input
                            inputMode="numeric"
                            value={fees[key]}
                            onChange={(e) => setFees((p) => ({ ...p, [key]: formatMoney(e.target.value) }))}
                            placeholder={key === "0-1" ? "0" : "안 함"}
                            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-base text-right bg-white focus:outline-none focus:border-gold-400 placeholder:text-gray-300"
                          />
                          <span className="text-sm text-gray-400">원</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={saveFees} disabled={busy || !fees["0-1"]} className={primaryBtn}>
                    {saving ? "저장 중..." : "이대로 할게요"}
                  </button>
                </div>
                {skip}
              </>
            )}

            {q.id === "options" && (
              <>
                <div className={card}>
                  {OPTION_ITEMS.map(([key, label]) => {
                    const o = options[key];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={o.enabled}
                          aria-label={`${label} 팔기`}
                          onClick={() => setOptions((p) => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }))}
                          className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${o.enabled ? "bg-gold-500" : "bg-gray-200"}`}
                        >
                          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${o.enabled ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                        <span className={`flex-1 text-sm ${o.enabled ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
                        {o.enabled && (
                          <span className="flex items-center gap-1.5">
                            <input
                              inputMode="numeric"
                              value={o.price}
                              onChange={(e) => setOptions((p) => ({ ...p, [key]: { ...p[key], price: formatMoney(e.target.value) } }))}
                              placeholder="0"
                              aria-label={`${label} 가격`}
                              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-base text-right bg-white focus:outline-none focus:border-gold-400"
                            />
                            <span className="text-sm text-gray-400">원</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-400">가격을 비우면 무료로 드려요.</p>
                  <button type="button" onClick={() => saveOptions()} disabled={busy} className={primaryBtn}>
                    {saving ? "저장 중..." : "이대로 할게요"}
                  </button>
                </div>
                {options3([["따로 팔지 않아요", () => saveOptions(true)]])}
              </>
            )}

            {q.id === "notice" && (
              <>
                <div className={card}>
                  <textarea
                    value={notice}
                    onChange={(e) => setNotice(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder={"예) 입금이 확인되면 예약이 확정돼요.\n당일 취소는 어려우니 신중히 주문해 주세요."}
                    aria-label="주문 안내 문구"
                    className={`${inputCls} resize-none`}
                  />
                  <button type="button" onClick={() => saveNotice(notice.trim())} disabled={busy || !notice.trim()} className={primaryBtn}>
                    {saving ? "저장 중..." : "이대로 할게요"}
                  </button>
                </div>
                {options3([["없어요", () => saveNotice(null)]])}
              </>
            )}

            {q.id === "golive" && (
              status === "approved"
                ? options3([["켤게요", () => goLive(true)], ["나중에 켤게요", () => goLive(false)]])
                : options3([["네, 승인되면 바로 시작해요", () => goLive(true)], ["승인되면 제가 직접 켤게요", () => goLive(false)]])
            )}

            {q.id === "done" && options3([["대시보드로 갈게요", () => finish()]])}
          </div>
        )}

        {/* 아래로 맞추는 기준점 — PC는 화면 아래 1/3을 비워 마지막 대화가 화면 2/3 높이에 오게 (맨 밑은 보기 힘들다) */}
        <div ref={bottomRef} aria-hidden className="md:h-[33vh]" />
      </main>
    </div>
  );
}
