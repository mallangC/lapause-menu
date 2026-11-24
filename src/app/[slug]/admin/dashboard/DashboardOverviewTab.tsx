"use client";

import { useState, useEffect, useCallback } from "react";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import { sortByOrder } from "@/lib/productTypes";
import PickListModal, { type PickItem } from "@/components/admin/PickListModal";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import type { CompanySettings } from "./companySettings";
import { TodayColorsCard } from "./TodayColors";
import InquiryChecklist from "./InquiryChecklist";
import { ONBOARDING_SECTIONS, onboardingSectionIndex } from "@/lib/onboarding";

interface Props {
  companyId: string;
  slug: string;
  plan: "monthly" | "annual" | "none" | "free";
  onNavigate: (tab: string, statusFilter?: string) => void;
  settings: CompanySettings;
  /** 예약이 바뀔 때마다 증가 — 바뀌었을 때만 예약 집계를 다시 불러온다 */
  refreshKey: number;
  /** 오늘 꽃 색상 저장 → 공유 설정 갱신 */
  onSettingsSaved: (patch: CompanySettings) => void;
  /** 링크 만들기 — 공유할 상품·메뉴 종류·시즌 고르기에 쓴다 */
  products?: { id: string; name: string; product_type: string; seasons?: string[] | null; instant?: boolean; status?: string | null; image_url?: string | null; price?: number | null }[];
}

interface Settings {
  consult_enabled: boolean;
  consult_apply_status: "pending" | "approved" | "rejected" | null;
  business_verified_at: string | null;
  bank_account_image_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  address: string | null;
  delivery_enabled: boolean;
  message_card_enabled: boolean;
  shopping_bag_enabled: boolean;
  preservative_enabled: boolean;
  mail_order_number: string | null;
  sold_count: number | null;
}

interface ReservationCounts {
  미확인: number;
  준비중: number;
  완료: number;
  취소: number;
  total: number;
}

interface TodayItem {
  id: string;
  orderer_name: string;
  desired_time: string | null;
  status: string;
  delivery_type: string;
}

const consultApplyLabels: Record<string, { label: string; color: string }> = {
  pending:  { label: "검토 중", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  approved: { label: "승인됨", color: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "반려됨", color: "text-red-500 bg-red-50 border-red-200" },
};

function CheckItem({ ok, label, tab, onNavigate }: { ok: boolean; label: string; tab: string; onNavigate: (t: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(tab)}
      className="flex items-center gap-2.5 w-full text-left hover:opacity-70 transition-opacity"
    >
      {ok ? (
        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      <span className={`text-sm ${ok ? "text-gray-500 line-through" : "text-gray-700"}`}>{label}</span>
      {!ok && (
        <svg className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

// 시작 설정 이어하기 — 시작 설정을 끝내지 않은 매장에만 (처음 가입 직후 한 번은 시작 설정이 자동으로 열린다)
function OnboardingResumeCard({ companyId, slug, settings, onSettingsSaved }: { companyId: string; slug: string; settings: CompanySettings; onSettingsSaved: (patch: CompanySettings) => void }) {
  const [hiding, setHiding] = useState(false);
  // 컬럼이 아직 없으면(SQL 실행 전) 띄우지 않는다
  if (!("onboarding_done_at" in settings) || settings.onboarding_done_at) return null;
  const at = onboardingSectionIndex(settings.onboarding_step);
  const started = !!settings.onboarding_step;

  const hide = async () => {
    setHiding(true);
    const patch = { onboarding_done_at: new Date().toISOString() };
    const { error } = await createClient().from("company_settings").update(patch).eq("company_id", companyId);
    setHiding(false);
    if (!error) onSettingsSaved(patch);
  };

  return (
    <div className="bg-gold-500/10 border border-gold-400/40 rounded-2xl py-4 px-4 -mx-4 md:mx-0 md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            시작 설정 <span className="text-gold-600 tabular-nums">{at + 1}/{ONBOARDING_SECTIONS.length}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">몇 가지만 답하면 메뉴판 준비가 끝나요.</p>
        </div>
        <Link
          href={`/${slug}/admin/onboarding`}
          className="shrink-0 px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors"
        >
          {started ? "이어서 하기" : "시작하기"}
        </Link>
      </div>
      <button type="button" onClick={hide} disabled={hiding} className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 disabled:opacity-50">
        다시 보지 않기
      </button>
    </div>
  );
}

export default function DashboardOverviewTab({ companyId, slug, plan, onNavigate, settings: sharedSettings, refreshKey, onSettingsSaved, products = [] }: Props) {
  // 매장 설정·전화번호는 대시보드가 받아둔 공유 값을 사용 (DB 재조회 없음, 다른 탭에서 저장하면 바로 반영)
  const settings = sharedSettings as Settings;
  const companyPhone = (sharedSettings.company_phone as string | null) ?? null;
  const [reservationCounts, setReservationCounts] = useState<ReservationCounts>({ 미확인: 0, 준비중: 0, 완료: 0, 취소: 0, total: 0 });
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  // URL 복사 → 올릴 곳(채널) 선택 창
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [customChannel, setCustomChannel] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  // 창 안에서 방금 복사한 항목 — 창을 닫지 않고 그 버튼에 '복사됨 ✓'를 보여준다 (다른 채널 링크도 이어서 복사할 수 있게)
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // 링크 만들기 2단계 — 올릴 곳(채널)을 고른 뒤 어떤 페이지 링크를 공유할지 고른다 (null: 아직 채널 고르는 중, "": 기본 주소)
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [pickType, setPickType] = useState("");
  const [pickSeason, setPickSeason] = useState("");
  const [pickProduct, setPickProduct] = useState("");
  // 목록 창 (상품 종류·시즌·상품 고르기)
  const [picker, setPicker] = useState<{ title: string; items: PickItem[]; selected: string; onPick: (v: string) => void } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const todayStr = `${y}-${String(m).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 예약 집계만 조회 — 예약이 바뀌었을 때(refreshKey)만 다시 불러온다
    const [{ data: reservations }, { data: today }] = await Promise.all([
      supabase
        .from("reservations")
        .select("status")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("desired_date", monthStart)
        .lte("desired_date", monthEnd),
      supabase
        .from("reservations")
        .select("id, orderer_name, desired_time, status, delivery_type")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .eq("desired_date", todayStr)
        .order("desired_time", { ascending: true }),
    ]);

    if (reservations) {
      const counts = { 미확인: 0, 준비중: 0, 완료: 0, 취소: 0, total: reservations.length };
      for (const r of reservations) {
        if (r.status === "미확인") counts.미확인++;
        else if (r.status === "준비중") counts.준비중++;
        else if (r.status === "픽업/배송완료") counts.완료++;
        else if (r.status === "취소") counts.취소++;
      }
      setReservationCounts(counts);
    }
    if (today) setTodayItems(today as TodayItem[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`;

  // 채널별 링크 — ?utm_source= 를 붙여 두면 어느 채널에서 들어와 주문했는지 통계 탭에 잡힌다
  const channelUrl = (source: string) => `${menuUrl}?utm_source=${source}`;

  const openCopyModal = () => {
    setLinkSource(null);
    setCustomChannel("");
    setShowCustomInput(false);
    setCopiedKey(null);
    setShowCopyModal(true);
  };

  // 복사해도 창은 열어 둔다 — 누른 버튼이 '복사됨 ✓'로 바뀌고, 닫으면 바깥 버튼도 잠깐 '복사됨 ✓'
  const copyLink = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 공유할 페이지 주소에 출처를 붙인다 (기본 주소면 그대로)
  const withSource = (url: string) => (linkSource ? `${url}${url.includes("?") ? "&" : "?"}utm_source=${linkSource}` : url);
  const orderable = products.filter((p) => p.status !== "inactive");
  // 메뉴 설정에서 정한 순서대로 (손님 메뉴에 보이는 순서) — 정한 적 없으면 기본 순서
  const orderOf = (key: "product_type_order" | "season_order", fallback: readonly string[]) => {
    const o = (sharedSettings as Record<string, unknown>)[key];
    return Array.isArray(o) && o.length ? (o as string[]) : [...fallback];
  };
  const typeOptions = sortByOrder([...new Set(orderable.map((p) => p.product_type).filter(Boolean))], orderOf("product_type_order", PRODUCT_TYPES));
  const seasonOptions = sortByOrder([...new Set(orderable.flatMap((p) => p.seasons ?? []))], orderOf("season_order", SEASONS));
  const hasInstant = orderable.some((p) => p.instant) && !(sharedSettings as Record<string, unknown>).instant_menu_hidden;
  const instantLabel = String((sharedSettings as Record<string, unknown>).instant_menu_name ?? "").trim() || "바로 구매";
  const pickSource = (source: string) => { setLinkSource(source); setCopiedKey(null); };

  // 채널 버튼 모양 — 방금 복사한 버튼은 초록 테두리
  const channelBtnCls = (key: string) =>
    `py-2.5 rounded-xl border text-sm transition-colors ${
      copiedKey === key ? "border-green-400 bg-green-50 text-green-700 font-medium" : "border-gray-200 text-gray-700 hover:border-gold-400 hover:bg-gold-50"
    }`;

  // 기타 채널 이름은 영문 소문자·숫자·-·_ 만 (통계에서 같은 채널끼리 묶이도록)
  const customValid = /^[a-z0-9_-]{1,30}$/.test(customChannel);

  const handleShowQr = async () => {
    // 매장에 붙이는 QR은 오프라인 유입으로 따로 집계
    const url = await QRCode.toDataURL(channelUrl("qr"), { width: 512, margin: 2 });
    setQrDataUrl(url);
    setShowQrModal(true);
  };

  if (loading) return <div className="py-16 text-center text-sm text-gray-300">불러오는 중...</div>;

  const hasPhone = !!companyPhone;
  const hasAddress = !!settings?.address;
  const hasBank = !!settings?.bank_name && !!settings?.bank_account && !!settings?.bank_holder;
  const hasBankDoc = !!settings?.bank_account_image_url;
  const hasBusinessVerified = !!settings?.business_verified_at;

  const consultStatus = settings?.consult_apply_status ?? null;
  const isPro = plan !== "none";

  const applyBadge = consultStatus ? consultApplyLabels[consultStatus] : null;
  const mailOrderNumber = settings?.mail_order_number ?? null;
  const soldCount = settings?.sold_count ?? 0;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900">대시보드</h2>

      <OnboardingResumeCard companyId={companyId} slug={slug} settings={sharedSettings} onSettingsSaved={onSettingsSaved} />


      {/* 통신판매업 미신고 경고 */}
      {!mailOrderNumber && (
        <div className={`rounded-2xl py-4 px-4 -mx-4 flex items-center justify-between gap-3 md:mx-0 border ${
          soldCount >= 31 ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
        }`}>
          <div>
            <p className={`text-sm font-semibold ${soldCount >= 31 ? "text-red-700" : "text-yellow-700"}`}>현재 통신판매업 신고가 되어있지 않습니다</p>
            <p className={`text-xs mt-0.5 ${soldCount >= 31 ? "text-red-500" : "text-yellow-600"}`}>
              {soldCount >= 50
                ? "판매 수량이 50개를 초과해 판매가 정지되었습니다. 통신판매업 신고번호를 등록해주세요."
                : soldCount >= 31
                ? "판매 수량이 31개를 넘었습니다. 50개 판매 시 자동으로 판매가 정지됩니다. 통신판매업 신고번호를 등록해주세요."
                : "신고번호를 등록하지 않으면 50개 판매 시 판매가 자동으로 정지됩니다."}
            </p>
          </div>
          <button
            onClick={() => onNavigate("ordersettings")}
            className={`shrink-0 text-sm font-bold transition-colors ${
              soldCount >= 31 ? "text-red-600 hover:text-red-700" : "text-yellow-700 hover:text-yellow-800"
            }`}
          >
            {Math.min(soldCount, 50)}/50 →
          </button>
        </div>
      )}

      {/* 메뉴 URL */}
      <div className="bg-white py-4 px-4 -mx-4 flex items-center gap-3 md:mx-0 md:rounded-2xl md:px-5">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">링크 공유</p>
          <p className="text-sm text-gray-700 truncate font-mono">{menuUrl}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShowQr}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            QR 코드
          </button>
          <button
            onClick={openCopyModal}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? "복사됨 ✓" : "URL 복사"}
          </button>
        </div>
      </div>

      {/* URL 복사 — 링크를 올릴 곳을 고르면 출처(?utm_source=)가 붙은 주소를 복사 */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCopyModal(false)}>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* 닫기 — 복사해도 창이 닫히지 않아 직접 닫는다 (바깥을 눌러도 닫힘) */}
            <button
              type="button"
              onClick={() => setShowCopyModal(false)}
              aria-label="닫기"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            {linkSource === null ? (
            <>
            <div className="pr-6">
              <h3 className="text-sm font-semibold text-gray-900">링크를 올릴 곳을 선택해주세요</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                이 주소로 방문한 손님만 통계 탭 &lsquo;유입 분석&rsquo;에 채널별 방문·주문으로 집계돼요. 기본 주소로 방문하면 &lsquo;직접 유입&rsquo;으로만 잡혀요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([
                ["kakao", "카카오톡"],
                ["instagram", "인스타그램"],
                ["blog", "블로그"],
                ["naver", "네이버"],
              ] as const).map(([source, label]) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => pickSource(source)}
                  className={channelBtnCls(source)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => pickSource("")}
                className={channelBtnCls("base")}
              >
                기본 주소
              </button>
              <button
                type="button"
                onClick={() => setShowCustomInput((v) => !v)}
                className={`py-2.5 rounded-xl border text-sm transition-colors ${showCustomInput ? "border-gold-400 bg-gold-50 text-gold-700" : "border-gray-200 text-gray-700 hover:border-gold-400 hover:bg-gold-50"}`}
              >
                기타 (직접 입력)
              </button>
            </div>

            {showCustomInput && (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customChannel}
                    onChange={(e) => setCustomChannel(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter" && customValid) pickSource(customChannel); }}
                    placeholder="예) youtube, band"
                    maxLength={30}
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-gold-400"
                  />
                  <button
                    type="button"
                    onClick={() => pickSource(customChannel)}
                    disabled={!customValid}
                    className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap bg-gold-500 hover:bg-gold-600"
                  >
                    다음
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">영어 소문자·숫자로 입력해주세요. (한글·띄어쓰기는 입력되지 않아요)</p>
              </div>
            )}
            </>
            ) : (
            <>
            {/* 2단계 — 어떤 페이지 링크를 공유할지 */}
            <div className="pr-6">
              <button type="button" onClick={() => setLinkSource(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-1">← 올릴 곳 다시 고르기</button>
              <h3 className="text-sm font-semibold text-gray-900">어떤 링크를 공유할까요?</h3>
            </div>
            <div className="space-y-2">
              {(() => {
                const row = (key: string, label: string, url: string | null, extra?: React.ReactNode) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-sm text-gray-700">{label}</span>
                    <div className="flex-1 min-w-0">{extra}</div>
                    <button
                      type="button"
                      disabled={!url}
                      onClick={() => url && copyLink(withSource(url), key)}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!url ? "bg-gray-100 text-gray-300 cursor-not-allowed" : copiedKey === key ? "bg-green-500 text-white" : "bg-gold-500 text-white hover:bg-gold-600"}`}
                    >
                      {copiedKey === key ? "복사됨 ✓" : "복사"}
                    </button>
                  </div>
                );
                // 고르기 — 기본 선택 상자 대신 누르면 목록 창 (상품은 사진·이름·가격)
                const select = (value: string, onChange: (v: string) => void, options: PickItem[], placeholder: string, title: string) => {
                  const cur = options.find((o) => o.value === value);
                  return (
                    <button
                      type="button"
                      onClick={() => setPicker({ title, items: options, selected: value, onPick: (v) => { onChange(v); setCopiedKey(null); setPicker(null); } })}
                      className="w-full min-w-0 flex items-center justify-between gap-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white hover:border-gold-400 text-left"
                    >
                      <span className={`truncate ${cur ? "text-gray-800" : "text-gray-500"}`}>{cur ? cur.label : placeholder}</span>
                      <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                  );
                };
                return (
                  <>
                    {row("home", "첫 화면", menuUrl)}
                    {row("menu", "메뉴판", `${menuUrl}/menu`)}
                    {typeOptions.length > 0 && row("type", "상품 종류", pickType ? `${menuUrl}/menu?type=${encodeURIComponent(pickType)}` : null, select(pickType, setPickType, typeOptions.map((t) => ({ value: t, label: t })), "고르기", "상품 종류 고르기"))}
                    {seasonOptions.length > 0 && row("season", "시즌 메뉴", pickSeason ? `${menuUrl}/menu?tab=season&season=${encodeURIComponent(pickSeason)}` : null, select(pickSeason, setPickSeason, seasonOptions.map((t) => ({ value: t, label: t })), "고르기", "시즌 고르기"))}
                    {hasInstant && row("instant", instantLabel, `${menuUrl}/menu?tab=instant`)}
                    {orderable.length > 0 && row("product", "상품", pickProduct ? `${menuUrl}/products/${pickProduct}` : null, select(pickProduct, setPickProduct, orderable.map((p) => ({ value: p.id, label: p.name, image: p.image_url ?? null, sub: `${(p.price ?? 0).toLocaleString()}원` })), "상품 고르기", "상품 고르기"))}
                  </>
                );
              })()}
            </div>
            </>
            )}

          </div>
        </div>
      )}

      {picker && <PickListModal title={picker.title} items={picker.items} selected={picker.selected} onPick={picker.onPick} onClose={() => setPicker(null)} />}

      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 space-y-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">매장 QR 코드</h3>
              <p className="text-xs text-gray-400 mt-1 break-all font-mono">{channelUrl("qr")}</p>
            </div>
            <img src={qrDataUrl} alt="매장 QR 코드" className="w-full rounded-xl border border-gray-100" />
            <div className="flex gap-2">
              <a
                href={qrDataUrl}
                download={`${slug}-qr.png`}
                className="flex-1 bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
              >
                이미지 저장
              </a>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm hover:border-gray-400 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-transparent -mx-4 md:gap-4 md:mx-0">

        {/* 오늘 예약 정보 */}
        <div className="bg-white py-4 px-4 md:rounded-2xl md:px-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">오늘 예약 정보</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {todayItems.length === 0
                  ? "오늘 예정된 예약이 없습니다"
                  : `총 ${todayItems.length}건 · 대기 ${todayItems.filter((i) => i.status === "미확인" || i.status === "준비중").length}건`}
              </p>
            </div>
            <button
              onClick={() => onNavigate("reservations")}
              className="text-xs text-gray-400 hover:text-gold-500 transition-colors shrink-0"
            >
              전체보기 →
            </button>
          </div>
          {todayItems.length > 0 && (
            <div className="space-y-1.5">
              {todayItems.slice(0, 4).map((item) => {
                const statusStyle =
                  item.status === "미확인" ? "bg-red-50 text-red-500"
                  : item.status === "준비중" ? "bg-blue-50 text-blue-500"
                  : item.status === "픽업/배송완료" ? "bg-green-50 text-green-600"
                  : "bg-gray-100 text-gray-400";
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate("reservations", item.status)}
                    className="w-full flex items-center gap-2.5 bg-gray-50 rounded-xl py-2.5 px-3 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-xs text-gray-400 w-11 shrink-0">{item.desired_time?.slice(0, 5) ?? "--:--"}</span>
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{item.orderer_name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.delivery_type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusStyle}`}>
                      {item.status === "픽업/배송완료" ? "완료" : item.status}
                    </span>
                  </button>
                );
              })}
              {todayItems.length > 4 && (
                <button
                  onClick={() => onNavigate("reservations")}
                  className="w-full text-center text-xs text-gray-400 hover:text-gold-500 transition-colors py-1.5"
                >
                  +{todayItems.length - 4}건 더보기
                </button>
              )}
            </div>
          )}
        </div>

        {/* 예약 현황 (오늘~30일) */}
        <div className="bg-white py-4 px-4 md:rounded-2xl md:px-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">예약 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">이번 달</p>
            </div>
            <button
              onClick={() => onNavigate("reservations")}
              className="text-xs text-gray-400 hover:text-gold-500 transition-colors"
            >
              관리 →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "미확인", statusKey: "미확인", value: reservationCounts.미확인 },
              { label: "준비중", statusKey: "준비중", value: reservationCounts.준비중 },
              { label: "완료", statusKey: "픽업/배송완료", value: reservationCounts.완료 },
              { label: "취소", statusKey: "취소", value: reservationCounts.취소 },
            ].map(({ label, statusKey, value }) => (
              <button
                key={label}
                onClick={() => onNavigate("reservations", statusKey)}
                className="bg-gray-50 rounded-xl py-3 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {/* 미확인이 있으면 숫자만 빨간색 (확인할 게 있다는 신호 — 알림 종과 같은 빨강) */}
                <p className={`text-lg font-semibold ${statusKey === "미확인" && value > 0 ? "text-red-500" : "text-gray-900"}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 오늘 들어온 꽃 색상 — 예약 현황 옆 (예전 '기능 현황' 자리). 기능 켜기·끄기는 판매 설정에서 본다 */}
        <TodayColorsCard companyId={companyId} settings={sharedSettings} onSaved={onSettingsSaved} inGrid />

        {/* 손님 문의 줄이기 — 켜면 사라지는 질문과 함께 (예전 '기능 현황'을 대신) */}
        <InquiryChecklist settings={sharedSettings} onNavigate={(tab) => onNavigate(tab)} />

        {/* 맞춤 주문 신청 상태 */}
        <div className="bg-white py-4 px-4 md:col-span-2 md:rounded-2xl md:px-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">맞춤 주문 신청</h3>
              {applyBadge && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${applyBadge.color}`}>
                  {applyBadge.label}
                </span>
              )}
            </div>
            {/* 대화로 판매 신청·준비 — 시작 설정과 같은 대화 화면의 판매 부분부터 (판매 중이면 숨김) */}
            {!(consultStatus === "approved" && settings?.consult_enabled) && (
              <Link
                href={`/${slug}/admin/onboarding?start=sales`}
                className="text-xs font-medium text-gold-600 hover:text-gold-500 transition-colors"
              >
                {consultStatus === "pending" ? "기다리는 동안 판매 준비 →" : consultStatus === "approved" ? "대화로 판매 준비 →" : consultStatus === "rejected" ? "대화로 다시 신청 →" : "대화로 신청하기 →"}
              </Link>
            )}
          </div>

          {consultStatus === "approved" ? (
            <p className="text-xs text-green-600">승인이 완료되었습니다. 맞춤 주문 탭에서 기능을 활성화할 수 있습니다.</p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-gray-400 mb-3">
                {consultStatus === "pending"
                  ? "운영자 검토 중입니다. 승인 후 맞춤 주문을 활성화할 수 있습니다."
                  : consultStatus === "rejected"
                  ? "반려되었습니다. 아래 항목을 확인하고 다시 신청해주세요."
                  : "아래 항목을 모두 완료한 뒤 맞춤 주문을 신청할 수 있습니다."}
              </p>
              <CheckItem ok={hasPhone} label="매장 전화번호 입력" tab="ordersettings" onNavigate={onNavigate} />
              <CheckItem ok={hasAddress} label="매장 주소 입력" tab="ordersettings" onNavigate={onNavigate} />
              <CheckItem ok={hasBank} label="계좌 정보 입력 (은행·계좌번호·예금주)" tab="ordersettings" onNavigate={onNavigate} />
              <CheckItem ok={hasBankDoc} label="통장사본 업로드" tab="ordersettings" onNavigate={onNavigate} />
              <CheckItem ok={hasBusinessVerified} label="사업자등록번호 인증" tab="ordersettings" onNavigate={onNavigate} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
