"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import PreviewDashboardOverview from "./PreviewDashboardOverview";
import { MOCK_COMPANY_NAME, MOCK_SETTINGS } from "../_mock";
import { makeMockProductList, makeMockReservations } from "../_mockReservations";
import PreviewProductsTab from "./PreviewProductsTab";
import PreviewStatsTab from "./PreviewStatsTab";
import PreviewBusinessSettingsTab from "./PreviewBusinessSettingsTab";
import PreviewOrderSettingsInfo from "./PreviewOrderSettingsInfo";
import PreviewReservationSettingsTab from "./PreviewReservationSettingsTab";
import SalesSettingsCoach from "../SalesSettingsCoach";
import PreviewMenuSettingsTab from "./PreviewMenuSettingsTab";
import MenuSettingsCoach from "../MenuSettingsCoach";
import PreviewMyInfoTab from "./PreviewMyInfoTab";
import MyInfoCoach from "../MyInfoCoach";
import PreviewDesignTab from "./PreviewDesignTab";
import DesignCoach from "../DesignCoach";
import BusinessCoach from "../BusinessCoach";
import StatsCoach from "../StatsCoach";
import ProductsCoach from "../ProductsCoach";
import PreviewReservationsTab from "./PreviewReservationsTab";
import ReservationsCoach from "../ReservationsCoach";
import DashboardCoach, { OWNER_SETTINGS_OPEN_EVENT } from "../DashboardCoach";

type Tab = "dashboard" | "reservations" | "products" | "stats" | "settlement" | "company" | "ordersettings" | "business" | "reservation" | "menusettings" | "settings" | "plan" | "myinfo";

// 아직 만들지 않은 탭 자리
function TabComingSoon({ label }: { label: string }) {
  return (
    <div className="bg-white -mx-4 md:mx-0 md:rounded-2xl py-20 px-6 text-center">
      <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-gold-500 mb-2">Coming soon</p>
      <p className="text-base font-semibold text-gray-900">{label} 미리보기를 준비하고 있어요</p>
    </div>
  );
}

// 사장님 화면 미리보기 — 실제 DashboardClient 복사본 (탭 내비게이션·레이아웃 동일). 데이터는 모두 목업
export default function PreviewDashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const themeVars = generateThemeVars(DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT);
  const consultEnabled = MOCK_SETTINGS.consult_enabled;
  // 미리보기에서 막아 둔 기능 안내 (2.5초 뒤 사라짐)
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  };
  // 탭 이동 — 정산·요금제·매장 정보는 미리보기에서 화면을 만들지 않고 안내만 띄운다
  const selectTab = (key: Tab) => {
    if (key === "settlement") return showNotice("실제 관리자 화면에서는 정산 페이지로 연결돼요.\n미리보기라 이동하지 않아요.");
    if (key === "plan") return showNotice("실제 관리자 화면에서는 요금제 페이지로 연결돼요.\n미리보기라 이동하지 않아요.");
    if (key === "company") return showNotice("실제 관리자 화면에서는 매장 정보 페이지로 연결돼요.\n미리보기라 이동하지 않아요.");
    // 설정 하위 화면(영업 설정·판매 설정 등)도 열지 않는다 — 대시보드 기능 현황의 '설정' 버튼 등에서 들어오는 경우 포함
    if (SETTINGS_CLOSED && settingsTabs.some((t) => t.key === key)) return showSettingsNotice();
    goTab(key);
  };
  // 탭 이동을 주소(?tab=)와 방문 기록에 남긴다 — 실제 관리자 화면과 같이 뒤로가기로 이전 탭에 돌아온다
  const goTab = (key: Tab) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    if (key === "dashboard") url.searchParams.delete("tab");
    else url.searchParams.set("tab", key);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  };
  // 주소의 탭 — 미리보기에서 열 수 있는 탭만 (정산·요금제·매장 정보·설정 화면은 막혀 있어 대시보드로)
  const OPEN_TABS: Tab[] = ["dashboard", "reservations", "products", "stats"];
  const tabFromUrl = (): Tab => {
    const v = new URLSearchParams(window.location.search).get("tab");
    return v && (OPEN_TABS as string[]).includes(v) ? (v as Tab) : "dashboard";
  };
  // 처음 열 때 주소의 탭으로, 뒤로가기·앞으로가기 때도 주소의 탭으로 맞춘다
  // (미리보기 페이지는 정적 페이지라 useSearchParams 대신 마운트 후 주소를 읽는다)
  useEffect(() => {
    setActiveTab(tabFromUrl());
    const onPop = () => setActiveTab(tabFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showGuideNotice = () => showNotice("실제 관리자 화면에서는 사용법 페이지로 연결돼요.\n미리보기라 이동하지 않아요.");
  // 미리보기 — 설정 메뉴는 열지 않고 안내만 띄운다 (설정 화면·설명은 나중에 가입 후 온보딩에서 쓸 예정이라 코드는 남겨 둔다)
  const SETTINGS_CLOSED = true;
  const showSettingsNotice = () => showNotice("실제 관리자 화면에서는 설정 메뉴가 열려요.\n미리보기라 이동하지 않아요.");

  // 목업 예약 (9~12월, 오늘 = 2026-11-10 고정) — 대시보드 요약과 예약 관리가 같은 데이터를 쓴다
  const [reservations, setReservations] = useState(() => makeMockReservations());
  const [reservationStatusFilter, setReservationStatusFilter] = useState<string | undefined>(undefined);
  // 한 번 연 예약 관리 탭은 숨기기만 하고 유지 (실제 화면과 같이 보던 달·펼친 예약이 남는다)
  const [reservationsOpened, setReservationsOpened] = useState(false);
  useEffect(() => { if (activeTab === "reservations") setReservationsOpened(true); }, [activeTab]);
  // 목업 상품 — 상품 관리 탭 (실제 화면처럼 항상 마운트해 두고 숨기기만 한다)
  const [products, setProducts] = useState(() => makeMockProductList());
  // 코치마크가 설정 하위 메뉴를 설명할 때 설정 메뉴를 펼친다
  useEffect(() => {
    const open = () => setShowSettingsDropdown(true);
    window.addEventListener(OWNER_SETTINGS_OPEN_EVENT, open);
    return () => window.removeEventListener(OWNER_SETTINGS_OPEN_EVENT, open);
  }, []);

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
  const activeLabel = [...mainTabs, ...settingsTabs].find((t) => t.key === activeTab)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={themeVars as React.CSSProperties}>
      <header className="border-b border-gray-200 bg-white shrink-0 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* 실제 화면은 매장 메뉴판으로 이동 — 미리보기는 눌러도 아무 반응 없는 글자 */}
          <span className="text-lg font-medium text-gray-900">
            {MOCK_COMPANY_NAME} — 관리자
          </span>
          {/* 미리보기라 로그아웃 대신 미리보기 처음으로 */}
          <Link href="/preview" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            로그아웃
          </Link>
        </div>
      </header>

      {/* 모바일 탭 내비게이션 */}
      <div className="md:hidden bg-white border-b border-gray-100 sticky top-[61px] z-30">
        {/* 메인 탭 행 */}
        <div className="flex overflow-x-auto no-scrollbar">
          {mainTabs.map((tab) => (
            <div
              key={tab.key}
              className={`overflow-hidden transition-all duration-300 shrink-0 ${tab.statsOnly && !consultEnabled ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[120px] opacity-100"}`}
            >
              <button
                data-coach={`own-tab-${tab.key}`}
                onClick={() => { selectTab(tab.key); setShowSettingsDropdown(false); }}
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
            onClick={() => (SETTINGS_CLOSED ? showSettingsNotice() : setShowSettingsDropdown((v) => !v))}
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
                data-coach={`own-tab-${tab.key}`}
                onClick={() => selectTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.key ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* 미리보기 — 사용법은 이동 대신 안내만, 공지사항은 뺀다 */}
            <button
              type="button"
              onClick={showGuideNotice}
              className="px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-gray-400 hover:text-gray-600 transition-colors"
            >
              사용법 →
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl w-full mx-auto px-4 py-6 gap-6">
        {/* 데스크탑 사이드 탭 */}
        {/* 데스크탑 사이드 메뉴 — 흰 패널로 감싸 회색 바탕과 구분 (오른쪽 콘텐츠 카드와 같은 모양) */}
        <nav className="hidden md:block w-48 shrink-0 self-start">
          <ul className="space-y-1 bg-white rounded-2xl p-2">
            {mainTabs.map((tab) => (
              <li
                key={tab.key}
                className={`overflow-hidden transition-all duration-300 ${tab.statsOnly && !consultEnabled ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}
              >
                <button
                  data-coach={`own-tab-${tab.key}`}
                  onClick={() => selectTab(tab.key)}
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
                onClick={() => (SETTINGS_CLOSED ? showSettingsNotice() : setShowSettingsDropdown((v) => !v))}
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
                        data-coach={`own-tab-${tab.key}`}
                        onClick={() => selectTab(tab.key)}
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
            {/* 미리보기 — 사용법은 이동 대신 안내만, 공지사항은 뺀다 */}
            <li>
              <button
                type="button"
                onClick={showGuideNotice}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                사용법
                <span className="text-sm font-semibold">→</span>
              </button>
            </li>
          </ul>
        </nav>

        <main className="flex-1 min-w-0 pb-24">
          {activeTab === "dashboard" && (
            <>
              <PreviewDashboardOverview
                reservations={reservations}
                onNavigate={(tab, statusFilter) => {
                  setReservationStatusFilter(statusFilter);
                  selectTab(tab as Tab);
                }}
              />
              <DashboardCoach />
            </>
          )}

          {reservationsOpened && (
            <div className={activeTab === "reservations" ? "" : "hidden"}>
              <PreviewReservationsTab
                // 대시보드 요약에서 상태 필터를 걸고 들어오면 새로 마운트해 필터를 적용
                key={reservationStatusFilter ?? "all"}
                allReservations={reservations}
                setAllReservations={setReservations}
                initialStatusFilter={reservationStatusFilter}
                onClearStatusFilter={() => setReservationStatusFilter(undefined)}
                onNotice={showNotice}
              />
              {activeTab === "reservations" && <ReservationsCoach />}
            </div>
          )}

          <div className={activeTab === "products" ? "" : "hidden"}>
            <PreviewProductsTab products={products} setProducts={setProducts} onNotice={showNotice} />
            {activeTab === "products" && <ProductsCoach />}
          </div>

          {activeTab === "stats" && (
            <>
              <PreviewStatsTab />
              <StatsCoach />
            </>
          )}

          {activeTab === "business" && (
            <>
              <PreviewBusinessSettingsTab onNotice={showNotice} />
              <BusinessCoach />
            </>
          )}

          {activeTab === "ordersettings" && <PreviewOrderSettingsInfo />}

          {activeTab === "reservation" && (
            <>
              <PreviewReservationSettingsTab onNotice={showNotice} onGoToOrderSettings={() => goTab("ordersettings")} />
              <SalesSettingsCoach />
            </>
          )}

          {activeTab === "menusettings" && (
            <>
              <PreviewMenuSettingsTab />
              <MenuSettingsCoach />
            </>
          )}

          {activeTab === "myinfo" && (
            <>
              <PreviewMyInfoTab onNotice={showNotice} />
              <MyInfoCoach />
            </>
          )}

          {activeTab === "settings" && (
            <>
              <PreviewDesignTab onNotice={showNotice} />
              <DesignCoach />
            </>
          )}

          {!["dashboard", "reservations", "products", "stats", "business", "ordersettings", "reservation", "menusettings", "myinfo", "settings"].includes(activeTab) && <TabComingSoon label={activeLabel} />}
        </main>
      </div>

      {/* 안내 토스트 — 아래 이동 바 위에 띄운다 */}
      {notice && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-sm px-4 py-3 rounded-2xl text-center text-[13px] leading-relaxed text-white shadow-xl whitespace-pre-line"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", background: "rgba(24,19,14,0.92)" }}
          role="status"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
