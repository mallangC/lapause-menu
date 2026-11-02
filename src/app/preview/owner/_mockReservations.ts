// 사장님 화면 미리보기 — 예약·상품 목업 데이터 (실제·데모 매장 데이터를 읽지 않는다)
// 2026년 9~12월 예약을 달마다 30건씩 만든다. 같은 값이 나오도록 달마다 고정된 씨앗으로 섞는다.
// 미리보기의 '오늘'은 실제 날짜와 상관없이 2026년 11월 10일로 고정한다.
// 상태 규칙: 9·10월 = 완료(취소 1~2건) / 11월 = 10일 이전 완료·10일 제작완료·10일 이후 준비중(취소 1건) / 12월 = 준비중(취소 1건)
// 단, 오늘(11/10) 예약 중 오전 10시는 완료, 오후 6시는 미확인으로 둔다 (미확인·제작완료·완료를 한 화면에서 보여주려고)
// 오후 3시 30분은 사장님이 직접 추가한 미결제 예약(준비중) — 결제 링크 버튼을 보여주려고
import type { Product } from "@/types";
import type { Reservation, ReservationItem } from "@/app/[slug]/admin/dashboard/reservations/types";

/** 미리보기의 오늘 (고정) */
export const PREVIEW_TODAY_STR = "2026-11-10";
export const PREVIEW_TODAY = new Date(2026, 10, 10);

// 이미지는 public/preview/thumb (원본을 줄인 사본 — 원본은 너무 커서 화면이 느려진다)
const img = (n: number) => `/preview/thumb/${n}.jpg`;

// bag_included는 선택 — 적으면 그 값, 안 적으면 10만원 이상일 때 쇼핑백 포함
type MockProduct = Pick<Product, "id" | "name" | "price" | "image_url" | "product_type" | "flower_colors" | "wrapping_color" | "mood"> & { bag_included?: boolean };

export const MOCK_PRODUCTS: MockProduct[] = [
  { id: "p1", name: "가을 센터피스", price: 89000, image_url: img(1), product_type: "센터피스", flower_colors: ["보라색", "흰색"], wrapping_color: "밝은 계열", mood: "차분한 딥컬러", bag_included: true },
  { id: "p2", name: "핑크 튤립 꽃다발", price: 120000, image_url: img(2), product_type: "꽃다발", flower_colors: ["핑크색"], wrapping_color: "밝은 계열", mood: "화사한 파스텔톤" },
  { id: "p3", name: "내추럴 꽃다발", price: 65000, image_url: img(3), product_type: "꽃다발", flower_colors: ["노란색", "흰색"], wrapping_color: "어두운 계열", mood: "차분한 딥컬러" },
  { id: "p4", name: "파스텔 믹스 꽃다발", price: 70000, image_url: img(4), product_type: "꽃다발", flower_colors: ["핑크색", "노란색", "보라색"], wrapping_color: "밝은 계열", mood: "화사한 파스텔톤" },
  { id: "p5", name: "라벤더 박스 센터피스", price: 120000, image_url: img(5), product_type: "센터피스", flower_colors: ["보라색", "노란색"], wrapping_color: "어두운 계열", mood: "화사한 파스텔톤", bag_included: true },
  { id: "p6", name: "오렌지 장미 꽃다발", price: 300000, image_url: img(6), product_type: "꽃다발", flower_colors: ["주황색"], wrapping_color: "밝은 계열", mood: "선명한 비비드톤" },
  { id: "p7", name: "피치 장미 꽃다발", price: 200000, image_url: img(7), product_type: "꽃다발", flower_colors: ["주황색", "노란색"], wrapping_color: "밝은 계열", mood: "화사한 파스텔톤" },
  { id: "p9", name: "썬샤인 꽃다발", price: 150000, image_url: img(9), product_type: "꽃다발", flower_colors: ["노란색"], wrapping_color: "밝은 계열", mood: "선명한 비비드톤" },
  { id: "p10", name: "블루 해바라기 꽃다발", price: 90000, image_url: img(10), product_type: "꽃다발", flower_colors: ["노란색", "파란색"], wrapping_color: "밝은 계열", mood: "선명한 비비드톤" },
  { id: "p11", name: "딥 로즈 꽃다발", price: 85000, image_url: img(11), product_type: "꽃다발", flower_colors: ["보라색", "파란색"], wrapping_color: "어두운 계열", mood: "차분한 딥컬러" },
  { id: "p12", name: "그린 민트 꽃다발", price: 72000, image_url: img(12), product_type: "꽃다발", flower_colors: ["초록색", "흰색"], wrapping_color: "밝은 계열", mood: "깔끔한 화이트&그린" },
  { id: "p14", name: "레드 시그니처 꽃다발", price: 60000, image_url: img(14), product_type: "꽃다발", flower_colors: ["빨간색"], wrapping_color: "밝은 계열", mood: "선명한 비비드톤" },
  { id: "p15", name: "핑크 플라워 박스", price: 95000, image_url: img(15), product_type: "꽃바구니", flower_colors: ["핑크색"], wrapping_color: "밝은 계열", mood: "화사한 파스텔톤" },
  { id: "p16", name: "옐로우 미니 꽃다발", price: 85000, image_url: img(16), product_type: "꽃다발", flower_colors: ["노란색"], wrapping_color: "밝은 계열", mood: "화사한 파스텔톤" },
  { id: "p17", name: "카라 부케", price: 250000, image_url: img(17), product_type: "꽃다발", flower_colors: ["흰색", "초록색"], wrapping_color: "기타", mood: "깔끔한 화이트&그린", bag_included: true },
  { id: "p18", name: "글라디올라스 화병꽂이", price: 75000, image_url: img(18), product_type: "화병꽂이", flower_colors: ["주황색", "초록색"], wrapping_color: "기타", mood: "선명한 비비드톤", bag_included: true },
];

export const findMockProduct = (id?: string | null) => MOCK_PRODUCTS.find((p) => p.id === id) ?? null;

// 상품 관리 화면용 — 목업 상품에 인기·추천 배지, 노출 상태, 등록일을 붙인다 (인기 3개 · 추천 3개 · 숨김 2개)
const POPULAR = ["p2", "p6", "p7", "p14"];
const RECOMMENDED = ["p5", "p11", "p15"];
const HIDDEN = ["p10", "p17"];
// 시즌 메뉴 — 시즌 상품은 손님 메뉴판의 시즌 탭에만 보이고 전체 목록에서는 빠지므로, 추천·인기 상품이 아닌 것으로 몇 개만
const SEASONS_OF: Record<string, string[]> = {
  p14: ["크리스마스"],
};
export function makeMockProductList(): Product[] {
  return MOCK_PRODUCTS.map((p, i) => ({
    ...p,
    seasons: SEASONS_OF[p.id] ?? [],
    company_id: "preview",
    is_popular: POPULAR.includes(p.id),
    is_recommended: RECOMMENDED.includes(p.id),
    status: HIDDEN.includes(p.id) ? "inactive" : "active",
    // 앞쪽 상품일수록 최근에 등록한 것처럼
    created_at: new Date(2026, 9, 30 - i * 2).toISOString(),
    // 상품에 적어 둔 값이 있으면 그 값, 없으면 10만원 이상 상품은 쇼핑백 포함
    bag_included: p.bag_included ?? p.price >= 100000,
    message_card_unavailable: false,
    preservative_unavailable: false,
  }));
}

// 옵션 가격 (사장님 화면 목업 매장 설정과 같은 값)
export const MOCK_MESSAGE_CARD_PRICE = 2000;
export const MOCK_SHOPPING_BAG_PRICE = 2000;

const NAMES = [
  "김민지", "이서준", "박지은", "최유나", "정하윤", "강도윤", "조수아", "윤지호", "장서연", "임하준",
  "한예린", "오시우", "서지민", "신유진", "권민서", "황준서", "안소율", "송지아", "류현우", "전채원",
  "홍다은", "고은우", "문서윤", "양지훈", "손하린", "배주원", "백수빈", "허윤아", "남궁민", "노지안",
];
const RECIPIENTS = ["김은정", "이미숙", "박서현", "최지영", "정수민", "강하늘", "조민아", "윤서진"];
const ADDRESSES = [
  "서울 강남구 테헤란로 152", "서울 강남구 압구정로 340", "서울 서초구 서초대로 397", "서울 강남구 도산대로 318",
  "서울 서초구 강남대로 465", "서울 강남구 논현로 508", "서울 용산구 한남대로 98", "서울 성동구 왕십리로 83",
];
const ADDRESS_DETAILS = ["101동 1203호", "3층", "2층 카페", "B동 805호", "1층 로비", "12층"];
const CARD_MESSAGES = [
  "생일 축하해! 오늘 하루 꽃처럼 행복하길 바라",
  "엄마, 늘 고마워요. 사랑해요",
  "결혼 기념일 축하해. 앞으로도 잘 부탁해",
  "승진 축하드립니다! 앞으로의 날들을 응원해요",
  "졸업 축하해. 수고 많았어!",
  "새로운 시작을 응원합니다",
  "늘 곁에 있어줘서 고마워",
];
const REQUESTS = [
  "리본에 '축하합니다' 문구 부탁드려요",
  "꽃이 너무 활짝 핀 것보다 봉오리 위주로 부탁드려요",
  "향이 강하지 않은 꽃으로 부탁드려요",
  "포장지는 너무 화려하지 않게 해주세요",
  "도착 전에 연락 한 번 주세요",
  "가격표는 빼주세요",
];
const CANCEL_REASONS = [
  "재료(장미) 입고가 늦어져 날짜에 맞춰 준비가 어려워 취소",
  "손님 요청으로 취소 (일정 변경)",
  "주문하신 색상의 꽃 수급 불가로 안내 후 환불",
  "손님이 수령 날짜를 착각해 취소 요청 · 전액 환불",
  "배송 가능 거리를 벗어나 안내 후 환불",
];
const PURPOSES = ["기념", "축하", "감사", "위로", "데이트"];
const AGES = ["20대", "30대", "40대", "50대 이상"];
const BUDGETS = ["3~5만원", "5~7만원", "7~10만원", "10만원 이상"];
const SOURCES = ["instagram", "instagram", "naver", "kakao", "qr", "direct", "naver_blog"];

// 손님별 고정 전화번호 · 단골 메모 (예약자 이름을 누르면 나오는 손님 정보 창)
const customerPhone = (idx: number) => `010-${String(2000 + idx * 173).padStart(4, "0")}-${String(3100 + idx * 271).slice(-4)}`;
export const MOCK_CUSTOMER_MEMOS: Record<string, string> = {
  "cp-25": "빨간색 꽃은 싫어하심. 메시지 카드 항상 요청",
  "cp-0": "어머님 생신마다 주문 · 파스텔톤 선호",
  "cp-12": "회사 행사용 대량 주문 가능성 있음",
};

// 고정 씨앗 난수 (mulberry32)
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function makeMonth(year: number, month: number, todayStr: string): Reservation[] {
  const rand = rng(year * 100 + month);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const chance = (p: number) => rand() < p;
  const lastDay = new Date(year, month, 0).getDate();
  const COUNT = 30;
  // 취소 건수 — 9월 2건, 나머지 달 1건 (9·10월은 '1~2건')
  const cancelCount = month === 9 ? 2 : 1;
  const cancelIdx = new Set<number>();
  while (cancelIdx.size < cancelCount) {
    const idx = Math.floor(rand() * COUNT);
    if (!(month === 11 && idx < 4)) cancelIdx.add(idx);
  }

  const list: Reservation[] = [];
  for (let i = 0; i < COUNT; i++) {
    // 11월은 오늘(10일) 예약이 꼭 보이도록 앞의 4건을 10일로 둔다
    const day = month === 11 && i < 4 ? 10 : 1 + Math.floor(rand() * lastDay);
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const hour = 10 + Math.floor(rand() * 10);
    const time = `${pad(hour)}:${chance(0.5) ? "00" : "30"}`;

    // 상품 1~2개
    const itemCount = chance(0.2) ? 2 : 1;
    const items: ReservationItem[] = [];
    for (let k = 0; k < itemCount; k++) {
      const p = pick(MOCK_PRODUCTS);
      const card = chance(0.45);
      items.push({
        type: p.product_type,
        name: p.name,
        price: p.price,
        message_card: card ? "추가" : "없음",
        message_card_content: card ? pick(CARD_MESSAGES) : null,
        shopping_bag: chance(0.35) ? "추가" : "없음",
        preservative: "없음",
        memo: null,
        product_id: p.id,
      });
    }

    const delivery = chance(0.35);
    const deliveryFee = delivery ? pick([5000, 7000, 10000]) : null;
    const itemsTotal = items.reduce(
      (s, it) => s + it.price + (it.message_card === "추가" ? MOCK_MESSAGE_CARD_PRICE : 0) + (it.shopping_bag === "추가" ? MOCK_SHOPPING_BAG_PRICE : 0),
      0,
    );
    const orderPath = itemCount > 1 ? "cart" : pick(["consult", "consult", "product_detail", "cart", "manual"] as const);
    const consult = orderPath === "consult";
    const gift = consult || chance(0.6);

    // 상태
    let status: Reservation["status"];
    if (cancelIdx.has(i)) status = "취소";
    else if (month <= 10) status = "픽업/배송완료";
    else if (month === 11) {
      status = date < todayStr ? "픽업/배송완료" : date === todayStr ? "제작완료" : "준비중";
      if (date === todayStr && time === "10:00") status = "픽업/배송완료";
      if (date === todayStr && time === "18:00") status = "미확인";
      if (date === todayStr && time === "15:30") status = "준비중";
    }
    else status = "준비중";
    const payLinkDemo = month === 11 && date === todayStr && time === "15:30";
    if (status === "제작완료" || status === "픽업/배송완료") items.forEach((it) => { if (itemCount > 1) it.status = "제작완료"; });

    // 접수 시각 — 수령일 1~7일 전
    const created = new Date(year, month - 1, day - 1 - Math.floor(rand() * 7), 9 + Math.floor(rand() * 12), Math.floor(rand() * 60));
    const nameIdx = (i * 7 + month) % NAMES.length;
    const name = NAMES[nameIdx];
    // 난수 순서를 바꾸지 않으려고 뽑기는 그대로 두고, 전화번호는 손님마다 고정 (같은 손님 = 단골로 묶이게)
    void `010-${1000 + Math.floor(rand() * 9000)}-${1000 + Math.floor(rand() * 9000)}`;
    const phone = customerPhone(nameIdx);

    list.push({
      id: `m${month}-${i}`,
      created_at: created.toISOString(),
      status,
      orderer_name: name,
      orderer_phone: phone,
      items,
      quantity: itemCount,
      paid: !payLinkDemo,
      final_price: itemsTotal + (deliveryFee ?? 0),
      purpose: gift ? pick(PURPOSES) : "",
      recipient_gender: gift ? pick(["여성", "여성", "남성"]) : "",
      recipient_age: gift ? pick(AGES) : "",
      relationship: "",
      mood: consult ? (findMockProduct(items[0].product_id)?.mood ?? "") : "",
      budget: consult ? pick(BUDGETS) : "",
      channel: null,
      delivery_type: delivery ? "배송" : "픽업",
      delivery_fee: deliveryFee,
      admin_memo: null,
      cancel_reason: status === "취소" ? pick(CANCEL_REASONS) : null,
      desired_date: date,
      desired_time: time,
      requests: chance(0.3) ? pick(REQUESTS) : null,
      recipient_name: delivery ? pick(RECIPIENTS) : null,
      recipient_phone: delivery ? `010-${1000 + Math.floor(rand() * 9000)}-${1000 + Math.floor(rand() * 9000)}` : null,
      address: delivery ? pick(ADDRESSES) : null,
      address_detail: delivery ? pick(ADDRESS_DETAILS) : null,
      customer_profile_id: `cp-${nameIdx}`,
      reference_images: null,
      order_path: payLinkDemo ? "manual" : orderPath,
      // 난수 순서가 바뀌지 않게 뽑기는 원래대로 하고, 결제 링크 예시 예약만 비운다 (사장님이 직접 추가한 예약은 유입 기록 없음)
      traffic_source: ((src) => (payLinkDemo ? null : src))(orderPath === "manual" ? null : pick(SOURCES)),
      payment_token: null,
      payment_link_expires_at: null,
      payment_id: null,
      settlement_id: null,
    });
  }
  return list;
}

/** 9~12월 목업 예약 전체 (오늘 = 2026-11-10 고정) */
export function makeMockReservations(): Reservation[] {
  return [9, 10, 11, 12].flatMap((m) => makeMonth(2026, m, PREVIEW_TODAY_STR));
}
