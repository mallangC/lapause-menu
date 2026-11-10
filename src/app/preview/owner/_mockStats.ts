// 사장님 화면 미리보기 — 통계 목업 (잘 되는 매장 기준, 실제·데모 데이터를 읽지 않는다)
// 오늘은 2026-11-10 고정. 올해 1~11월 평균 월매출 약 1,000만원.
// 전년 대비는 달마다 다르게 (+5% ~ +24%), 3월·6월은 작년이 조금 더 잘된 달.
// 꽃집 대목: 5월(어버이날·스승의날·성년의날)이 가장 높고, 2월(졸업·발렌타인)·3월(입학)·12월(크리스마스·연말)이 그다음.
// 1월·7~8월(비수기)은 낮다.
import { MOCK_PRODUCTS } from "./_mockReservations";

const MAN = 10000;

// 월매출(만원) — [1월 ~ 12월]
const REVENUE_2025 = [610, 990, 880, 790, 1760, 720, 580, 600, 740, 870, 920, 1390];
// 2026년 12월은 아직 오지 않은 달이라 0
//                    1월  2월   3월  4월  5월   6월  7월  8월  9월  10월  11월  12월
const REVENUE_2026 = [640, 1190, 860, 870, 2150, 700, 640, 630, 920, 1010, 1120, 0];
// 평균 결제 금액(원) — 5월은 카네이션 바구니 등 작은 주문이 많아 조금 낮다
const AVG_PRICE = [78000, 76000, 79000, 80000, 68000, 81000, 82000, 82000, 80000, 79000, 78000, 74000];

const monthly = [2025, 2026].flatMap((year) =>
  (year === 2025 ? REVENUE_2025 : REVENUE_2026).map((rev, i) => ({
    ym: `${year}-${String(i + 1).padStart(2, "0")}`,
    revenue: rev * MAN,
    count: rev > 0 ? Math.round((rev * MAN) / AVG_PRICE[i]) : 0,
  })),
).filter((m) => m.revenue > 0);

// 시간대별 주문 수 (0~23시) — 점심(11~13시)과 퇴근 시간(17~19시)에 몰린다
const HOURLY_ALL = [0, 0, 0, 0, 0, 0, 2, 8, 24, 52, 96, 138, 146, 120, 98, 92, 104, 132, 141, 106, 64, 38, 21, 9];
const HOURLY_RECENT = HOURLY_ALL.map((v) => Math.round(v * 0.27));
// 요일별 (일~토) — 금·토에 몰린다
const WEEKDAY_ALL = [168, 142, 151, 163, 178, 246, 342];
const WEEKDAY_RECENT = WEEKDAY_ALL.map((v) => Math.round(v * 0.27));
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

const best = ["p7", "p2", "p5", "p14", "p11"].map((id, i) => {
  const p = MOCK_PRODUCTS.find((x) => x.id === id)!;
  const count = [186, 164, 121, 117, 96][i];
  return { name: p.name, count, revenue: count * p.price, productId: p.id, imageUrl: p.image_url };
});

export const MOCK_STATS = {
  monthly,
  channels: [
    { name: "Flo.Aide", value: 862 },
    { name: "네이버", value: 248 },
    { name: "카카오", value: 164 },
    { name: "워크인", value: 116 },
  ],
  types: [
    { name: "꽃다발", value: 824 },
    { name: "꽃바구니", value: 268 },
    { name: "센터피스", value: 176 },
    { name: "화병꽂이", value: 84 },
    { name: "식물", value: 38 },
  ],
  deliveries: [
    { name: "픽업", value: 874 },
    { name: "배송", value: 516 },
  ],
  // 고유 손님 640명, 전체 1,390건 → 재방문 750건 (단골이 많은 매장)
  visits: { uniqueCustomers: 640, withProfile: 1390, unknown: 0 },
  hourly: { all: HOURLY_ALL, recent: HOURLY_RECENT },
  weekday: { all: WEEKDAY_ALL, recent: WEEKDAY_RECENT },
  timeTotals: { all: sum(HOURLY_ALL), recent: sum(HOURLY_RECENT) },
  bestSellers: best,
  topCustomers: [
    { name: "배주원", phone: "01063259875", total: 1860000, count: 21 },
    { name: "김민지", phone: "01020003100", total: 1420000, count: 17 },
    { name: "류현우", phone: "01051147978", total: 1180000, count: 14 },
    { name: "홍다은", phone: "01054608520", total: 960000, count: 12 },
    { name: "박지은", phone: "01023463642", total: 870000, count: 11 },
  ],
  purposes: [
    { name: "기념", value: 312 },
    { name: "축하", value: 284 },
    { name: "감사", value: 226 },
    { name: "데이트", value: 152 },
    { name: "위로", value: 41 },
  ],
  options: { total: 1390, bag: 612, card: 824, preservative: 231 },
  budgets: {
    "1~5만원": 124,
    "6~10만원": 386,
    "11~15만원": 214,
    "16~20만원": 92,
    "21~25만원": 41,
    "26~30만원": 24,
    "31만원 이상": 14,
  } as Record<string, number>,
};

// 유입 분석 — 최근 30일 기준 값을 기간에 맞춰 늘리고 줄인다
type SourceRow = { source: string | null; visits: number; orders: number; revenue: number };
type PathRow = { path: "cart" | "product_detail" | "recommend" | "manual" | "pay_link"; orders: number; revenue: number };
const SOURCES_30: SourceRow[] = [
  { source: "instagram", visits: 2140, orders: 58, revenue: 4520000 },
  { source: "naver", visits: 1260, orders: 31, revenue: 2410000 },
  { source: "kakao", visits: 840, orders: 24, revenue: 1880000 },
  { source: "qr", visits: 420, orders: 12, revenue: 860000 },
  { source: "blog", visits: 310, orders: 7, revenue: 540000 },
  { source: "direct", visits: 380, orders: 6, revenue: 470000 },
];
const PATHS_30: PathRow[] = [
  { path: "recommend", orders: 62, revenue: 4980000 },
  { path: "product_detail", orders: 44, revenue: 3270000 },
  { path: "cart", orders: 32, revenue: 2430000 },
  { path: "manual", orders: 14, revenue: 980000 },
  { path: "pay_link", orders: 6, revenue: 520000 },
];
const RANGE_SCALE: Record<number, number> = { 7: 0.24, 30: 1, 90: 2.9 };

export function mockTraffic(range: 7 | 30 | 90) {
  const k = RANGE_SCALE[range];
  const scale = <T extends { orders: number; revenue: number }>(r: T) => ({
    ...r,
    orders: Math.round(r.orders * k),
    revenue: Math.round((r.revenue * k) / 1000) * 1000,
  });
  const sourceRows = SOURCES_30.map((r) => ({ ...scale(r), visits: Math.round(r.visits * k) }));
  const pathRows = PATHS_30.map(scale);
  return { sourceRows, pathRows, totalVisits: sourceRows.reduce((s, r) => s + r.visits, 0) };
}
