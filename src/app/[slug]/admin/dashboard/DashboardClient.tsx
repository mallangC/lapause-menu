"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product, ProductInput, ProductStatus } from "@/types";
import { Reservation } from "./reservations/types";
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
import PlanTab from "./PlanTab";
import DashboardOverviewTab from "./DashboardOverviewTab";

type Tab = "dashboard" | "reservations" | "products" | "stats" | "company" | "ordersettings" | "business" | "reservation" | "menusettings" | "settings" | "plan" | "myinfo";

interface Props {
  slug: string;
  userId: string;
  userEmail: string;
  isOAuth: boolean;
  profileName: string;
  profilePhone: string;
  companyId: string;
  companyName: string;
  logoImage: string | null;
  themeBg: string;
  themeAccent: string;
  initialProducts: Product[];
  homeFeaturedImage: string | null;
  homeAllImage: string | null;
  homeSeasonImage: string | null;
  homeConsultImage: string | null;
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
}


export default function DashboardClient({ slug, userId, userEmail, isOAuth, profileName, profilePhone, companyId, companyName, logoImage, themeBg, themeAccent, initialProducts, homeFeaturedImage, homeAllImage, homeSeasonImage, homeConsultImage, locationUrl, kakaoChannelUrl, instagramUrl, youtubeUrl, companyPhone, hiddenProductTypes, hiddenSeasons, consultEnabled, plan, subscriptionPlan, cancelAtPeriodEnd, trialEndsAt, planExpiresAt, hasBillingKey }: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "dashboard";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    document.body.style.overflow = (showForm || !!editingProduct) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, editingProduct]);

  useEffect(() => {
    setReservationsLoading(true);
    supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAllReservations((data as Reservation[]) ?? []);
        setReservationsLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const fetchReservations = async () => {
    setReservationsLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setAllReservations((data as Reservation[]) ?? []);
    setReservationsLoading(false);
  };


  const handleAdd = async (data: ProductInput) => {
    setError(null);
    const { data: newProduct, error: err } = await supabase
      .from("products")
      .insert({ ...data, company_id: companyId })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setProducts((prev) => [...prev, newProduct as Product]);
    setShowForm(false);
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
    setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? (updated as Product) : p)));
    setEditingProduct(null);
  };

  const handleStatusChange = async (id: string, status: ProductStatus) => {
    const { error: err } = await supabase.from("products").update({ status }).eq("id", id);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setError(null);
    const { error: err } = await supabase.from("products").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleConsultToggle = (enabled: boolean) => {
    setCurrentConsultEnabled(enabled);
    if (!enabled && activeTab === "stats") setActiveTab("reservations");
  };

  const mainTabs: { key: Tab; label: string; statsOnly?: boolean }[] = [
    { key: "dashboard", label: "대시보드" },
    { key: "reservations", label: "예약 관리" },
    { key: "products", label: "상품 관리" },
    { key: "stats", label: "통계", statsOnly: true },
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
      <header className="border-b border-gray-200 bg-white shrink-0 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${slug}`} className="text-lg font-medium text-gray-900 hover:text-gray-600 transition-colors">
            {companyName} — 관리자
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

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
                onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); setShowSettingsDropdown(false); }}
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
                onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); }}
                className={`px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.key ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl w-full mx-auto px-4 py-6 gap-6">
        {/* 데스크탑 사이드 탭 */}
        <nav className="hidden md:block w-44 shrink-0">
          <ul className="space-y-1">
            {mainTabs.map((tab) => (
              <li
                key={tab.key}
                className={`overflow-hidden transition-all duration-300 ${tab.statsOnly && !currentConsultEnabled ? "max-h-0 opacity-0" : "max-h-12 opacity-100"}`}
              >
                <button
                  onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key ? "bg-gold-500 text-white font-medium" : "text-gray-700 hover:bg-gold-500/50"
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
                  isSettingsTab ? "bg-gold-500 text-white font-medium" : "text-gray-700 hover:bg-gold-500/50"
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
                        onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                          activeTab === tab.key ? "bg-gold-100 text-gold-700 font-medium" : "text-gray-500 hover:bg-gold-500/30 hover:text-gray-700"
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
        {(showForm || editingProduct) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingProduct(null); } }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">{editingProduct ? "상품 수정" : "새 상품 추가"}</h3>
                <button
                  onClick={() => { setShowForm(false); setEditingProduct(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                {editingProduct
                  ? <ProductForm initialData={editingProduct} onSubmit={handleEdit} onCancel={() => setEditingProduct(null)} companyId={companyId} />
                  : <ProductForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} companyId={companyId} />
                }
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {activeTab === "dashboard" && (
            <DashboardOverviewTab
              companyId={companyId}
              slug={slug}
              plan={plan}
              onNavigate={(tab, statusFilter) => {
                setReservationStatusFilter(statusFilter);
                setActiveTab(tab as Tab);
              }}
            />
          )}

          {activeTab === "reservations" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <ReservationsTab
                companyId={companyId}
                allReservations={allReservations}
                setAllReservations={setAllReservations}
                loading={reservationsLoading}
                onRefresh={fetchReservations}
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
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900">상품 목록</h2>
                <button
                  onClick={() => products.length >= 500 ? setShowLimitModal(true) : setShowForm(true)}
                  className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors"
                >
                  + 상품 추가
                </button>
              </div>
              <ProductTable
                products={products}
                onEdit={(product) => { setEditingProduct(product); setShowForm(false); }}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                companyId={companyId}
              />
            </div>
          </div>

          {activeTab === "stats" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <StatsTab companyId={companyId} />
            </div>
          )}

          {activeTab === "company" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
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

          {activeTab === "ordersettings" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <OrderSettingsTab companyId={companyId} plan={plan} />
            </div>
          )}

          {activeTab === "business" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <BusinessSettingsTab companyId={companyId} />
            </div>
          )}

          {activeTab === "reservation" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <ReservationSettingsTab
                companyId={companyId}
                onConsultToggle={handleConsultToggle}
                onGoToOrderSettings={() => setActiveTab("ordersettings")}
              />
            </div>
          )}

          {activeTab === "menusettings" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <MenuSettingsTab
                companyId={companyId}
                initialHiddenProductTypes={currentHiddenProductTypes}
                initialHiddenSeasons={currentHiddenSeasons}
                onSave={(types, seasons) => {
                  setCurrentHiddenProductTypes(types);
                  setCurrentHiddenSeasons(seasons);
                }}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <SettingsTab
                companyId={companyId}
                initialBg={themeBg}
                initialAccent={themeAccent}
                initialFeaturedImage={homeFeaturedImage}
                initialAllImage={homeAllImage}
                initialSeasonImage={homeSeasonImage}
                initialConsultImage={homeConsultImage}
                consultEnabled={consultEnabled}
                onThemeChange={(bg, accent) => setThemeVars(generateThemeVars(bg, accent))}
              />
            </div>
          )}

          {activeTab === "plan" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <PlanTab
                companyId={companyId}
                customerName={profileName}
                plan={plan}
                subscriptionPlan={subscriptionPlan}
                cancelAtPeriodEnd={cancelAtPeriodEnd}
                trialEndsAt={trialEndsAt}
                planExpiresAt={planExpiresAt}
                hasBillingKey={hasBillingKey}
              />
            </div>
          )}

          {activeTab === "myinfo" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <MyInfoTab
                slug={slug}
                email={userEmail}
                isOAuth={isOAuth}
                profileName={profileName}
                profilePhone={profilePhone}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
