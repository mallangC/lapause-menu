"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  consult_enabled: boolean;
}

interface Reservation {
  id: string;
  company_id: string;
  created_at: string;
  desired_date: string;
  status: string;
  final_price: number;
}

interface Props {
  companies: Company[];
  reservations: Reservation[];
}

export default function OperatorDashboardClient({ companies, reservations }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 제작완료 + 픽업배송완료만 매출 계산에 사용
  const paidReservations = useMemo(() =>
    reservations.filter(r => r.status === "제작완료" || r.status === "픽업배송완료"),
  [reservations]);

  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const newThisMonth = companies.filter(c => new Date(c.created_at) >= thisMonthStart).length;
    const consultEnabledCount = companies.filter(c => c.consult_enabled).length;
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

    const totalGMV = paidReservations.reduce((sum, r) => sum + (r.final_price || 0), 0);
    const thisMonthGMV = paidReservations
      .filter(r => new Date(r.created_at) >= thisMonthStart)
      .reduce((sum, r) => sum + (r.final_price || 0), 0);

    return { totalCompanies, newThisMonth, activeCompanies, atRiskCount, totalGMV, thisMonthGMV, consultUsageRate };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, reservations, paidReservations]);

  // 최근 6개월 월별 GMV
  const monthlyGMV = useMemo(() => {
    const months: { label: string; key: string; gmv: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label: `${d.getMonth() + 1}월`, key, gmv: 0 });
    }
    for (const r of paidReservations) {
      const key = r.created_at.slice(0, 7);
      const m = months.find(m => m.key === key);
      if (m) m.gmv += r.final_price || 0;
    }
    return months;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidReservations]);

  // 가게별 현황
  const companyRows = useMemo(() => {
    const countMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};
    const thisMonthRevenueMap: Record<string, number> = {};
    const lastMap: Record<string, string> = {};

    for (const r of reservations) {
      if (!lastMap[r.company_id] || r.created_at > lastMap[r.company_id]) {
        lastMap[r.company_id] = r.created_at;
      }
      countMap[r.company_id] = (countMap[r.company_id] ?? 0) + 1;
    }
    for (const r of paidReservations) {
      revenueMap[r.company_id] = (revenueMap[r.company_id] ?? 0) + (r.final_price || 0);
      if (new Date(r.created_at) >= thisMonthStart) {
        thisMonthRevenueMap[r.company_id] = (thisMonthRevenueMap[r.company_id] ?? 0) + (r.final_price || 0);
      }
    }
    return companies.map(c => ({
      ...c,
      reservationCount: countMap[c.id] ?? 0,
      totalRevenue: revenueMap[c.id] ?? 0,
      thisMonthRevenue: thisMonthRevenueMap[c.id] ?? 0,
      lastReservationAt: lastMap[c.id] ?? null,
      isActive: lastMap[c.id] ? new Date(lastMap[c.id]) >= thirtyDaysAgo : false,
      isAtRisk: !!lastMap[c.id] && new Date(lastMap[c.id]) < sixtyDaysAgo,
      isInactive: !lastMap[c.id],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, reservations, paidReservations]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin");
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

  const formatMoney = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(1)}만` : `${n.toLocaleString()}`;

  const statCards = [
    { label: "전체 가게", value: `${stats.totalCompanies}`, sub: "누적 가입" },
    { label: "이번 달 신규", value: `${stats.newThisMonth}`, sub: "가입" },
    { label: "활성 가게", value: `${stats.activeCompanies}`, sub: "최근 30일" },
    { label: "이탈 위험", value: `${stats.atRiskCount}`, sub: "60일 이상 예약 없음", danger: stats.atRiskCount > 0 },
    { label: "누적 총 거래액", value: `${formatMoney(stats.totalGMV)}원`, sub: "취소 제외" },
    { label: "이번 달 거래액", value: `${formatMoney(stats.thisMonthGMV)}원`, sub: new Date().toLocaleDateString("ko-KR", { month: "long" }) },
    { label: "맞춤 주문 사용률", value: `${stats.consultUsageRate}%`, sub: `${companies.filter(c => c.consult_enabled).length}/${stats.totalCompanies} 가게` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-base font-medium text-gray-900">Flo Aide</span>
            <span className="ml-2 text-xs text-gray-400">운영자 대시보드</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, sub, danger }) => (
            <div key={label} className={`bg-white border rounded-2xl p-5 ${danger ? "border-red-200" : "border-gray-200"}`}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-semibold ${danger ? "text-red-500" : "text-gray-900"}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
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

        {/* 가게별 현황 */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-900">가게별 현황</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-left px-6 py-3 font-medium">가게명</th>
                  <th className="text-left px-6 py-3 font-medium">URL</th>
                  <th className="text-left px-6 py-3 font-medium">가입일</th>
                  <th className="text-right px-6 py-3 font-medium">총 예약</th>
                  <th className="text-right px-6 py-3 font-medium">누적 매출</th>
                  <th className="text-right px-6 py-3 font-medium">이번 달 매출</th>
                  <th className="text-left px-6 py-3 font-medium">맞춤 주문</th>
                  <th className="text-left px-6 py-3 font-medium">마지막 예약</th>
                  <th className="text-left px-6 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companyRows.map(c => (
                  <tr key={c.id} className={`transition-colors ${c.isAtRisk ? "bg-red-50/40 hover:bg-red-50" : c.isInactive ? "bg-gray-50/60 hover:bg-gray-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-3.5 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">/{c.slug}</td>
                    <td className="px-6 py-3.5 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-6 py-3.5 text-right text-gray-900 font-medium">{c.reservationCount}</td>
                    <td className="px-6 py-3.5 text-right text-gray-900 font-medium">{c.totalRevenue > 0 ? `${c.totalRevenue.toLocaleString()}원` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-3.5 text-right text-gray-700">{c.thisMonthRevenue > 0 ? `${c.thisMonthRevenue.toLocaleString()}원` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.consult_enabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                        {c.consult_enabled ? "ON" : "OFF"}
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
                        {c.isAtRisk ? "이탈위험" : c.isInactive ? "미활성" : c.isActive ? "활성" : "휴면"}
                      </span>
                    </td>
                  </tr>
                ))}
                {companyRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-300 text-sm">가입된 가게가 없습니다.</td>
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
