// 유입 출처(?utm_source= / ?from=)와 주문 경로 — 클라이언트·서버 공통

export type OrderPath = "cart" | "product_detail" | "recommend" | "owner_style" | "photo_request" | "intro_photo" | "manual" | "pay_link";

export const ORDER_PATH_LABEL: Record<OrderPath, string> = {
  cart: "장바구니",
  product_detail: "상품 상세",
  // 추천받은 상품 중 골라서 한 주문 (첫 화면 대화의 추천, 예전 단계형 맞춤주문)
  recommend: "추천 주문",
  // 첫 화면 대화에서 상품 없이 한 주문
  owner_style: "사장님 스타일",
  photo_request: "사진 주문",
  // 첫 화면 대화의 매장 작품 사진을 눌러 바로 한 주문
  intro_photo: "첫 화면 사진",
  manual: "사장님 추가",
  pay_link: "링크결제",
};

/** 손님이 사이트에서 직접 한 주문 경로 (방문 대비 전환율 계산 대상) */
export const CUSTOMER_ORDER_PATHS: OrderPath[] = ["cart", "product_detail", "recommend", "owner_style", "photo_request", "intro_photo"];

// 자주 쓰는 표기를 하나로 묶는다 (insta, ig → instagram 등)
const ALIASES: Record<string, string> = {
  insta: "instagram",
  ig: "instagram",
  kakaotalk: "kakao",
  kakaochannel: "kakao",
  naverplace: "naver",
  yt: "youtube",
};

export const TRAFFIC_SOURCE_LABEL: Record<string, string> = {
  instagram: "인스타그램",
  naver: "네이버",
  blog: "블로그",
  kakao: "카카오톡",
  youtube: "유튜브",
  qr: "QR 코드",
  direct: "직접 유입",
};

export function trafficSourceLabel(source: string | null | undefined) {
  // 출처가 비어 있으면 직접 유입 (손님 주문은 늘 출처를 저장한다 — 비어 있는 건 사장님 추가·링크결제·예전 주문)
  if (!source) return TRAFFIC_SOURCE_LABEL.direct;
  return TRAFFIC_SOURCE_LABEL[source] ?? source;
}

/** 주소에 붙은 출처 값을 정리 — 영문 소문자·숫자·_- 만, 30자 이내. 형식이 맞지 않으면 null */
export function normalizeTrafficSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,30}$/.test(v)) return null;
  return ALIASES[v] ?? v;
}

// ── 브라우저 전용 ──

const sourceKey = (slug: string) => `flo_traffic_source_${slug}`;

/** 이번 방문(탭)에서 기억해 둔 유입 출처. 없으면 direct */
export function readTrafficSource(slug: string): string {
  try {
    return sessionStorage.getItem(sourceKey(slug)) ?? "direct";
  } catch {
    return "direct";
  }
}

export function saveTrafficSource(slug: string, source: string) {
  try {
    sessionStorage.setItem(sourceKey(slug), source);
  } catch {
    // 저장소를 쓸 수 없는 환경(사파리 개인정보 보호 모드 등)이면 출처 없이 진행
  }
}
