"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import SettlementsTab from "./SettlementsTab";
import VerificationTab, { type Application } from "./VerificationTab";
import OperatorBell, { type PendingApply } from "./OperatorBell";
import MyInfoTab from "@/app/[slug]/admin/dashboard/MyInfoTab";
import StoreManagementTab from "./StoreManagementTab";
import BillingLogsTab, { BillingLog } from "./BillingLogsTab";
import PromoCodesTab from "./PromoCodesTab";
import { ORDER_PATH_LABEL, type OrderPath } from "@/lib/trafficSource";
import { inquiryItems, type InquirySettings } from "@/lib/inquiryChecklist";
import ReservationLogsTab, { ReservationLog } from "./ReservationLogsTab";
import ConsultAnalyticsTab from "./ConsultAnalyticsTab";

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_id: string | null;
  operator_memo: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerUserId: string | null;
  isSuspended: boolean;
  suspendReason: string | null;
  is_demo?: boolean;
  /** 손님 문의 줄이기 판단에 쓰는 설정 (consult_enabled 포함) */
  settings: (InquirySettings & { consult_enabled: boolean }) | null;
  subscription: {
    plan: "none" | "monthly" | "annual" | "free" | null;
    billing_key: string | null;
    plan_expires_at: string | null;
    trial_ends_at: string | null;
    subscription_plan: string | null;
  } | null;
  /** 적용된 할인 코드 */
  promo: { code: string; summary: string; cyclesRemaining: number | null } | null;
}

interface Reservation {
  id: string;
  company_id: string;
  created_at: string;
  desired_date: string;
  status: string;
  final_price: number;
  payment_id: string | null;
  order_type: string | null;
  order_path: string | null;
}

interface Product {
  company_id: string;
}

interface Props {
  companies: Company[];
  reservations: Reservation[];
  products: Product[];
  billingLogs: BillingLog[];
  reservationLogs: ReservationLog[];
  /** 내 정보 — 운영자 본인 */
  me: { email: string; isOAuth: boolean; name: string; phone: string; twoFactorEnabled: boolean };
}

// 결제 경로 색 — 상품을 골라 결제(파랑 계열) · 첫 화면 대화/맞춤주문(금색 계열) · 링크결제(초록)
const ORDER_TYPE_COLORS: Record<string, string> = {
  장바구니: "#60a5fa",
  "상품 상세": "#93c5fd",
  "추천 주문": "#e0c48f",
  "사장님 스타일": "#c9a96e",
  "사진 주문": "#a87c4a",
  "첫 화면 사진": "#f0b46a",
  "맞춤주문(경로 없음)": "#d6d3d1",
  링크결제: "#34d399",
};
const PIE_COLORS = ["#c9a96e", "#60a5fa", "#34d399", "#a87c4a"];

export default function OperatorDashboardClient({ companies, reservations, products, billingLogs, reservationLogs, me }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "stores" | "billing" | "promoCodes" | "settlements" | "verification" | "reservationLogs" | "consultAnalytics" | "myinfo">("overview");

  // 알림 — 판매 신청(검토 중). 처리(승인·반려)하면 빠진다
  // 처음·1분마다·화면으로 돌아올 때 새로 받고, 검증 관리 탭에서 처리하면 바로 맞춘다
  const [pendingApplies, setPendingApplies] = useState<PendingApply[]>([]);
  const applyPending = (apps: Application[]) =>
    setPendingApplies(apps.filter((a) => a.consult_apply_status === "pending").map((a) => ({ company_id: a.company_id, name: a.companies?.name ?? "" })));
  const loadPending = async () => {
    try {
      const res = await fetch("/api/operator/consult-verify", { cache: "no-store" });
      if (res.ok) applyPending((await res.json()) as Application[]);
    } catch {
      /* 다음에 다시 */
    }
  };
  useEffect(() => {
    loadPending();
    const t = setInterval(loadPending, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") loadPending(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [gmvRange, setGmvRange] = useState<"month" | "6m" | "1y">("month");

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 미확인·취소 제외한 매출 기준 예약 (취소는 query에서 이미 제외됨)
  const revenueReservations = useMemo(() =>
    reservations.filter(r => r.status !== "미확인"),
  [reservations]);

  // 포트원 카드 결제만 (payment_id 있는 것, 미확인 제외)
  const cardReservations = useMemo(() =>
    revenueReservations.filter(r => !!r.payment_id),
  [revenueReservations]);

  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const newThisMonth = companies.filter(c => c.created_at.slice(0, 7) === thisMonthKey).length;
    const consultEnabledCount = companies.filter(c => c.settings?.consult_enabled).length;
    const consultUsageRate = totalCompanies > 0 ? Math.round((consultEnabledCount / totalCompanies) * 100) : 0;

    const activeCompanyIds = new Set(
      reservations.filter(r => new Date(r.created_at) >= thirtyDaysAgo).map(r => r.company_id)
    );
    const activeCompanies = activeCompanyIds.size;

    const lastReservationMap: Record<string, string> = {};
    for (const r of reservations) {
      if (!lastReservationMap[r.company_id] || r.created_at > lastReservationMap[r.company_id]) {
        lastReservationMap[r.company_id] = r.created_at;
      }
    }
    const atRiskCount = companies.filter(c => {
      const last = lastReservationMap[c.id];
      // 예약이 한 번도 없으면 이탈 위험 아님 (미활성)
      if (!last) return false;
      // 예약이 있었는데 60일 이상 없는 경우만 이탈 위험
      return new Date(last) < sixtyDaysAgo;
    }).length;

    // 전체 거래액 (미확인·취소 제외)
    const totalAllGMV = revenueReservations.reduce((sum, r) => sum + (r.final_price || 0), 0);
    const thisMonthAllGMV = revenueReservations
      .filter(r => r.desired_date?.slice(0, 7) === thisMonthKey)
      .reduce((sum, r) => sum + (r.final_price || 0), 0);

    // 사이트 카드 결제
    const totalCardGMV = cardReservations.reduce((sum, r) => sum + (r.final_price || 0), 0);
    const thisMonthCardGMV = cardReservations
      .filter(r => r.desired_date?.slice(0, 7) === thisMonthKey)
      .reduce((sum, r) => sum + (r.final_price || 0), 0);

    // 직접 추가 (payment_id 없는 것)
    const totalManualGMV = totalAllGMV - totalCardGMV;
    const thisMonthManualGMV = thisMonthAllGMV - thisMonthCardGMV;

    // 사이트 결제 비율
    const cardRate = totalAllGMV > 0 ? Math.round((totalCardGMV / totalAllGMV) * 100) : 0;

    const thisMonthReservations = reservations.filter(r => r.desired_date?.slice(0, 7) === thisMonthKey).length;

    // 유료 플랜 사용 비율
    const proCount = companies.filter(c => c.subscription?.plan === "monthly" || c.subscription?.plan === "annual").length;
    const proRate = totalCompanies > 0 ? Math.round((proCount / totalCompanies) * 100) : 0;

    return { totalCompanies, newThisMonth, activeCompanies, atRiskCount, consultUsageRate, thisMonthReservations, totalCardGMV, thisMonthCardGMV, totalManualGMV, thisMonthManualGMV, totalAllGMV, thisMonthAllGMV, cardRate, proCount, proRate };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, reservations, revenueReservations, cardReservations]);

  // 거래액 현황 - 선택 기간(월별/6개월/1년) 집계
  const periodStats = useMemo(() => {
    let cutoff: Date;
    let label: string;
    if (gmvRange === "month") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      label = "이번 달";
    } else if (gmvRange === "6m") {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      label = "최근 6개월";
    } else {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      label = "최근 1년";
    }
    const inRange = (r: Reservation) => r.desired_date && new Date(r.desired_date) >= cutoff;

    const allGMV = revenueReservations.filter(inRange).reduce((sum, r) => sum + (r.final_price || 0), 0);
    const cardGMV = cardReservations.filter(inRange).reduce((sum, r) => sum + (r.final_price || 0), 0);
    const manualGMV = allGMV - cardGMV;
    const cardRate = allGMV > 0 ? Math.round((cardGMV / allGMV) * 100) : 0;

    return { label, allGMV, cardGMV, manualGMV, cardRate };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmvRange, revenueReservations, cardReservations]);

  // 손님 문의 줄이기 활용도 — 구독 중(무료 포함)인 실제 매장 기준, 기능별로 켠 매장 비율 (사장님 체크리스트와 같은 기준)
  const inquiryAdoption = useMemo(() => {
    const target = companies.filter((c) => !c.is_demo && c.subscription?.plan && c.subscription.plan !== "none" && c.settings);
    const rows = new Map<string, { label: string; on: number; partial: number; off: number; stale: number }>();
    for (const c of target) {
      for (const it of inquiryItems(c.settings!)) {
        const r = rows.get(it.key) ?? { label: it.label, on: 0, partial: 0, off: 0, stale: 0 };
        if (it.on) r.on += 1;
        else if (it.off) r.off += 1;
        else if (it.progress && it.progress[0] > 0) r.partial += 1;
        // 오늘 꽃 색상 — 켜 놓고 오늘 고르지 않음 (귀찮아서 안 쓰는 신호)
        else if (it.key === "colors") r.stale += 1;
        rows.set(it.key, r);
      }
    }
    return { total: target.length, rows: [...rows.values()] };
  }, [companies]);

  // 결제 경로별 비율 — 세부 경로(order_path)로: 장바구니 · 상품 상세 · 추천 주문 · 사장님 스타일 · 사진 주문 · 링크결제
  // (order_type이 없는 건 = 관리자가 직접 추가한 예약 등, 이 통계 대상이 아님 · 세부 경로가 없던 예전 건은 큰 분류로)
  const orderTypeData = useMemo(() => {
    const FALLBACK: Record<string, string> = { product: "장바구니", consult: "맞춤주문(경로 없음)", link: "링크결제" };
    const map: Record<string, number> = {};
    for (const r of cardReservations) {
      if (!r.order_type || !FALLBACK[r.order_type]) continue;
      if (r.order_path === "manual") continue;
      const name = (r.order_path && ORDER_PATH_LABEL[r.order_path as OrderPath]) || FALLBACK[r.order_type];
      map[name] = (map[name] ?? 0) + 1;
    }
    // 많은 순
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardReservations]);

  // 월별 GMV 추이 (기간 선택: 6개월/1년)
  const [trendRange, setTrendRange] = useState<6 | 12>(6);
  const monthlyGMV = useMemo(() => {
    const months: { label: string; key: string; gmv: number }[] = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label: trendRange === 12 ? `${d.getFullYear() % 100}.${d.getMonth() + 1}` : `${d.getMonth() + 1}월`, key, gmv: 0 });
    }
    for (const r of cardReservations) {
      const key = r.desired_date?.slice(0, 7);
      const m = months.find(m => m.key === key);
      if (m) m.gmv += r.final_price || 0;
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardReservations, trendRange]);

  // 매장별 현황
  const companyRows = useMemo(() => {
    const countMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};
    const thisMonthRevenueMap: Record<string, number> = {};
    const lastMap: Record<string, string> = {};
    const productCountMap: Record<string, number> = {};

    for (const p of products) {
      productCountMap[p.company_id] = (productCountMap[p.company_id] ?? 0) + 1;
    }
    for (const r of reservations) {
      if (!lastMap[r.company_id] || r.created_at > lastMap[r.company_id]) {
        lastMap[r.company_id] = r.created_at;
      }
      countMap[r.company_id] = (countMap[r.company_id] ?? 0) + 1;
    }
    for (const r of revenueReservations) {
      revenueMap[r.company_id] = (revenueMap[r.company_id] ?? 0) + (r.final_price || 0);
      if (r.desired_date?.slice(0, 7) === thisMonthKey) {
        thisMonthRevenueMap[r.company_id] = (thisMonthRevenueMap[r.company_id] ?? 0) + (r.final_price || 0);
      }
    }
    return companies.map(c => ({
      ...c,
      productCount: productCountMap[c.id] ?? 0,
      reservationCount: countMap[c.id] ?? 0,
      totalRevenue: revenueMap[c.id] ?? 0,
      thisMonthRevenue: thisMonthRevenueMap[c.id] ?? 0,
      lastReservationAt: lastMap[c.id] ?? null,
      isActive: lastMap[c.id] ? new Date(lastMap[c.id]) >= thirtyDaysAgo : false,
      isAtRisk: !!lastMap[c.id] && new Date(lastMap[c.id]) < sixtyDaysAgo,
      isInactive: !lastMap[c.id],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, reservations, revenueReservations, cardReservations, products]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatMoney = (n: number) => {
    const man = n / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}만`;
  };

  const companyStatCards = [
    { label: "전체 매장", value: `${stats.totalCompanies}`, sub: "누적 가입" },
    { label: "이번 달 신규", value: `${stats.newThisMonth}`, sub: "가입" },
    { label: "활성 매장", value: `${stats.activeCompanies}`, sub: "최근 30일" },
    { label: "이탈 위험", value: `${stats.atRiskCount}`, sub: "60일 이상 예약 없음", danger: stats.atRiskCount > 0 },
    { label: "Pro 사용률", value: `${stats.proRate}%`, sub: `${stats.proCount}/${stats.totalCompanies} 매장` },
    { label: "이번 달 예약 수", value: `${stats.thisMonthReservations}`, sub: new Date().toLocaleDateString("ko-KR", { month: "long" }) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
            <span className="ml-2 text-xs text-gray-400">운영자 대시보드</span>
          </div>
          {/* 알림 · 내 정보 (로그아웃은 내 정보 안에) */}
          <div className="flex items-center gap-1.5">
            <OperatorBell pending={pendingApplies} onOpen={() => setActiveTab("verification")} />
            <button
              type="button"
              onClick={() => setActiveTab("myinfo")}
              aria-label="내 정보"
              title="내 정보"
              className={`p-1 rounded-full transition-colors ${activeTab === "myinfo" ? "text-gray-900 bg-gray-100" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200">
          {([
            { key: "overview", label: "현황" },
            { key: "stores", label: "매장 관리" },
            { key: "billing", label: "결제 이력" },
            { key: "promoCodes", label: "할인 코드" },
            { key: "settlements", label: "정산 관리" },
            { key: "verification", label: "검증 관리" },
            { key: "reservationLogs", label: "예약 로그" },
            { key: "consultAnalytics", label: "맞춤주문 분석" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <a
            href="/announcements"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px border-transparent text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            공지사항 <span className="text-xs">↗</span>
          </a>
        </div>

        {activeTab === "stores" && (
          <StoreManagementTab
            stores={companies.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              ownerName: c.ownerName,
              ownerPhone: c.ownerPhone,
              ownerUserId: c.ownerUserId,
              isSuspended: c.isSuspended,
              suspendReason: c.suspendReason,
              operatorMemo: c.operator_memo,
              plan: c.subscription?.plan ?? null,
              billingKey: c.subscription?.billing_key ?? null,
              planExpiresAt: c.subscription?.plan_expires_at ?? null,
              trialEndsAt: c.subscription?.trial_ends_at ?? null,
              subscriptionPlan: c.subscription?.subscription_plan ?? null,
              promo: c.promo,
            }))}
          />
        )}

        {activeTab === "billing" && (
          <BillingLogsTab logs={billingLogs} />
        )}

        {activeTab === "promoCodes" && <PromoCodesTab />}

        {activeTab === "settlements" && (
          <SettlementsTab companies={companies} />
        )}

        {activeTab === "verification" && (
          <VerificationTab onApplications={applyPending} />
        )}

        {activeTab === "reservationLogs" && (
          <ReservationLogsTab logs={reservationLogs} />
        )}

        {activeTab === "myinfo" && (
          <MyInfoTab
            loginPath="/login"
            email={me.email}
            isOAuth={me.isOAuth}
            profileName={me.name}
            profilePhone={me.phone}
            initialTwoFactorEnabled={me.twoFactorEnabled}
          />
        )}

        {activeTab === "consultAnalytics" && (
          <ConsultAnalyticsTab companies={companies} />
        )}

        {activeTab === "overview" && (<>

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {companyStatCards.map(({ label, value, sub, danger }) => (
            <div key={label} className={`bg-white border rounded-2xl p-5 ${danger ? "border-red-200" : "border-gray-200"}`}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-semibold ${danger ? "text-red-500" : "text-gray-900"}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* 거래액 통계 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">거래액 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">전체 누적</p>
              <p className="text-xl font-semibold text-gray-900">{formatMoney(stats.totalAllGMV)}원</p>
              <p className="text-xs text-gray-400 mt-1">취소 제외</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">사이트 결제</p>
              <p className="text-xl font-semibold text-blue-600">{formatMoney(stats.totalCardGMV)}원</p>
              <p className="text-xs text-gray-400 mt-1">카드 결제 누적</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">직접 추가</p>
              <p className="text-xl font-semibold text-gray-600">{formatMoney(stats.totalManualGMV)}원</p>
              <p className="text-xs text-gray-400 mt-1">현장·무통장 입금 등</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">사이트 결제 비율</p>
              <p className="text-xl font-semibold text-gold-600">{stats.cardRate}%</p>
              <p className="text-xs text-gray-400 mt-1">전체 대비</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{periodStats.label} 거래액</p>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {([
                  { key: "month", label: "월별" },
                  { key: "6m", label: "6개월" },
                  { key: "1y", label: "1년" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setGmvRange(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      gmvRange === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">전체</p>
                <p className="text-lg font-semibold text-gray-900">{formatMoney(periodStats.allGMV)}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">사이트 결제</p>
                <p className="text-lg font-semibold text-blue-600">{formatMoney(periodStats.cardGMV)}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">직접 추가</p>
                <p className="text-lg font-semibold text-gray-600">{formatMoney(periodStats.manualGMV)}원</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">사이트 결제 비율</p>
                <p className="text-lg font-semibold text-gold-600">{periodStats.cardRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 결제 경로별 비율 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-1">결제 경로별 비율</h2>
          <p className="text-xs text-gray-400 mb-4">사이트 결제(카드) 건 기준 — 관리자가 직접 추가한 예약은 제외</p>
          {orderTypeData.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={orderTypeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {orderTypeData.map((entry, i) => (
                    <Cell key={i} fill={ORDER_TYPE_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => {
                    const total = orderTypeData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(0) : 0;
                    return [`${Number(v)}건 (${pct}%)`];
                  }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(value) => <span style={{ color: "#555" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 손님 문의 줄이기 활용도 — 기능별로 몇 % 매장이 켰는지 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-1">손님 문의 줄이기 활용도</h2>
          <p className="text-xs text-gray-400 mb-4">구독 중인 매장 {inquiryAdoption.total}곳 기준 (데모 제외) · 사장님 대시보드 체크리스트와 같은 기준</p>
          {inquiryAdoption.total === 0 ? (
            <p className="text-sm text-gray-300 text-center py-8">데이터 없음</p>
          ) : (
            <div className="space-y-3">
              {[...inquiryAdoption.rows].sort((a, b) => a.on - b.on).map((r) => {
                const pct = Math.round((r.on / inquiryAdoption.total) * 100);
                const notes = [
                  r.partial > 0 ? `하나만 한 곳 ${r.partial}` : "",
                  r.stale > 0 ? `활성화 후 오늘 선택 안함 ${r.stale}` : "",
                  r.off > 0 ? `비활성화 ${r.off}` : "",
                ].filter(Boolean);
                return (
                  <div key={r.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-700 truncate">{r.label}</span>
                      <span className={`shrink-0 tabular-nums font-medium ${pct < 40 ? "text-red-500" : "text-gray-900"}`}>
                        {pct}% <span className="text-xs font-normal text-gray-400">({r.on}/{inquiryAdoption.total})</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${pct < 40 ? "bg-red-300" : "bg-gold-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    {notes.length > 0 && <p className="mt-1 text-[11px] text-gray-400">{notes.join(" · ")}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 월별 거래액 추이 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-gray-900">월별 거래액 추이</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {([6, 12] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    trendRange === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r === 6 ? "6개월" : "1년"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyGMV} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toLocaleString()}원`, "거래액"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="gmv" fill="#c9a96e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 매장별 현황 */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">매장별 현황</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">매장명</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">URL</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">가입일</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">상품 수</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">총 예약</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">누적 매출</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">이번 달 매출</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">플랜</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">맞춤 주문</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">마지막 예약</th>
                  <th className="text-left px-6 py-3 font-medium whitespace-nowrap">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companyRows.map(c => (
                  <tr key={c.id} className={`transition-colors ${c.isAtRisk ? "bg-red-50/40 hover:bg-red-50" : c.isInactive ? "bg-gray-50/60 hover:bg-gray-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-3.5 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-6 py-3.5 text-xs">
                      <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 hover:underline transition-colors">
                        /{c.slug}
                      </a>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-6 py-3.5 text-right text-gray-900 font-medium">{c.productCount}</td>
                    <td className="px-6 py-3.5 text-right text-gray-900 font-medium">{c.reservationCount}</td>
                    <td className="px-6 py-3.5 text-right text-gray-900 font-medium whitespace-nowrap">{c.totalRevenue > 0 ? `${formatMoney(c.totalRevenue)}원` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700 whitespace-nowrap">{c.thisMonthRevenue > 0 ? `${formatMoney(c.thisMonthRevenue)}원` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.subscription?.plan === "annual" ? "bg-gold-100 text-gold-600" : c.subscription?.plan === "monthly" ? "bg-blue-50 text-blue-600" : c.subscription?.plan === "free" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {c.subscription?.plan === "annual" ? "연간" : c.subscription?.plan === "monthly" ? "월간" : c.subscription?.plan === "free" ? "Free" : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.settings?.consult_enabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                        {c.settings?.consult_enabled ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {c.lastReservationAt ? formatDate(c.lastReservationAt) : <span className="text-gray-300">없음</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.isAtRisk ? "bg-red-50 text-red-500" :
                        c.isInactive ? "bg-gray-100 text-gray-400" :
                        c.isActive ? "bg-green-50 text-green-700" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        <span className="whitespace-nowrap">{c.isAtRisk ? "이탈위험" : c.isInactive ? "미활성" : c.isActive ? "활성" : "휴면"}</span>
                      </span>
                    </td>
                  </tr>
                ))}
                {companyRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-10 text-center text-gray-300 text-sm">가입된 매장이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        </>)}

      </main>
    </div>
  );
}
