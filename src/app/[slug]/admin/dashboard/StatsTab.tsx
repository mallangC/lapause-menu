"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";

interface Props {
  companyId: string;
}

interface Reservation {
  status: string;
  final_price: number | null;
  delivery_fee: number | null;
  desired_date: string;
  channel: string | null;
  items: Array<{
    type: string;
    name?: string;
    price: number;
    product_id?: string | null;
    shopping_bag?: string | null;
    message_card?: string | null;
    preservative?: string | null;
  }> | null;
  delivery_type: string;
  customer_profile_id: string | null;
  created_at: string;
  purpose: string | null;
  budget: string | null;
  orderer_name: string | null;
  orderer_phone: string | null;
}

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

export default function StatsTab({ companyId }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hourRange, setHourRange] = useState<"all" | "recent">("all");
  const [timeDimension, setTimeDimension] = useState<"hour" | "weekday">("hour");
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("status, final_price, delivery_fee, desired_date, channel, items, delivery_type, customer_profile_id, created_at, purpose, budget, orderer_name, orderer_phone")
        .eq("company_id", companyId)
        .eq("paid", true)
        .in("status", ["제작완료", "픽업/배송완료"]);
      setReservations((data as Reservation[]) ?? []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  // 이번 달 예약
  const thisMonthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}`;
  const thisMonthData = useMemo(
    () => reservations.filter((r) => r.desired_date?.startsWith(thisMonthKey)),
    [reservations, thisMonthKey]
  );

  const totalRevenue = useMemo(
    () => thisMonthData.reduce((s, r) => s + (r.final_price ?? 0) - (r.delivery_fee ?? 0), 0),
    [thisMonthData]
  );

  // 전월 매출 (증감률 비교용)
  const lastMonthKey = useMemo(() => {
    const d = new Date(thisYear, thisMonth - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [thisYear, thisMonth]);
  const lastMonthRevenue = useMemo(
    () => reservations
      .filter((r) => r.desired_date?.startsWith(lastMonthKey))
      .reduce((s, r) => s + (r.final_price ?? 0) - (r.delivery_fee ?? 0), 0),
    [reservations, lastMonthKey]
  );
  const revenueGrowth = useMemo(() => {
    if (lastMonthRevenue > 0) return Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    if (totalRevenue > 0) return null; // 전월 매출 0원 → 비율로 표현 불가, "신규"로 표시
    return 0;
  }, [totalRevenue, lastMonthRevenue]);

  // 전월 예약 건수 (증감 비교용)
  const lastMonthCount = useMemo(
    () => reservations.filter((r) => r.desired_date?.startsWith(lastMonthKey)).length,
    [reservations, lastMonthKey]
  );
  const countDiff = thisMonthData.length - lastMonthCount;

  // 최근 6개월 월별 매출
  const monthlyData = useMemo(() => {
    const result: { month: string; 매출: number; 건수: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      const rows = reservations.filter((r) => r.desired_date?.startsWith(key));
      const revenue = rows.reduce((s, r) => s + (r.final_price ?? 0) - (r.delivery_fee ?? 0), 0);
      result.push({ month: label, 매출: revenue, 건수: rows.length });
    }
    return result;
  }, [reservations, thisYear, thisMonth]);

  // 전년 대비 월별 매출 비교 (12개월 전체, 다가올 달의 작년 실적을 미리 확인하기 위함)
  const yearlyComparisonData = useMemo(() => {
    const lastYear = thisYear - 1;
    const revenueOf = (year: number, month: number) => {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      return reservations
        .filter((r) => r.desired_date?.startsWith(key))
        .reduce((s, r) => s + (r.final_price ?? 0) - (r.delivery_fee ?? 0), 0);
    };
    const result: { month: string; 올해: number; 작년: number; growth: number | null }[] = [];
    for (let m = 1; m <= 12; m++) {
      const thisYearRevenue = revenueOf(thisYear, m);
      const lastYearRevenue = revenueOf(lastYear, m);
      const growth = lastYearRevenue > 0 ? Math.round(((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100) : null;
      result.push({ month: `${m}월`, 올해: thisYearRevenue, 작년: lastYearRevenue, growth });
    }
    return result;
  }, [reservations, thisYear]);

  // 채널별 건수
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      const key = r.channel ?? "기타";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reservations]);

  // 상품 유형별 건수 (items에서 집계)
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      (r.items ?? []).forEach((item) => {
        const key = item.type || "미지정";
        map[key] = (map[key] ?? 0) + 1;
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reservations]);

  // 신규 / 재방문 비율 (예약 건수 기준)
  const visitData = useMemo(() => {
    const countMap: Record<string, number> = {};
    reservations.forEach((r) => {
      if (r.customer_profile_id) {
        countMap[r.customer_profile_id] = (countMap[r.customer_profile_id] ?? 0) + 1;
      }
    });
    // 신규: 고객별 첫 방문 1건씩 = 고유 고객 수
    const newCount = Object.keys(countMap).length;
    // 재방문: 전체 예약 건수 - 고유 고객 수 (첫 방문 제외한 재방문 건수)
    const totalWithProfile = Object.values(countMap).reduce((s, c) => s + c, 0);
    const returnCount = totalWithProfile - newCount;
    const unknown = reservations.filter((r) => !r.customer_profile_id).length;
    return { newCount, returnCount, unknown, total: newCount + returnCount };
  }, [reservations]);

  // 시간대별 주문 비율
  const hourlyData = useMemo(() => {
    const cutoff = new Date(thisYear, thisMonth - 3, today.getDate());
    const rows = hourRange === "recent"
      ? reservations.filter((r) => r.created_at && new Date(r.created_at) >= cutoff)
      : reservations;
    const counts = new Array(24).fill(0);
    rows.forEach((r) => {
      if (!r.created_at) return;
      const hour = new Date(r.created_at).getHours();
      counts[hour]++;
    });
    const total = rows.length;
    return counts.map((count, hour) => ({
      hour: `${hour}시`,
      비율: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));
  }, [reservations, hourRange, thisYear, thisMonth, today]);

  // 요일별 주문 비율 (시간대별과 같은 기간 필터 재사용)
  const weekdayData = useMemo(() => {
    const cutoff = new Date(thisYear, thisMonth - 3, today.getDate());
    const rows = hourRange === "recent"
      ? reservations.filter((r) => r.created_at && new Date(r.created_at) >= cutoff)
      : reservations;
    const counts = new Array(7).fill(0);
    rows.forEach((r) => {
      if (!r.created_at) return;
      counts[new Date(r.created_at).getDay()]++;
    });
    const total = rows.length;
    return counts.map((count, day) => ({
      day: WEEKDAY_LABELS[day],
      비율: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }));
  }, [reservations, hourRange, thisYear, thisMonth, today]);

  // 베스트셀러 Top 5 (상품명 기준)
  const bestSellerData = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; productId: string | null }> = {};
    reservations.forEach((r) => {
      (r.items ?? []).forEach((item) => {
        const key = item.name || item.type || "미지정";
        if (!map[key]) map[key] = { count: 0, revenue: 0, productId: item.product_id ?? null };
        map[key].count += 1;
        map[key].revenue += item.price || 0;
        if (!map[key].productId && item.product_id) map[key].productId = item.product_id;
      });
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue, productId: v.productId }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [reservations]);

  // 단골 고객 TOP 5 (총 결제액 기준, customer_profile_id가 없으면 전화번호로 집계)
  const topCustomersData = useMemo(() => {
    const map: Record<string, { name: string; phone: string; total: number; count: number }> = {};
    reservations.forEach((r) => {
      const key = r.customer_profile_id ?? r.orderer_phone;
      if (!key) return;
      if (!map[key]) map[key] = { name: r.orderer_name ?? "이름 없음", phone: r.orderer_phone ?? "", total: 0, count: 0 };
      map[key].total += r.final_price ?? 0;
      map[key].count += 1;
    });
    return Object.values(map)
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [reservations]);

  // 베스트셀러 썸네일용 상품 이미지
  const [productImages, setProductImages] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const ids = [...new Set(bestSellerData.map((p) => p.productId).filter((id): id is string => !!id))];
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from("products").select("id, image_url").in("id", ids);
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((p) => { map[p.id] = p.image_url ?? null; });
      setProductImages(map);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestSellerData.map((p) => p.productId).join(",")]);

  // 선물 목적 비율 (맞춤주문에서 선물 목적을 선택한 건만 집계)
  const purposeData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      if (!r.purpose) return;
      const key = STANDARD_PURPOSES.includes(r.purpose) ? r.purpose : "기타";
      map[key] = (map[key] ?? 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return {
      total,
      items: Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [reservations]);

  // 옵션 추가 비율 (쇼핑백/메시지카드/생화 수명연장제를 실제로 "추가"한 비율 — 서비스/없음/미포함은 제외, 맞춤주문 건 기준)
  const optionRateData = useMemo(() => {
    let total = 0;
    let bag = 0;
    let card = 0;
    let preservative = 0;
    reservations.forEach((r) => {
      (r.items ?? []).forEach((item) => {
        if (item.shopping_bag === undefined && item.message_card === undefined && item.preservative === undefined) return;
        total += 1;
        if (item.shopping_bag === "추가") bag += 1;
        if (item.message_card === "추가") card += 1;
        if (item.preservative === "추가") preservative += 1;
      });
    });
    return {
      total,
      items: [
        { name: "쇼핑백", value: bag },
        { name: "메시지카드", value: card },
        { name: "생화 수명연장제", value: preservative },
      ],
    };
  }, [reservations]);

  // 예산대별 분포 (맞춤주문) — "3만원", "3만원대" 등 표기가 달라도 선두 숫자를 구간으로 묶어서 집계
  const budgetData = useMemo(() => {
    const ranges = [
      { label: "1~5만원", min: 1, max: 5 },
      { label: "6~10만원", min: 6, max: 10 },
      { label: "11~15만원", min: 11, max: 15 },
      { label: "16~20만원", min: 16, max: 20 },
      { label: "21~25만원", min: 21, max: 25 },
      { label: "26~30만원", min: 26, max: 30 },
      { label: "31만원 이상", min: 31, max: Infinity },
    ];
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      if (!r.budget) return;
      const matched = r.budget.match(/\d+/);
      const label = matched
        ? ranges.find((range) => Number(matched[0]) >= range.min && Number(matched[0]) <= range.max)?.label ?? "기타"
        : "기타";
      map[label] = (map[label] ?? 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    const items = [...ranges.map((r) => r.label), "기타"]
      .filter((label) => map[label] > 0)
      .map((label) => ({ name: label, value: map[label] }));
    return { total, items };
  }, [reservations]);

  // 평균 객단가 추이 (최근 6개월, 배송비 제외)
  const avgPriceMonthlyData = useMemo(
    () => monthlyData.map((m) => ({ month: m.month, 평균: m.건수 > 0 ? Math.round(m.매출 / m.건수) : 0 })),
    [monthlyData]
  );

  // 수령방법 비율
  const deliveryData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      const key = r.delivery_type ?? "픽업";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reservations]);

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
            value={`${thisMonthData.length}건`}
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
