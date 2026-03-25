"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

interface Props {
  companyId: string;
}

interface Reservation {
  status: string;
  final_price: number | null;
  product_price: number;
  desired_date: string;
  channel: string | null;
  product_type: string | null;
  delivery_type: string;
  customer_profile_id: string | null;
}

const GOLD = "#c9a96e";
const COLORS = ["#c9a96e", "#a87c4a", "#e8c99a", "#8b6035", "#f0ddb8", "#7a4f28"];
const CHANNEL_COLORS: Record<string, string> = {
  네이버: "#03C75A",
  카카오: "#FEE500",
  워크인: "#fb923c",
  기타: "#d1d5db",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function StatsTab({ companyId }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("status, final_price, product_price, desired_date, channel, product_type, delivery_type, customer_profile_id")
        .eq("company_id", companyId)
        .in("status", ["제작완료", "픽업배송완료"]);
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
    () => thisMonthData.reduce((s, r) => s + (r.final_price ?? r.product_price), 0),
    [thisMonthData]
  );
  const avgPrice = thisMonthData.length > 0 ? Math.round(totalRevenue / thisMonthData.length) : 0;

  // 최근 6개월 월별 매출
  const monthlyData = useMemo(() => {
    const result: { month: string; 매출: number; 건수: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      const rows = reservations.filter((r) => r.desired_date?.startsWith(key));
      const revenue = rows.reduce((s, r) => s + (r.final_price ?? r.product_price), 0);
      result.push({ month: label, 매출: revenue, 건수: rows.length });
    }
    return result;
  }, [reservations, thisYear, thisMonth]);

  // 채널별 건수
  const channelData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      const key = r.channel ?? "기타";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reservations]);

  // 상품 유형별 건수
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach((r) => {
      const key = r.product_type ?? "미지정";
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reservations]);

  // 신규 / 재방문 비율
  const visitData = useMemo(() => {
    const countMap: Record<string, number> = {};
    reservations.forEach((r) => {
      if (r.customer_profile_id) {
        countMap[r.customer_profile_id] = (countMap[r.customer_profile_id] ?? 0) + 1;
      }
    });
    const newCount = Object.values(countMap).filter((c) => c === 1).length;
    const returnCount = Object.values(countMap).filter((c) => c > 1).length;
    const unknown = reservations.filter((r) => !r.customer_profile_id).length;
    return { newCount, returnCount, unknown, total: newCount + returnCount };
  }, [reservations]);

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
    <div className="space-y-8">
      <h2 className="text-xl font-medium text-gray-900">통계</h2>

      {/* 이번 달 요약 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">이번 달 요약</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="총 매출"
            value={`${totalRevenue.toLocaleString()}원`}
            sub={thisMonthKey.replace("-", "년 ") + "월"}
          />
          <StatCard
            label="예약 건수"
            value={`${thisMonthData.length}건`}
          />
          <StatCard
            label="평균 단가"
            value={avgPrice > 0 ? `${avgPrice.toLocaleString()}원` : "-"}
          />
        </div>
      </section>

      {/* 월별 매출 추이 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">월별 매출 추이 (최근 6개월)</h3>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
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

      {/* 채널별 / 수령방법 */}
      <section className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">채널별 비율</h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            {channelData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {channelData.map((entry, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[entry.name] ?? COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${Number(v)}건`]} contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">수령 방법</h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            {deliveryData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deliveryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {deliveryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${Number(v)}건`]} contentStyle={{ borderRadius: "10px", border: "1px solid #ede8e0", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* 상품 유형 순위 + 신규/재방문 */}
      <section className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">상품 유형 순위</h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
            {typeData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
            ) : (
              typeData.map((item, i) => {
                const max = typeData[0].value;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                    <span className="text-sm text-gray-700 w-16 shrink-0">{item.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.value / max) * 100}%`, backgroundColor: GOLD }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-8 text-right">{item.value}건</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">신규 / 재방문 비율</h3>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            {visitData.total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
            ) : (
              <>
                {[
                  { label: "신규 고객", count: visitData.newCount, color: GOLD },
                  { label: "재방문 고객", count: visitData.returnCount, color: "#a87c4a" },
                ].map(({ label, count, color }) => {
                  const pct = visitData.total > 0 ? Math.round((count / visitData.total) * 100) : 0;
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-medium text-gray-900">{count}명 <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">
                  전체 {visitData.total}명
                  {visitData.unknown > 0 && ` · 미집계 ${visitData.unknown}건`}
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
