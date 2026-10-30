"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import TrafficStats from "./TrafficStats";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";

interface Props {
  companyId: string;
  /** 예약이 바뀔 때마다 증가 — 탭을 다시 열 때는 재조회하지 않고 바뀌었을 때만 다시 집계 */
  refreshKey: number;
}

// get_company_stats RPC 결과 (supabase/migrations/20261028_get_company_stats.sql)
interface CompanyStats {
  monthly: { ym: string; revenue: number; count: number }[];
  channels: { name: string; value: number }[];
  types: { name: string; value: number }[];
  deliveries: { name: string; value: number }[];
  visits: { uniqueCustomers: number; withProfile: number; unknown: number };
  hourly: { all: number[]; recent: number[] };
  weekday: { all: number[]; recent: number[] };
  timeTotals: { all: number; recent: number };
  bestSellers: { name: string; count: number; revenue: number; productId: string | null; imageUrl: string | null }[];
  topCustomers: { name: string; phone: string; total: number; count: number }[];
  purposes: { name: string; value: number }[];
  options: { total: number; bag: number; card: number; preservative: number };
  budgets: Record<string, number>;
}

const EMPTY_STATS: CompanyStats = {
  monthly: [], channels: [], types: [], deliveries: [],
  visits: { uniqueCustomers: 0, withProfile: 0, unknown: 0 },
  hourly: { all: new Array(24).fill(0), recent: new Array(24).fill(0) },
  weekday: { all: new Array(7).fill(0), recent: new Array(7).fill(0) },
  timeTotals: { all: 0, recent: 0 },
  bestSellers: [], topCustomers: [], purposes: [],
  options: { total: 0, bag: 0, card: 0, preservative: 0 },
  budgets: {},
};

const BUDGET_LABELS = ["1~5만원", "6~10만원", "11~15만원", "16~20만원", "21~25만원", "26~30만원", "31만원 이상", "기타"];

const GOLD = "#c9a96e";
const COLORS = ["#c9a96e", "#a87c4a", "#e8c99a", "#8b6035", "#f0ddb8", "#7a4f28"];
const CHANNEL_COLORS: Record<string, string> = {
  네이버: "#03C75A",
  카카오: "#FEE500",
  워크인: "#fb923c",
  기타: "#d1d5db",
};
const DELIVERY_COLORS: Record<string, string> = {
  픽업: "#c9a96e",
  배송: "#c9a96e",
};
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const STANDARD_PURPOSES = ["기념", "축하", "감사", "위로", "데이트"];

// 상품 유형별 고정 색상 — 순위가 바뀌어도(항목 수가 늘어나도) 같은 이름은 항상 같은 색을 쓰도록 이름 기준으로 고정
const TYPE_COLORS: Record<string, string> = {
  꽃다발: "#c9a96e",
  꽃바구니: "#6ea8fe",
  센터피스: "#fb923c",
  화병꽂이: "#8b5cf6",
  식물: "#2dbb6e",
  조화: "#f472b6",
  기타: "#9ca3af",
  미지정: "#9ca3af",
};
function colorForType(name: string): string {
  if (TYPE_COLORS[name]) return TYPE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function StatCard({ label, value, sub, tone, trend }: { label: string; value: string; sub?: string; tone?: "up" | "down"; trend?: { text: string; tone: "up" | "down" | "flat" } }) {
  const valueColor = tone === "up" ? "text-green-600" : tone === "down" ? "text-red-500" : "text-gray-900";
  const trendColor = trend?.tone === "up" ? "text-green-600" : trend?.tone === "down" ? "text-red-500" : "text-gray-400";
  return (
    <div className="bg-white py-3 px-4 md:px-5 md:rounded-2xl">
      <p className="text-xs text-gray-400">{label}{sub && <span className="ml-1.5 text-gray-300">· {sub}</span>}</p>
      <p className={`text-base md:text-2xl font-semibold truncate mt-1 ${valueColor}`}>{value}</p>
      {trend && <p className={`text-xs font-medium whitespace-nowrap mt-1 ${trendColor}`}>{trend.text}</p>}
    </div>
  );
}

export default function StatsTab({ companyId, refreshKey }: Props) {
  const [stats, setStats] = useState<CompanyStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [hourRange, setHourRange] = useState<"all" | "recent">("all");
  const [timeDimension, setTimeDimension] = useState<"hour" | "weekday">("hour");
  const supabase = createClient();

  // 결제 완료 예약 전체를 내려받던 것을 DB 집계(RPC)로 대체 — 결과만 받아온다
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_company_stats", { p_company_id: companyId });
      if (error) console.error("[StatsTab] 통계 집계 실패:", error.message);
      setStats({ ...EMPTY_STATS, ...((data as Partial<CompanyStats> | null) ?? {}) });
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, refreshKey]);

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  const monthKey = (year: number, month0: number) => {
    const d = new Date(year, month0, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const byMonth = useMemo(() => new Map(stats.monthly.map((m) => [m.ym, m])), [stats.monthly]);
  const revenueOf = (key: string) => byMonth.get(key)?.revenue ?? 0;
  const countOf = (key: string) => byMonth.get(key)?.count ?? 0;

  // 이번 달 요약
  const thisMonthKey = monthKey(thisYear, thisMonth);
  const lastMonthKey = monthKey(thisYear, thisMonth - 1);
  const totalRevenue = revenueOf(thisMonthKey);
  const thisMonthCount = countOf(thisMonthKey);
  const lastMonthRevenue = revenueOf(lastMonthKey);
  const lastMonthCount = countOf(lastMonthKey);
  const revenueGrowth = (() => {
    if (lastMonthRevenue > 0) return Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    if (totalRevenue > 0) return null; // 전월 매출 0원 → 비율로 표현 불가, "신규"로 표시
    return 0;
  })();
  const countDiff = thisMonthCount - lastMonthCount;

  // 최근 6개월 월별 매출
  const monthlyData = useMemo(() => {
    const result: { month: string; 매출: number; 건수: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const key = monthKey(thisYear, thisMonth - i);
      result.push({ month: `${d.getMonth() + 1}월`, 매출: revenueOf(key), 건수: countOf(key) });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byMonth, thisYear, thisMonth]);

  // 전년 대비 월별 매출 비교 (12개월 전체, 다가올 달의 작년 실적을 미리 확인하기 위함)
  const yearlyComparisonData = useMemo(() => {
    const result: { month: string; 올해: number; 작년: number; growth: number | null }[] = [];
    for (let m = 1; m <= 12; m++) {
      const thisYearRevenue = revenueOf(monthKey(thisYear, m - 1));
      const lastYearRevenue = revenueOf(monthKey(thisYear - 1, m - 1));
      const growth = lastYearRevenue > 0 ? Math.round(((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100) : null;
      result.push({ month: `${m}월`, 올해: thisYearRevenue, 작년: lastYearRevenue, growth });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byMonth, thisYear]);

  const channelData = stats.channels;
  const typeData = stats.types;
  const deliveryData = stats.deliveries;

  // 신규 / 재방문 비율 (예약 건수 기준) — 신규: 고유 고객 수, 재방문: 첫 방문을 제외한 건수
  const visitData = {
    newCount: stats.visits.uniqueCustomers,
    returnCount: stats.visits.withProfile - stats.visits.uniqueCustomers,
    unknown: stats.visits.unknown,
    total: stats.visits.withProfile,
  };

  // 시간대별 / 요일별 주문 비율 (전체 또는 최근 3개월)
  const timeTotal = hourRange === "recent" ? stats.timeTotals.recent : stats.timeTotals.all;
  const toRate = (count: number) => (timeTotal > 0 ? Math.round((count / timeTotal) * 1000) / 10 : 0);
  const hourlyData = (hourRange === "recent" ? stats.hourly.recent : stats.hourly.all)
    .map((count, hour) => ({ hour: `${hour}시`, 비율: toRate(count) }));
  const weekdayData = (hourRange === "recent" ? stats.weekday.recent : stats.weekday.all)
    .map((count, day) => ({ day: WEEKDAY_LABELS[day], 비율: toRate(count) }));

  // 베스트셀러 Top 5 (상품명 기준) — 썸네일 이미지도 집계 결과에 포함
  const bestSellerData = stats.bestSellers;
  const productImages: Record<string, string | null> = Object.fromEntries(
    stats.bestSellers.filter((p) => p.productId).map((p) => [p.productId as string, p.imageUrl])
  );

  // 단골 고객 TOP 5 (총 결제액 기준, customer_profile_id가 없으면 전화번호로 집계)
  const topCustomersData = stats.topCustomers;

  // 선물 목적 비율 (맞춤주문에서 선물 목적을 선택한 건만 집계)
  const purposeData = {
    total: stats.purposes.reduce((sum, p) => sum + p.value, 0),
    items: stats.purposes,
  };

  // 옵션 추가 비율 (쇼핑백/메시지카드/생화 수명연장제를 실제로 "추가"한 비율 — 서비스/없음/미포함은 제외)
  const optionRateData = {
    total: stats.options.total,
    items: [
      { name: "쇼핑백", value: stats.options.bag },
      { name: "메시지카드", value: stats.options.card },
      { name: "생화 수명연장제", value: stats.options.preservative },
    ],
  };

  // 예산대별 분포 (맞춤주문)
  const budgetData = {
    total: Object.values(stats.budgets).reduce((sum, v) => sum + v, 0),
    items: BUDGET_LABELS.filter((label) => (stats.budgets[label] ?? 0) > 0)
      .map((label) => ({ name: label, value: stats.budgets[label] })),
  };

  // 평균 객단가 추이 (최근 6개월, 배송비 제외)
  const avgPriceMonthlyData = monthlyData.map((m) => ({ month: m.month, 평균: m.건수 > 0 ? Math.round(m.매출 / m.건수) : 0 }));

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-medium text-gray-900">통계</h2>

      {/* 이번 달 요약 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">이번 달 요약</h3>
        <div className="grid grid-cols-2 gap-2 -mx-4 md:mx-0 md:gap-3">
          <StatCard
            label="총 매출"
            value={`${totalRevenue.toLocaleString()}원`}
            sub={thisMonthKey.replace("-", "년 ") + "월"}
            trend={
              revenueGrowth === null
                ? { text: "신규", tone: "up" }
                : { text: `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%`, tone: revenueGrowth > 0 ? "up" : revenueGrowth < 0 ? "down" : "flat" }
            }
          />
          <StatCard
            label="예약 건수"
            value={`${thisMonthCount}건`}
            trend={{
              text: countDiff === 0 ? "전월과 동일" : `${countDiff > 0 ? "+" : ""}${countDiff}건`,
              tone: countDiff > 0 ? "up" : countDiff < 0 ? "down" : "flat",
            }}
          />
        </div>
      </section>

      {/* 월별 매출 추이 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">월별 매출 추이 (최근 6개월)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={32}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString()}원`, "매출"]}
                contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }}
              />
              <Bar dataKey="매출" radius={[6, 6, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === 5 ? GOLD : "#ede8e0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 전년 대비 월별 매출 비교 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">전년 대비 월별 매출</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearlyComparisonData} barSize={10} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="작년" fill="#e8c99a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="올해" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 시간대별 / 요일별 주문 비율 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">주문 시간 분포</h3>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex rounded-full bg-gray-100 p-0.5 text-xs">
              {([
                { key: "hour", label: "시간대별" },
                { key: "weekday", label: "요일별" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeDimension(key)}
                  className={`px-3 py-1 rounded-full transition-colors font-medium ${
                    timeDimension === key ? "bg-gold-500 text-white shadow-sm" : "text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-gray-100 p-0.5 text-xs">
              {([
                { key: "all", label: "전체" },
                { key: "recent", label: "최근 3개월" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setHourRange(key)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    hourRange === key ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {timeDimension === "hour" ? (
              <LineChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "비율"]}
                  contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }}
                />
                <Line type="linear" dataKey="비율" stroke={GOLD} strokeWidth={2} dot={{ r: 2, fill: GOLD }} activeDot={{ r: 4 }} />
              </LineChart>
            ) : (
              <BarChart data={weekdayData} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "비율"]}
                  contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }}
                />
                <Bar dataKey="비율" radius={[6, 6, 0, 0]} fill={GOLD} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* 채널별 / 상품 유형 순위 */}
      {/* 유입 분석 — 채널별 방문·주문·전환율, 주문 경로별 */}
      <TrafficStats companyId={companyId} refreshKey={refreshKey} />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 md:mb-4">채널별 비율</h3>
          {channelData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="42%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={CHANNEL_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => { const total = channelData.reduce((s, d) => s + d.value, 0); const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(0) : 0; return [`${Number(v)}건 (${pct}%)`]; }} contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(value) => <span style={{ color: "#555" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 md:mb-4">상품 유형 순위</h3>
          {typeData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="42%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={colorForType(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => { const total = typeData.reduce((s, d) => s + d.value, 0); const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(0) : 0; return [`${Number(v)}건 (${pct}%)`]; }} contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} formatter={(value) => <span style={{ color: "#555" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 수령 방법 + 선물 목적 비율 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">수령 방법</h3>
          {deliveryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            (() => {
              const total = deliveryData.reduce((s, d) => s + d.value, 0);
              return deliveryData.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{item.value}건 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DELIVERY_COLORS[item.name] ?? GOLD }} />
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">선물 목적 비율 <span className="text-xs text-gray-300 font-normal">(맞춤주문)</span></h3>
          {purposeData.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            purposeData.items.map((item) => {
              const pct = purposeData.total > 0 ? Math.round((item.value / purposeData.total) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">{item.value}건 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 신규 / 재방문 비율 + 옵션 추가 비율 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-stretch">
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500">신규 / 재방문 비율</h3>
          {visitData.total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            <>
              {[
                { label: "신규 고객", count: visitData.newCount, color: GOLD },
                { label: "재방문 고객", count: visitData.returnCount, color: GOLD },
              ].map(({ label, count, color }) => {
                const pct = visitData.total > 0 ? Math.round((count / visitData.total) * 100) : 0;
                return (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{count}명 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 pt-1">
                전체 {visitData.total}명{visitData.unknown > 0 && ` · 미집계 ${visitData.unknown}건`}
              </p>
            </>
          )}
        </div>

        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500">옵션 추가 비율 <span className="text-xs text-gray-300 font-normal">(맞춤주문)</span></h3>
          {optionRateData.total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            <>
              {optionRateData.items.map(({ name, value }) => {
                const pct = optionRateData.total > 0 ? Math.round((value / optionRateData.total) * 100) : 0;
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{name}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{value}건 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 pt-1">전체 {optionRateData.total}건 기준</p>
            </>
          )}
        </div>
      </section>

      {/* 예산대별 분포 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">예산대별 분포 <span className="text-xs text-gray-300 font-normal">(맞춤주문)</span></h3>
          {budgetData.items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            budgetData.items.map((item) => {
              const pct = budgetData.total > 0 ? Math.round((item.value / budgetData.total) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">{item.value}건 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 평균 객단가 추이 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:px-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">평균 객단가 추이 (최근 6개월)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={avgPriceMonthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : `${v}`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString()}원`, "평균 객단가"]}
                contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }}
              />
              <Line type="linear" dataKey="평균" stroke={GOLD} strokeWidth={2} dot={{ r: 3, fill: GOLD }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 베스트셀러 Top 5 (이미지 포함, 전체 너비) */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">베스트셀러 Top 5</h3>
          {bestSellerData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            bestSellerData.map((item, i) => {
              const max = bestSellerData[0].count;
              const imageUrl = item.productId ? productImages[item.productId] : null;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{item.name}</span>
                  <div className="w-16 sm:w-28 bg-gray-100 rounded-full h-2 overflow-hidden shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${(item.count / max) * 100}%`, backgroundColor: GOLD }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-10 text-right shrink-0">{item.count}건</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 단골 고객 TOP 5 */}
      <section>
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500">단골 고객 TOP 5 <span className="text-xs text-gray-300 font-normal">(2회 이상 주문, 총 결제액 기준)</span></h3>
          {topCustomersData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          ) : (
            topCustomersData.map((item, i) => (
              <div key={`${item.name}-${item.phone}`} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.phone || "번호 없음"} · {item.count}회 주문</p>
                </div>
                <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{item.total.toLocaleString()}원</span>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
