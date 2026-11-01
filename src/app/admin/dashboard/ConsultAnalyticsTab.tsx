"use client";

import { useEffect, useState } from "react";
import { trafficSourceLabel } from "@/lib/trafficSource";

interface ConsultOrder {
  id: string;
  company_id: string;
  created_at: string;
  mood: string | null;
  budget: string | null;
  traffic_source: string | null;
  product_type: string | null;
  product_name: string | null;
  product_price: number | null;
}

interface Props {
  companies: { id: string; name: string }[];
}

type Range = 7 | 30 | 90;
type Fit = "under" | "exact" | "over";

const FITS: Fit[] = ["under", "exact", "over"];
const FIT_LABEL: Record<Fit, string> = {
  under: "예산보다 낮게",
  exact: "예산과 딱 맞게",
  over: "예산보다 높게",
};
const FIT_STYLE: Record<Fit, string> = {
  under: "bg-blue-50 text-blue-600",
  exact: "bg-emerald-50 text-emerald-600",
  over: "bg-orange-50 text-orange-500",
};
const FIT_BAR: Record<Fit, string> = {
  under: "bg-blue-400",
  exact: "bg-emerald-500",
  over: "bg-orange-400",
};

const won = (n: number) => `${n.toLocaleString()}원`;
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
/** '5만원' → 50000 (예전 '1~5만원' 같은 구간 라벨은 비교할 수 없어 null) */
const budgetAmount = (budget: string | null) => {
  const m = budget?.match(/^(\d+)만원$/);
  return m ? Number(m[1]) * 10000 : null;
};
/** 주문한 상품 가격(배송비·옵션 제외)을 손님이 고른 예산과 비교 */
const fitOf = (o: ConsultOrder): Fit | null => {
  const amount = budgetAmount(o.budget);
  if (amount == null || o.product_price == null) return null;
  if (o.product_price < amount) return "under";
  if (o.product_price > amount) return "over";
  return "exact";
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

const emptyCounts = (): Record<Fit, number> => ({ under: 0, exact: 0, over: 0 });

// 맞춤주문 분석 — 실제 주문된 맞춤주문만 (취소·삭제·데모 매장 제외)
// 손님이 고른 예산과 실제로 주문한 상품 가격을 비교해 추천 로직이 의도대로 작동하는지 확인한다
export default function ConsultAnalyticsTab({ companies }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [companyId, setCompanyId] = useState("all");
  const [orders, setOrders] = useState<ConsultOrder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(50);

  useEffect(() => {
    setOrders(null);
    setLoadError(null);
    fetch(`/api/operator/consult-orders?days=${range}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
        setOrders(data as ConsultOrder[]);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "불러오기 실패"));
  }, [range]);

  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  // 예산이 비어 있는 예전 주문은 경로가 확실하지 않아(상품 상세 예약이 섞여 있음) 아예 제외한다
  const rows = (orders ?? []).filter((o) => !!o.budget && (companyId === "all" || o.company_id === companyId));
  const companyOptions = companies.filter((c) => (orders ?? []).some((o) => !!o.budget && o.company_id === c.id));

  const fitCounts = emptyCounts();
  const fitDiffSum = emptyCounts();
  for (const o of rows) {
    const fit = fitOf(o);
    if (!fit) continue;
    fitCounts[fit] += 1;
    fitDiffSum[fit] += Math.abs(o.product_price! - budgetAmount(o.budget)!);
  }
  const comparable = FITS.reduce((s, f) => s + fitCounts[f], 0);

  // 예산별
  const byBudget = new Map<string, { budget: string; amount: number | null; orders: number; priceSum: number; priceCount: number; fits: Record<Fit, number> }>();
  for (const o of rows) {
    const key = o.budget!;
    const b = byBudget.get(key) ?? { budget: key, amount: budgetAmount(o.budget), orders: 0, priceSum: 0, priceCount: 0, fits: emptyCounts() };
    b.orders += 1;
    if (o.product_price != null) {
      b.priceSum += o.product_price;
      b.priceCount += 1;
    }
    const fit = fitOf(o);
    if (fit) b.fits[fit] += 1;
    byBudget.set(key, b);
  }
  const budgetRows = [...byBudget.values()].sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">맞춤주문 분석</h2>
          <p className="text-xs text-gray-400 mt-0.5">실제 주문된 맞춤주문만 집계합니다. (취소·삭제·데모 매장 제외)</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none"
          >
            <option value="all">전체 매장</option>
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
      </div>

      {loadError ? (
        <p className="py-10 text-center text-sm text-red-500">{loadError}</p>
      ) : !orders ? (
        <p className="py-10 text-center text-sm text-gray-300">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">이 기간에 맞춤주문이 없습니다.</p>
      ) : (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl px-4 py-3.5">
              <p className="text-xs text-gray-400">맞춤주문</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">{rows.length.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">예산 비교 가능 {comparable}건</p>
            </div>
            {FITS.map((fit) => (
              <div key={fit} className="bg-white rounded-2xl px-4 py-3.5">
                <p className="text-xs text-gray-400">{FIT_LABEL[fit]}</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{pct(fitCounts[fit], comparable)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {fitCounts[fit]}건
                  {fit !== "exact" && fitCounts[fit] > 0 && ` · 평균 ${won(Math.round(fitDiffSum[fit] / fitCounts[fit]))} ${fit === "under" ? "낮음" : "높음"}`}
                </p>
              </div>
            ))}
          </div>

          {/* 비율 막대 */}
          {comparable > 0 && (
            <div className="bg-white rounded-2xl p-5">
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {FITS.map((fit) =>
                  fitCounts[fit] > 0 ? (
                    <div key={fit} className={FIT_BAR[fit]} style={{ width: `${(fitCounts[fit] / comparable) * 100}%` }} />
                  ) : null
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-gray-500">
                {FITS.map((fit) => (
                  <span key={fit} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${FIT_BAR[fit]}`} />
                    {FIT_LABEL[fit]} {fitCounts[fit]}건
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 예산별 */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">예산별</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left font-medium py-2">예산</th>
                    <th className="text-right font-medium py-2">주문</th>
                    <th className="text-right font-medium py-2">평균 상품가</th>
                    <th className="text-right font-medium py-2">낮게</th>
                    <th className="text-right font-medium py-2">딱 맞게</th>
                    <th className="text-right font-medium py-2">높게</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((b) => {
                    const avg = b.priceCount > 0 ? Math.round(b.priceSum / b.priceCount) : null;
                    return (
                      <tr key={b.budget} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-800">{b.budget}</td>
                        <td className="py-2 text-right text-gray-700">{b.orders}</td>
                        <td className="py-2 text-right text-gray-900">
                          {avg != null ? (
                            <>
                              {won(avg)}
                              {b.amount != null && avg !== b.amount && (
                                <span className="block text-[11px] text-gray-400">
                                  예산 대비 {avg > b.amount ? "+" : "-"}{won(Math.abs(avg - b.amount))}
                                </span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        {b.amount == null ? (
                          <td colSpan={3} className="py-2 text-right text-xs text-gray-300">
                            예전 구간 예산이라 비교 불가
                          </td>
                        ) : (
                          FITS.map((fit) => (
                            <td key={fit} className="py-2 text-right text-gray-700">{b.fits[fit]}</td>
                          ))
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 주문 목록 */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">주문 ({rows.length.toLocaleString()}건)</h3>
            <div className="divide-y divide-gray-50">
              {rows.slice(0, showCount).map((o) => {
                const fit = fitOf(o);
                const amount = budgetAmount(o.budget);
                return (
                  <div key={o.id} className="py-3 flex items-center gap-2 flex-wrap text-sm">
                    <span className="text-xs text-gray-400 tabular-nums">{formatDateTime(o.created_at)}</span>
                    <span className="font-medium text-gray-900">{companyName.get(o.company_id) ?? "알 수 없는 매장"}</span>
                    <span className="text-gray-600">{[o.product_type, o.mood].filter(Boolean).join(" · ")}</span>
                    <span className="text-xs text-gray-400">{trafficSourceLabel(o.traffic_source)}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-gray-700">
                        예산 {o.budget} → {o.product_name ?? "—"} {o.product_price != null ? won(o.product_price) : ""}
                      </span>
                      {fit && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${FIT_STYLE[fit]}`}>
                          {FIT_LABEL[fit]}
                          {fit !== "exact" && amount != null && o.product_price != null && ` (${fit === "over" ? "+" : "-"}${won(Math.abs(o.product_price - amount))})`}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            {rows.length > showCount && (
              <button
                onClick={() => setShowCount((n) => n + 50)}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                더 보기
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            비교 기준은 주문한 상품 가격이며 배송비·메시지카드 등 옵션은 빼고 봅니다. 예산을 &lsquo;기타&rsquo;로 직접 입력한 주문도 입력한 금액으로 비교합니다.
          </p>
        </>
      )}
    </section>
  );
}
