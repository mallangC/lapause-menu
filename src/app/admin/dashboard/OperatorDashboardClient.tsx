"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  settings: { consult_enabled: boolean } | null;
  subscription: { plan: "none" | "starter" | "pro" | "free" | null } | null;
}

interface Reservation {
  id: string;
  company_id: string;
  created_at: string;
  desired_date: string;
  status: string;
  final_price: number;
  payment_id: string | null;
}

interface Product {
  company_id: string;
}

interface Props {
  companies: Company[];
  reservations: Reservation[];
  products: Product[];
}

export default function OperatorDashboardClient({ companies, reservations, products }: Props) {
  const router = useRouter();
  const supabase = createClient();

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

    // Pro 플랜 사용 비율
    const proCount = companies.filter(c => c.subscription?.plan === "pro").length;
    const proRate = totalCompanies > 0 ? Math.round((proCount / totalCompanies) * 100) : 0;

    return { totalCompanies, newThisMonth, activeCompanies, atRiskCount, consultUsageRate, thisMonthReservations, totalCardGMV, thisMonthCardGMV, totalManualGMV, thisMonthManualGMV, totalAllGMV, thisMonthAllGMV, cardRate, proCount, proRate };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, reservations, revenueReservations, cardReservations]);

  // 최근 6개월 월별 GMV
  const monthlyGMV = useMemo(() => {
    const months: { label: string; key: string; gmv: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label: `${d.getMonth() + 1}월`, key, gmv: 0 });
    }
    for (const r of cardReservations) {
      const key = r.desired_date?.slice(0, 7);
      const m = months.find(m => m.key === key);
      if (m) m.gmv += r.final_price || 0;
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardReservations]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

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
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

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
              <p className="text-xs text-gray-400 mt-1">현장·계좌이체 등</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">사이트 결제 비율</p>
              <p className="text-xl font-semibold text-gold-600">{stats.cardRate}%</p>
              <p className="text-xs text-gray-400 mt-1">전체 대비</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">이번 달 전체</p>
              <p className="text-lg font-semibold text-gray-900">{formatMoney(stats.thisMonthAllGMV)}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">이번 달 사이트</p>
              <p className="text-lg font-semibold text-blue-600">{formatMoney(stats.thisMonthCardGMV)}원</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">이번 달 직접 추가</p>
              <p className="text-lg font-semibold text-gray-600">{formatMoney(stats.thisMonthManualGMV)}원</p>
            </div>
          </div>
        </div>

        {/* 월별 거래액 추이 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-6">월별 거래액 추이 (최근 6개월)</h2>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.subscription?.plan === "pro" ? "bg-gold-100 text-gold-600" : c.subscription?.plan === "free" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                        {c.subscription?.plan === "pro" ? "Pro" : c.subscription?.plan === "starter" ? "Starter" : c.subscription?.plan === "free" ? "Free" : "—"}
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

      </main>
    </div>
  );
}
