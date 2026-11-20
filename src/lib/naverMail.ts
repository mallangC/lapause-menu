// 네이버 예약 알림 메일 읽기 — 예약 확정 / 고객 취소 메일을 예약 정보로 (형식이 정해져 있어 규칙으로 읽는다)
// 메일에는 연락처가 없고 이름 가운데가 가려져 있다 (최*재) — 손님 안내는 네이버가 하므로 그대로 저장한다

/** 매장마다 받는 주소의 도메인 — Cloudflare 이메일 라우팅을 켠 도메인과 같아야 한다 */
export const NAVER_MAIL_DOMAIN = "booking.flo-aide.com";
/** 매장 받는 주소 */
export const naverMailAddress = (key: string) => `n-${key}@${NAVER_MAIL_DOMAIN}`;
/** 받는 주소에서 매장 코드 꺼내기 */
export const naverMailKeyOf = (to: string) => to.trim().toLowerCase().match(/^n-([a-z0-9]{6,40})@/)?.[1] ?? null;

export interface NaverMailItem {
  name: string;
  quantity: number;
  /** 이 줄 금액 (수량만큼 더한 값) */
  amount: number;
}

export interface NaverMail {
  kind: "confirm" | "cancel" | "unknown";
  storeName: string | null;
  bookingId: string | null;
  /** 가려진 이름 그대로 (최*재) */
  name: string | null;
  /** 예약상품 (예: 꽃다발) */
  productType: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM (24시간) */
  time: string | null;
  paid: boolean;
  payMethod: string | null;
  amount: number | null;
  /** 금액이 있는 상품 줄 */
  items: NaverMailItem[];
  /** 0원 줄 (쿠폰·안내 옵션 등) — 요청 사항에 함께 남긴다 */
  extras: string[];
  requests: string | null;
  cancelReason: string | null;
  refundAmount: number | null;
}

/** 메일 HTML → 줄글 (표의 칸은 탭, 줄은 줄바꿈) */
export function mailHtmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|table)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

const won = (s: string | null | undefined) => {
  const n = Number((s ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && (s ?? "").match(/\d/) ? n : null;
};

export function parseNaverMail(raw: string): NaverMail {
  const lines = raw
    // 메일 본문 속 HTML 주석(<!-- 아웃룩용 … -->, <!--[if mso]> …)은 화면에 안 보이는 글 — 먼저 지운다
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/ /g, " ").trim())
    .filter(Boolean);
  // '항목    값' (탭·여러 칸으로 나뉨). 값이 다음 줄에 있으면(표가 줄로 풀린 경우) 다음 줄
  const field = (label: string): string | null => {
    const i = lines.findIndex((l) => l === label || l.startsWith(`${label} `) || l.startsWith(`${label}\t`));
    if (i < 0) return null;
    const rest = lines[i].slice(label.length).trim();
    if (rest) return rest;
    return lines[i + 1] ?? null;
  };
  const all = lines.join("\n");
  const kind: NaverMail["kind"] = /예약이\s*확정\s*되었습니다/.test(all) ? "confirm" : /예약을\s*취소\s*하셨습니다/.test(all) ? "cancel" : "unknown";

  // 이용일시 — 2026.12.05.(토) 오후 1:00, 1명
  const when = field("이용일시") ?? "";
  const d = when.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  const t = when.match(/(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  let time: string | null = null;
  if (t) {
    let h = Number(t[2]);
    if (t[1] === "오후" && h < 12) h += 12;
    if (t[1] === "오전" && h === 12) h = 0;
    time = `${String(h).padStart(2, "0")}:${t[3]}`;
  }

  // 결제금액 — **메세지카드 쿠폰 사용 필수 안내(1)0원 + 소형 꽃다발(1)40,000원 = 40,000원
  const payLine = (field("결제금액") ?? "").replace(/^\*+/, "");
  const [partsText, totalText] = payLine.split("=");
  const items: NaverMailItem[] = [];
  const extras: string[] = [];
  for (const part of (partsText ?? "").split(/\s\+\s/)) {
    const m = part.trim().replace(/^\*+/, "").match(/^(.+?)\((\d+)\)\s*([\d,]+)원$/);
    if (!m) continue;
    const amount = Number(m[3].replace(/,/g, ""));
    const entry = { name: m[1].trim(), quantity: Number(m[2]), amount };
    if (amount > 0) items.push(entry);
    else extras.push(entry.name);
  }

  // 매장 이름 — '새로운 예약이 확정…' / '고객님이 예약을 취소…' 바로 위 줄 (없으면 첫 줄)
  const headIdx = lines.findIndex((l) => /예약이\s*확정\s*되었습니다|예약을\s*취소\s*하셨습니다/.test(l));
  const storeName = (headIdx > 0 ? lines[headIdx - 1] : lines[0]) ?? null;
  const bookingId = (field("예약번호") ?? "").match(/\d{6,}/)?.[0] ?? null;
  const payStatus = field("결제상태") ?? "";
  return {
    kind,
    storeName,
    bookingId,
    name: (field("예약자명") ?? "").replace(/님$/, "").trim() || null,
    productType: field("예약상품"),
    date: d ? `${d[1]}-${d[2].padStart(2, "0")}-${d[3].padStart(2, "0")}` : null,
    time,
    paid: /결제\s*완료/.test(payStatus),
    payMethod: field("결제수단"),
    amount: won(totalText) ?? (items.length ? items.reduce((s, i) => s + i.amount, 0) : null),
    items,
    extras,
    requests: field("요청사항"),
    cancelReason: field("취소사유"),
    refundAmount: won(field("환불금액")),
  };
}
