"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CUSTOMER_ORDER_PATHS,
  ORDER_PATH_LABEL,
  trafficSourceLabel,
  type OrderPath,
} from "@/lib/trafficSource";

interface Props {
  companyId: string;
  refreshKey: number;
}

type Range = 7 | 30 | 90;

interface SourceRow { source: string | null; visits: number; orders: number; revenue: number }
interface PathRow { path: OrderPath; orders: number; revenue: number }

// KST 기준 n일 전 날짜 (YYYY-MM-DD)
function kstDateDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

const won = (n: number) => `${n.toLocaleString()}원`;

// 비중 색 — 항목 순서대로 (주문 경로별)
const SHARE_COLORS = ["#4D7CFE", "#E05780", "#F8961E", "#2A9D8F", "#9B5DE5", "#F9C74F", "#9ca3af"];
// 유입 채널 색 — 각 서비스 대표색 (매장 포인트 금색은 쓰지 않는다)
const SOURCE_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  naver: "#03C75A",
  naver_blog: "#3B82F6", // 네이버(초록)와 겹치지 않게 파란색
  kakao: "#FEE500",
  youtube: "#FF0000",
  qr: "#4B5563",
  direct: "#9B5DE5",
};

// 한 줄 누적 막대 — 전체 매출을 100%로 두고 항목별 비중만큼 색 칸으로 나눈다. 아래는 같은 색 점이 붙은 목록
function StackedShare({ rows }: { rows: { key: string; label: string; revenue: number; detail: string; color?: string }[] }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const pctOf = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-px">
        {rows.map((r, i) =>
          r.revenue > 0 ? (
            <div key={r.key} style={{ width: `${(r.revenue / total) * 100}%`, backgroundColor: r.color ?? SHARE_COLORS[i % SHARE_COLORS.length] }} />
          ) : null
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: r.color ?? SHARE_COLORS[i % SHARE_COLORS.length] }} />
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{r.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{r.detail}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 shrink-0">
              {won(r.revenue)} <span className="text-xs font-normal text-gray-400">({pctOf(r.revenue)}%)</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 유입 분석 — 채널별 방문·주문·전환율·매출, 주문 경로별 주문·매출
// 방문 수는 menu_visits(브라우저 기준 하루 1회), 주문은 취소·삭제 제외, 매출은 결제 완료 건의 실제 결제 금액
export default function TrafficStats({ companyId, refreshKey }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [pathRows, setPathRows] = useState<PathRow[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const startDate = kstDateDaysAgo(range - 1);
    (async () => {
      setLoading(true);
      const [{ data: visits, error: vErr }, { data: orders, error: oErr }] = await Promise.all([
        supabase.from("menu_visits").select("source, visits").eq("company_id", companyId).gte("visit_date", startDate),
        supabase
          .from("reservations")
          .select("traffic_source, order_path, paid, paid_amount, final_price, status")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .neq("status", "취소")
          .gte("created_at", `${startDate}T00:00:00+09:00`)
          .limit(10000),
      ]);
      if (vErr) console.error("[TrafficStats] 방문 조회 실패:", vErr.message);
      if (oErr) console.error("[TrafficStats] 주문 조회 실패:", oErr.message);

      const bySource = new Map<string | null, SourceRow>();
      const row = (source: string | null) => {
        if (!bySource.has(source)) bySource.set(source, { source, visits: 0, orders: 0, revenue: 0 });
        return bySource.get(source)!;
      };
      let visitSum = 0;
      for (const v of visits ?? []) {
        row(v.source as string).visits += v.visits as number;
        visitSum += v.visits as number;
      }

      const byPath = new Map<OrderPath, PathRow>();
      for (const o of orders ?? []) {
        const path = (o.order_path ?? "manual") as OrderPath;
        const revenue = o.paid ? ((o.paid_amount as number | null) ?? (o.final_price as number | null) ?? 0) : 0;

        const p = byPath.get(path) ?? { path, orders: 0, revenue: 0 };
        p.orders += 1;
        p.revenue += revenue;
        byPath.set(path, p);

        // 채널별 집계는 손님이 사이트에서 직접 한 주문만 (사장님 추가·링크결제는 유입 출처가 없음)
        if (CUSTOMER_ORDER_PATHS.includes(path)) {
          const s = row((o.traffic_source as string | null) ?? null);
          s.orders += 1;
          s.revenue += revenue;
        }
      }

      setTotalVisits(visitSum);
      setSourceRows([...bySource.values()].sort((a, b) => b.visits - a.visits || b.orders - a.orders));
      setPathRows([...byPath.values()].sort((a, b) => b.orders - a.orders));
      setLoading(false);
    })();
  }, [companyId, range, refreshKey]);

  const siteOrders = sourceRows.reduce((s, r) => s + r.orders, 0);
  const [view, setView] = useState<"source" | "path">("source");

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:px-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">유입 분석</h3>
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
            {([7, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md transition-colors ${range === r ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500"}`}
              >
                {r}일
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-300">불러오는 중...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-gray-400">방문</p>
                <p className="text-base font-semibold text-gray-900">{totalVisits.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-gray-400">주문</p>
                <p className="text-base font-semibold text-gray-900">{siteOrders.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-gray-400">전환율</p>
                <p className="text-base font-semibold text-gray-900">
                  {totalVisits > 0 ? `${((siteOrders / totalVisits) * 100).toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>

            {/* 유입 채널 / 주문 경로 — 한 번에 하나만, 표 대신 한 줄 누적 막대 + 목록 (칸 수가 달라 어색하거나 모바일에서 잘리지 않게) */}
            <div className="flex rounded-full bg-gray-100 p-0.5 text-xs w-fit mb-3">
              {([
                { key: "source", label: "유입 채널별" },
                { key: "path", label: "주문 경로별" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={`px-3 py-1 rounded-full transition-colors font-medium ${view === key ? "bg-gold-500 text-white shadow-sm" : "text-gray-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === "source" ? (
              sourceRows.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-300">아직 집계된 방문·주문이 없습니다.</p>
              ) : (
                <StackedShare
                  rows={[...sourceRows].sort((a, b) => b.revenue - a.revenue).map((r) => ({
                    key: r.source ?? "unknown",
                    color: r.source ? SOURCE_COLORS[r.source] : undefined,
                    // 네이버 블로그는 '블로그'로 짧게
                    label: r.source === "naver_blog" ? "블로그" : trafficSourceLabel(r.source),
                    revenue: r.revenue,
                    detail: `방문 ${r.visits.toLocaleString()} · 주문 ${r.orders.toLocaleString()} · 전환 ${r.visits > 0 ? `${((r.orders / r.visits) * 100).toFixed(1)}%` : "—"}`,
                  }))}
                />
              )
            ) : pathRows.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-300">이 기간에 주문이 없습니다.</p>
            ) : (
              <StackedShare
                rows={[...pathRows].sort((a, b) => b.revenue - a.revenue).map((r) => ({
                  key: r.path,
                  label: ORDER_PATH_LABEL[r.path] ?? r.path,
                  revenue: r.revenue,
                  detail: `주문 ${r.orders.toLocaleString()}건`,
                }))}
              />
            )}

            <p className="text-[11px] text-gray-400 leading-relaxed mt-4">
              방문은 같은 브라우저 기준 하루 1회로 셉니다. 채널은 대시보드의 &lsquo;채널별 링크 복사&rsquo;로 만든 주소로 들어온 경우에 구분되며, 주소에 채널 표시가 없으면 &lsquo;직접 유입&rsquo;으로 집계됩니다.
              매출은 결제 완료된 주문의 실제 결제 금액이며, 취소된 주문은 제외됩니다. &lsquo;기록 없음&rsquo;은 유입 집계 기능 도입 전 주문입니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
