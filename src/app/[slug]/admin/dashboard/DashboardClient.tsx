"use client";

import { SUBSCRIPTION_INACTIVE_MESSAGE } from "@/lib/subscriptionAccess";
import NaverMailPanel from "./NaverMailPanel";
import NaverBell from "./NaverBell";
import { hasUnsaved } from "@/components/admin/useDirty";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product, ProductInput, ProductStatus } from "@/types";
import { Reservation } from "./reservations/types";
import type { CompanySettings } from "./companySettings";
import { createClient } from "@/lib/supabase/client";
import { generateThemeVars } from "@/lib/theme";
import ProductForm from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";
import CompanyInfoTab from "./CompanyInfoTab";
import MyInfoTab from "./MyInfoTab";
import SettingsTab from "./SettingsTab";
import MenuSettingsTab from "./MenuSettingsTab";
import ReservationSettingsTab from "./ReservationSettingsTab";
import BusinessSettingsTab from "./BusinessSettingsTab";
import OrderSettingsTab from "./OrderSettingsTab";
import ReservationsTab from "./ReservationsTab";
import StatsTab from "./StatsTab";
import SettlementTab from "./SettlementTab";
import PlanTab from "./PlanTab";
import type { AppliedPromo } from "@/lib/appliedPromo";
import DashboardOverviewTab from "./DashboardOverviewTab";
import { TodayColorsPrompt } from "./TodayColors";
import { notifyMenuChanged } from "@/lib/menuCacheClient";

type Tab = "dashboard" | "reservations" | "products" | "stats" | "settlement" | "company" | "ordersettings" | "business" | "reservation" | "menusettings" | "settings" | "plan" | "myinfo";
const TABS: Tab[] = ["dashboard", "reservations", "products", "stats", "settlement", "company", "ordersettings", "business", "reservation", "menusettings", "settings", "plan", "myinfo"];
/** 아래에 저장 줄이 붙는 설정 탭 */
const SAVE_BAR_TABS: Tab[] = ["company", "ordersettings", "business", "reservation", "settings"];
// 주소의 ?tab= 값을 탭으로 — 없거나 모르는 값이면 대시보드
const toTab = (v: string | null): Tab => (v && (TABS as string[]).includes(v) ? (v as Tab) : "dashboard");

interface Props {
  slug: string;
  userId: string;
  userEmail: string;
  isOAuth: boolean;
  profileName: string;
  profilePhone: string;
  twoFactorEnabled: boolean;
  companyId: string;
  companyName: string;
  logoImage: string | null;
  themeBg: string;
  themeAccent: string;
  initialProducts: Product[];
  locationUrl: string | null;
  kakaoChannelUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  companyPhone: string | null;
  hiddenProductTypes: string[];
  hiddenSeasons: string[];
  consultEnabled: boolean;
  plan: "monthly" | "annual" | "none" | "free";
  subscriptionPlan: "monthly" | "annual" | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  hasBillingKey: boolean;
  appliedPromo: AppliedPromo;
  initialSettings: CompanySettings;
  /** 구독이 끝난 매장 — 보기만 (내 정보·요금제만 쓸 수 있고 나머지는 막으로 덮는다) */
  readOnly?: boolean;
}


export default function DashboardClient({ slug, userId, userEmail, isOAuth, profileName, profilePhone, twoFactorEnabled, companyId, companyName, logoImage, themeBg, themeAccent, initialProducts, locationUrl, kakaoChannelUrl, instagramUrl, youtubeUrl, companyPhone, hiddenProductTypes, hiddenSeasons, consultEnabled, plan, subscriptionPlan, cancelAtPeriodEnd, trialEndsAt, planExpiresAt, hasBillingKey, appliedPromo, initialSettings, readOnly = false }: Props) {
  const searchParams = useSearchParams();
  const initialTab = toTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  // 탭 이동을 주소(?tab=)와 방문 기록에 남긴다 — 뒤로가기로 이전 탭에 돌아오고, 새로고침해도 그 탭으로 열린다.
  // Next 페이지 이동(router.push)은 서버 데이터를 다시 받아와서, 브라우저 기록만 바꾸는 history API를 쓴다.
  // replace: 기록을 쌓지 않고 바꾸기만 (예: 판매 기능을 꺼서 통계 탭이 사라질 때)
  const goTab = (tab: Tab, replace = false) => {
    // 지금 탭에 저장하지 않은 내용이 있으면 한 번 묻는다 (값은 그 탭에 그대로 남아 돌아오면 이어서 저장할 수 있다)
    if (tab !== activeTab && hasUnsaved(activeTab) && !window.confirm("저장하지 않은 내용이 있어요. 다른 메뉴로 이동할까요?\n(바꾼 내용은 이 메뉴로 돌아오면 그대로 남아 있어요)")) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "dashboard") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    if (url.href === window.location.href) return;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  };
  // 뒤로가기·앞으로가기 — 주소의 탭으로 화면을 맞춘다
  useEffect(() => {
    const onPop = () => setActiveTab(toTab(new URLSearchParams(window.location.search).get("tab")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // 한 번 연 탭은 숨기기만 하고 유지 — 탭을 오갈 때마다 다시 마운트되며 DB를 재조회하지 않도록
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set([initialTab]));
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);
  // 매장 설정은 서버에서 한 번 받은 값을 탭들이 공유 (탭별 company_settings 재조회 제거)
  const [companySettings, setCompanySettings] = useState<CompanySettings>(initialSettings);
  const handleSettingsSaved = (patch: CompanySettings) => setCompanySettings((prev) => ({ ...prev, ...patch }));
  // 예약이 바뀔 때만 증가 — 대시보드 요약·통계·정산 탭이 이 값이 바뀔 때만 다시 불러온다
  const [reservationsVersion, setReservationsVersion] = useState(0);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // 복제 — 이 상품 내용을 채운 '새 상품 추가' 창 (저장해야 새 상품이 생긴다)
  const [duplicatingProduct, setDuplicatingProduct] = useState<Product | null>(null);
  // 상품 관리 필터로 걸러진 개수 (필터가 없으면 null) — 제목 옆에 표시
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeVars, setThemeVars] = useState(generateThemeVars(themeBg, themeAccent));
  const [currentCompanyName, setCurrentCompanyName] = useState(companyName);
  const [currentLogoImage, setCurrentLogoImage] = useState(logoImage);
  const [currentNaverTalkUrl, setCurrentNaverTalkUrl] = useState(locationUrl);
  const [currentKakaoChannelUrl, setCurrentKakaoChannelUrl] = useState(kakaoChannelUrl);
  const [currentInstagramUrl, setCurrentInstagramUrl] = useState(instagramUrl);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState(youtubeUrl);
  const [currentHiddenProductTypes, setCurrentHiddenProductTypes] = useState(hiddenProductTypes);
  const [currentHiddenSeasons, setCurrentHiddenSeasons] = useState(hiddenSeasons);
  const [currentConsultEnabled, setCurrentConsultEnabled] = useState(consultEnabled);
  const [reservationStatusFilter, setReservationStatusFilter] = useState<string | undefined>(undefined);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = (showForm || !!editingProduct || !!duplicatingProduct) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, editingProduct, duplicatingProduct]);

  // 예약 탭은 월 단위로 보므로 보고 있는 달(희망일 기준)의 예약만 가져온다.
  // 전체를 내려받으면 예약이 쌓일수록 느려지고, Supabase 1회 최대 1000행 제한에 걸려 잘린다.
  const [reservationMonth, setReservationMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const reservationRequestId = useRef(0);

  const fetchReservations = async (target = reservationMonth) => {
    const requestId = ++reservationRequestId.current;
    setReservationsLoading(true);
    const from = `${target.year}-${String(target.month).padStart(2, "0")}-01`;
    const next = new Date(target.year, target.month, 1);
    const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .gte("desired_date", from)
      .lt("desired_date", to)
      .order("created_at", { ascending: false });
    // 달을 빠르게 넘길 때 늦게 도착한 이전 달 응답이 화면을 덮어쓰지 않도록 최신 요청만 반영
    if (requestId !== reservationRequestId.current) return;
    setAllReservations((data as Reservation[]) ?? []);
    setReservationsLoading(false);
  };

  // 예약 탭을 처음 열 때부터 조회 (대시보드만 보고 나가는 경우 불필요한 조회를 하지 않도록)
  const reservationsTabOpened = visitedTabs.has("reservations");
  useEffect(() => {
    if (!reservationsTabOpened) return;
    fetchReservations(reservationMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, reservationMonth.year, reservationMonth.month, reservationsTabOpened]);

  // ── 예약 실시간 반영 — 새 예약(플로에이드 주문·네이버 메일 예약)·취소가 새로고침 없이 바로 보이게 ──
  const monthRef = useRef(reservationMonth);
  monthRef.current = reservationMonth;
  const [liveToast, setLiveToast] = useState<string | null>(null);
  // 확인하지 않은 네이버 예약 (메일로 자동으로 들어온 새 예약·취소) — 열어 볼 때까지 예약 관리 탭에 빨간 숫자·목록 위 안내
  const [naverUnchecked, setNaverUnchecked] = useState<Reservation[]>([]);
  const loadNaverUnchecked = () =>
    supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId)
      .eq("naver_unchecked", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setNaverUnchecked((data as Reservation[] | null) ?? []));
  useEffect(() => {
    loadNaverUnchecked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  // 알림에서 고른 예약 — 예약 관리 탭이 받아서 그 달로 옮겨 상세를 연다
  const [naverOpenRequest, setNaverOpenRequest] = useState<{ reservation: Reservation; nonce: number } | null>(null);
  /** 확인했어요 — 한 건(id) 또는 전부 */
  const checkNaver = async (id?: string) => {
    const ids = id ? [id] : naverUnchecked.map((r) => r.id);
    if (!ids.length) return;
    setNaverUnchecked((prev) => prev.filter((r) => !ids.includes(r.id)));
    setAllReservations((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, naver_unchecked: false } : r)));
    const { error } = await supabase.from("reservations").update({ naver_unchecked: false }).in("id", ids);
    if (error) {
      // 저장이 안 됐으면 원래대로 (사라졌다가 새로고침하면 다시 나타나는 일이 없게)
      console.error("[naver] 확인 처리 실패:", error.message);
      setAllReservations((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, naver_unchecked: true } : r)));
      loadNaverUnchecked();
      alert("확인 처리를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };
  useEffect(() => {
    const channel = supabase
      .channel(`reservations-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `company_id=eq.${companyId}` },
        (payload) => {
          // 목록을 다시 불러오지 않고 바뀐 예약 한 건만 끼워 넣는다
          // (불러오는 동안 목록이 사라졌다 다시 그려지면 펼쳐 둔 상세·입력 중인 칸·제작 완료 창이 날아간다)
          const m = monthRef.current;
          const inMonth = (d?: string | null) => !!d && d.slice(0, 7) === `${m.year}-${String(m.month).padStart(2, "0")}`;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string } | null)?.id;
            if (id) setAllReservations((prev) => prev.filter((r) => r.id !== id));
          } else {
            const row = payload.new as Reservation & { deleted_at?: string | null };
            setAllReservations((prev) => {
              const has = prev.some((r) => r.id === row.id);
              // 지웠거나 보고 있는 달이 아니면 목록에서 뺀다
              if (row.deleted_at || !inMonth(row.desired_date)) return has ? prev.filter((r) => r.id !== row.id) : prev;
              // 있던 예약은 그 자리에서 내용만, 새 예약은 맨 위에 (목록은 최근 접수 순)
              return has ? prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)) : [row, ...prev];
            });
          }
          setReservationsVersion((v) => v + 1);
          // 확인 필요 목록도 새로
          loadNaverUnchecked();

          // 알림 — 손님이 낸 주문·네이버 메일 예약만 (사장님이 직접 추가·수정한 건 알리지 않는다)
          const row = payload.new as { orderer_name?: string; desired_date?: string; desired_time?: string | null; status?: string; order_type?: string | null; naver_booking_id?: string | null } | null;
          if (!row) return;
          const fromOutside = !!row.naver_booking_id || ["consult", "product", "link"].includes(row.order_type ?? "");
          if (!fromOutside) return;
          const when = `${row.desired_date ? Number(row.desired_date.slice(5, 7)) + "/" + Number(row.desired_date.slice(8, 10)) : ""}${row.desired_time ? ` ${row.desired_time}` : ""}`;
          if (payload.eventType === "INSERT") {
            setLiveToast(`${row.naver_booking_id ? "네이버 예약" : "새 예약"}이 들어왔어요 · ${row.orderer_name ?? ""} · ${when}`);
          } else if (payload.eventType === "UPDATE" && row.status === "취소" && row.naver_booking_id && (payload.old as { status?: string } | null)?.status !== "취소") {
            setLiveToast(`네이버 예약이 취소됐어요 · ${row.orderer_name ?? ""} · ${when}`);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  useEffect(() => {
    if (!liveToast) return;
    const t = setTimeout(() => setLiveToast(null), 6000);
    return () => clearTimeout(t);
  }, [liveToast]);


  const handleAdd = async (data: ProductInput) => {
    setError(null);
    const { data: newProduct, error: err } = await supabase
      .from("products")
      .insert({ ...data, company_id: companyId })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    notifyMenuChanged();
    setProducts((prev) => [...prev, newProduct as Product]);
    setShowForm(false);
    setDuplicatingProduct(null);
  };

  const handleEdit = async (data: ProductInput) => {
    if (!editingProduct) return;
    setError(null);
    const { data: updated, error: err } = await supabase
      .from("products")
      .update(data)
      .eq("id", editingProduct.id)
      .select()
      .single();
    if (err) { setError(err.message); return; }
    notifyMenuChanged();
    setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? (updated as Product) : p)));
    setEditingProduct(null);
  };

  const handleStatusChange = async (id: string, status: ProductStatus) => {
    const { error: err } = await supabase.from("products").update({ status }).eq("id", id);
    if (err) { setError(err.message); return; }
    notifyMenuChanged();
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  // 지금 삭제 중인 상품 — 목록에서 그 줄·카드에 로딩을 보여준다
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const handleDelete = async (id: string) => {
    if (deletingProductId || !confirm("정말 삭제하시겠습니까?")) return;
    setError(null);
    setDeletingProductId(id);
    try {
      const { error: err } = await supabase.from("products").delete().eq("id", id);
      if (err) { setError(err.message); return; }
      notifyMenuChanged();
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleConsultToggle = (enabled: boolean) => {
    setCurrentConsultEnabled(enabled);
    if (!enabled && (activeTab === "stats" || activeTab === "settlement")) goTab("reservations", true);
  };

  // 보기 전용일 때 막으로 덮는 화면 — 내 정보·요금제(다시 구독)만 쓸 수 있다
  const locked = readOnly && activeTab !== "myinfo" && activeTab !== "plan";

  const mainTabs: { key: Tab; label: string; statsOnly?: boolean }[] = [
    { key: "dashboard", label: "대시보드" },
    { key: "reservations", label: "예약 관리" },
    { key: "products", label: "상품 관리" },
    { key: "stats", label: "통계", statsOnly: true },
    { key: "settlement", label: "정산", statsOnly: true },
    { key: "plan", label: "요금제" },
  ];

  const settingsTabs: { key: Tab; label: string }[] = [
    { key: "company", label: "매장 정보" },
    { key: "business", label: "영업 설정" },
    { key: "ordersettings", label: "판매 신청" },
    { key: "reservation", label: "판매 설정" },
    { key: "menusettings", label: "메뉴 설정" },
    { key: "settings", label: "디자인" },
    { key: "myinfo", label: "내 정보" },
  ];

  const isSettingsTab = settingsTabs.some((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={themeVars as React.CSSProperties}>
      {/* 실시간 예약 알림 — 누르면 예약 관리로 */}
      {liveToast && (
        <button
          type="button"
          onClick={() => { setLiveToast(null); goTab("reservations"); }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] px-4 py-3 rounded-2xl bg-gray-900 text-white text-sm shadow-lg flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-gold-400 shrink-0" />
          <span className="truncate">{liveToast}</span>
        </button>
      )}
      <header className="border-b border-gray-200 bg-white shrink-0 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${slug}`} className="text-lg font-medium text-gray-900 hover:text-gray-600 transition-colors">
            {companyName} — 관리자
          </Link>
          {/* 알림 — 어느 탭에서든 (확인하지 않은 네이버 예약 · 읽지 못한 네이버 메일). 로그아웃은 내 정보 탭에 */}
          {!readOnly && (
            <NaverBell
              companyId={companyId}
              settings={companySettings}
              unchecked={naverUnchecked}
              onCheck={checkNaver}
              onOpenReservation={(r) => {
                goTab("reservations");
                setNaverOpenRequest({ reservation: r, nonce: Date.now() });
              }}
            />
          )}
        </div>
      </header>

      {/* 오늘 꽃 색상을 아직 안 정했으면 그날 첫 접속 때 묻는다 (접속마다 한 번, 어느 탭에서든) */}
      {!readOnly && <TodayColorsPrompt companyId={companyId} settings={companySettings} onSaved={handleSettingsSaved} />}

      {/* 구독이 끝난 매장 — 보기만 할 수 있다는 띠 */}
      {readOnly && (
        <div className="bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm break-keep">구독이 끝나 지금은 보기만 할 수 있어요.</p>
            <button type="button" onClick={() => goTab("plan")} className="shrink-0 px-3 py-1.5 rounded-lg bg-gold-500 text-white text-xs font-medium hover:bg-gold-600">
              다시 구독하기
            </button>
          </div>
        </div>
      )}

      {/* 모바일 탭 내비게이션 */}
      <div className="md:hidden bg-white border-b border-gray-100 sticky top-[61px] z-30">
        {/* 메인 탭 행 */}
        <div className="flex overflow-x-auto no-scrollbar">
          {mainTabs.map((tab) => (
            <div
              key={tab.key}
              className={`overflow-hidden transition-all duration-300 shrink-0 ${tab.statsOnly && !currentConsultEnabled ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[120px] opacity-100"}`}
            >
              <button
                onClick={() => { goTab(tab.key); setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); setError(null); setShowSettingsDropdown(false); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            </div>
          ))}
          {/* 설정 탭 */}
          <button
            onClick={() => setShowSettingsDropdown((v) => !v)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
              isSettingsTab ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            설정
            <svg className={`w-3.5 h-3.5 transition-transform ${showSettingsDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
        {/* 설정 하위 탭 행 */}
        <div className={`overflow-hidden transition-all duration-300 ${showSettingsDropdown || isSettingsTab ? "max-h-12" : "max-h-0"}`}>
          <div className="flex overflow-x-auto no-scrollbar border-t border-gray-50 bg-gray-50">
            {settingsTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { goTab(tab.key); setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); setError(null); }}
                className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.key ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <Link
              href="/notice"
              target="_blank"
              className="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors"
            >
              사용법 →
            </Link>
            <Link
              href="/announcements"
              target="_blank"
              className="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors"
            >
              공지사항 →
            </Link>
          </div>
        </div>
      </div>

      {/* 저장 줄이 있는 설정 탭 — 모바일은 저장 줄이 화면 맨 끝 (푸터처럼, 아래 여백 없음) */}
      <div className={`flex flex-1 max-w-6xl w-full mx-auto px-4 pt-6 gap-6 ${SAVE_BAR_TABS.includes(activeTab) ? "pb-0 md:pb-6" : "pb-6"}`}>
        {/* 데스크탑 사이드 탭 — 흰 패널로 감싸 회색 바탕과 구분 (오른쪽 콘텐츠 카드와 같은 모양) */}
        <nav className="hidden md:block w-48 shrink-0 self-start">
          <ul className="space-y-1 bg-white rounded-2xl p-2">
            {mainTabs.map((tab) => (
              <li
                key={tab.key}
                className={`overflow-hidden transition-all duration-300 ${tab.statsOnly && !currentConsultEnabled ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}
              >
                <button
                  onClick={() => { goTab(tab.key); setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); setError(null); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key ? "bg-gold-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
            {/* 설정 드롭다운 */}
            <li>
              <button
                onClick={() => setShowSettingsDropdown((v) => !v)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  isSettingsTab ? "bg-gold-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                설정
                <svg className={`w-3.5 h-3.5 transition-transform ${showSettingsDropdown || isSettingsTab ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${showSettingsDropdown || isSettingsTab ? "max-h-80" : "max-h-0"}`}>
                <ul className="mt-1 space-y-0.5 pl-2">
                  {settingsTabs.map((tab) => (
                    <li key={tab.key}>
                      <button
                        onClick={() => { goTab(tab.key); setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); setError(null); }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                          activeTab === tab.key ? "bg-gold-500/10 text-gold-600 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li>
              <Link
                href="/notice"
                target="_blank"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                사용법
                <span className="text-sm font-semibold">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/announcements"
                target="_blank"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                공지사항
                <span className="text-sm font-semibold">→</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* 상품 100개 한도 초과 모달 */}
        {showLimitModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowLimitModal(false)}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-[16px] mb-2">상품 등록 한도 초과</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
                상품은 최대 <span className="font-semibold text-gray-800">500개</span>까지 등록할 수 있으며, 현재 한도에 도달했습니다.<br />
                더 추가하려면 사용하지 않는 상품을 삭제해 주세요.
              </p>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[14px] font-medium hover:bg-gray-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 상품 추가/수정 모달 */}
        {(showForm || editingProduct || duplicatingProduct) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); } }}
          >
            <div className="bg-gray-100 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 pt-5 pb-4 bg-white">
                <h3 className="font-medium text-gray-900">{editingProduct ? "상품 수정" : duplicatingProduct ? "상품 복사" : "새 상품 추가"}</h3>
                <button
                  onClick={() => { setShowForm(false); setEditingProduct(null); setDuplicatingProduct(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              {editingProduct
                ? <ProductForm initialData={editingProduct} onSubmit={handleEdit} onCancel={() => setEditingProduct(null)} companyId={companyId} />
                : duplicatingProduct
                ? <ProductForm key={duplicatingProduct.id} initialData={duplicatingProduct} duplicate onSubmit={handleAdd} onCancel={() => setDuplicatingProduct(null)} companyId={companyId} />
                : <ProductForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} companyId={companyId} />
              }
            </div>
          </div>
        )}

        {/* 보기 전용 — 내 정보·요금제 말고는 내용 위를 막으로 덮고(inert: 누르기·키보드 이동 모두 막힘) 안내를 띄운다 */}
        <div className="flex-1 min-w-0 relative">
        <main className="min-w-0" inert={locked}>
          {visitedTabs.has("dashboard") && (
            <div className={activeTab === "dashboard" ? "" : "hidden"}>
              <DashboardOverviewTab
                companyId={companyId}
                settings={companySettings}
                onSettingsSaved={handleSettingsSaved}
                refreshKey={reservationsVersion}
                slug={slug}
                plan={plan}
                onNavigate={(tab, statusFilter) => {
                  setReservationStatusFilter(statusFilter);
                  goTab(toTab(tab));
                }}
              />
            </div>
          )}

          {visitedTabs.has("reservations") && (
            <div className={activeTab === "reservations" ? "" : "hidden"}>
              <ReservationsTab
                // 대시보드 요약에서 상태 필터를 걸고 들어오면 새로 마운트해 필터를 적용
                key={reservationStatusFilter ?? "all"}
                companyId={companyId}
                allReservations={allReservations}
                setAllReservations={(update) => { setAllReservations(update); setReservationsVersion((v) => v + 1); }}
                loading={reservationsLoading}
                onRefresh={() => { fetchReservations(); setReservationsVersion((v) => v + 1); }}
                settings={companySettings}
                onCheckNaver={checkNaver}
                openRequest={naverOpenRequest}
                onOpenRequestDone={() => setNaverOpenRequest(null)}
                onMonthChange={(year, month) => setReservationMonth((prev) =>
                  prev.year === year && prev.month === month ? prev : { year, month }
                )}
                initialStatusFilter={reservationStatusFilter}
                onClearStatusFilter={() => setReservationStatusFilter(undefined)}
              />
            </div>
          )}

          {/* 상품관리: 항상 마운트, 비활성 시 hidden으로 숨김 (캐싱) */}
          <div className={activeTab === "products" ? "" : "hidden"}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-gray-900">
                상품 목록
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {filteredCount !== null ? `${filteredCount} / ${products.length}개` : `${products.length}개`}
                </span>
              </h2>
                <button
                  onClick={() => products.length >= 500 ? setShowLimitModal(true) : setShowForm(true)}
                  className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
                >
                  + 상품 추가
                </button>
              </div>
              <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5">
                <ProductTable
                  products={products}
                  onEdit={(product) => { setEditingProduct(product); setShowForm(false); }}
                  onDelete={handleDelete}
                  onDuplicate={(product) => {
                    if (products.length >= 500) return setShowLimitModal(true);
                    setEditingProduct(null);
                    setShowForm(false);
                    setDuplicatingProduct(product);
                  }}
                  onStatusChange={handleStatusChange}
                  companyId={companyId}
                  onFilteredCountChange={setFilteredCount}
                  deletingId={deletingProductId}
                />
              </div>
            </div>
          </div>

          {visitedTabs.has("stats") && (
            <div className={activeTab === "stats" ? "" : "hidden"}>
              <StatsTab companyId={companyId} refreshKey={reservationsVersion} />
            </div>
          )}

          {visitedTabs.has("settlement") && (
            <div className={activeTab === "settlement" ? "" : "hidden"}>
              <SettlementTab companyId={companyId} refreshKey={reservationsVersion} />
            </div>
          )}

          {visitedTabs.has("company") && (
            <div className={activeTab === "company" ? "" : "hidden"}>
              <CompanyInfoTab
                companyId={companyId}
                slug={slug}
                initialName={currentCompanyName}
                initialLogo={currentLogoImage}
                initialNaverTalkUrl={currentNaverTalkUrl}
                initialKakaoChannelUrl={currentKakaoChannelUrl}
                initialInstagramUrl={currentInstagramUrl}
                initialYoutubeUrl={currentYoutubeUrl}
                initialPhone={companyPhone}
                initialParking={(companySettings.parking as string | null) ?? null}
                naverConnect={<NaverMailPanel part="connect" companyId={companyId} settings={companySettings} />}
                onSettingsSaved={handleSettingsSaved}
                plan={plan}
                onSave={(name, logo, naver, kakao, instagram, youtube) => {
                  setCurrentCompanyName(name);
                  setCurrentLogoImage(logo);
                  setCurrentNaverTalkUrl(naver);
                  setCurrentKakaoChannelUrl(kakao);
                  setCurrentInstagramUrl(instagram);
                  setCurrentYoutubeUrl(youtube);
                }}
              />
            </div>
          )}

          {visitedTabs.has("ordersettings") && (
            <div className={activeTab === "ordersettings" ? "" : "hidden"}>
              <OrderSettingsTab companyId={companyId} plan={plan} settings={companySettings} onSettingsSaved={handleSettingsSaved} />
            </div>
          )}

          {visitedTabs.has("business") && (
            <div className={activeTab === "business" ? "" : "hidden"}>
              <BusinessSettingsTab companyId={companyId} settings={companySettings} onSettingsSaved={handleSettingsSaved} />
            </div>
          )}

          {visitedTabs.has("reservation") && (
            <div className={activeTab === "reservation" ? "" : "hidden"}>
              <ReservationSettingsTab
                companyId={companyId}
                settings={companySettings}
                onSettingsSaved={handleSettingsSaved}
                onConsultToggle={handleConsultToggle}
                onGoToOrderSettings={() => goTab("ordersettings")}
                products={products.filter((p) => p.status === "active")}
              />
            </div>
          )}

          {visitedTabs.has("menusettings") && (
            <div className={activeTab === "menusettings" ? "" : "hidden"}>
              <MenuSettingsTab
                companyId={companyId}
                initialHiddenProductTypes={currentHiddenProductTypes}
                initialHiddenSeasons={currentHiddenSeasons}
                onSave={(types, seasons) => {
                  setCurrentHiddenProductTypes(types);
                  setCurrentHiddenSeasons(seasons);
                  // 다른 탭(영업 설정·판매 설정)의 유형 목록도 바로 맞도록 공유 설정에 반영
                  handleSettingsSaved({ hidden_product_types: types, hidden_seasons: seasons });
                }}
                onSettingsSaved={handleSettingsSaved}
              />
            </div>
          )}

          {visitedTabs.has("settings") && (
            <div className={activeTab === "settings" ? "" : "hidden"}>
              <SettingsTab
                companyId={companyId}
                initialBg={themeBg}
                initialAccent={themeAccent}
                onThemeChange={(bg, accent) => setThemeVars(generateThemeVars(bg, accent))}
              />
            </div>
          )}

          {visitedTabs.has("plan") && (
            <div className={activeTab === "plan" ? "" : "hidden"}>
              <PlanTab
                companyId={companyId}
                customerName={profileName}
                plan={plan}
                subscriptionPlan={subscriptionPlan}
                cancelAtPeriodEnd={cancelAtPeriodEnd}
                trialEndsAt={trialEndsAt}
                planExpiresAt={planExpiresAt}
                hasBillingKey={hasBillingKey}
                appliedPromo={appliedPromo}
              />
            </div>
          )}

          {visitedTabs.has("myinfo") && (
            <div className={activeTab === "myinfo" ? "" : "hidden"}>
              <MyInfoTab
                loginPath={`/${slug}/admin`}
                email={userEmail}
                isOAuth={isOAuth}
                profileName={profileName}
                profilePhone={profilePhone}
                initialTwoFactorEnabled={twoFactorEnabled}
              />
            </div>
          )}
        </main>
        {locked && (
          <div className="absolute inset-0 z-20 bg-white/50 backdrop-grayscale-[0.4] -mx-4 md:mx-0 md:rounded-2xl">
            <div className="sticky top-28 mx-auto mt-10 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-5 text-center space-y-3">
              <p className="text-sm font-semibold text-gray-900">{SUBSCRIPTION_INACTIVE_MESSAGE}</p>
              <p className="text-xs text-gray-500 break-keep">지금은 보기만 할 수 있어요. 다시 구독하면 모든 기능을 쓸 수 있어요. 비밀번호·로그아웃은 내 정보에서 할 수 있어요.</p>
              <button type="button" onClick={() => goTab("plan")} className="w-full py-2.5 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600">
                다시 구독하기
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
