// 예약 추가 AI 채우기 — Gemini에 보내는 프롬프트와 응답 형식(JSON 스키마)
// 사장님이 톡톡·카톡·DM으로 받은 답변(매장마다 양식이 다르다)을 우리 예약 추가 폼 칸에 맞춰 바꾼다.
// 프롬프트 문구는 사장님과 함께 다듬는 중 — 바꿀 때는 이 파일만 고치면 된다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** 선물 용도 — 예약 추가 폼의 선택지 (기타는 직접 입력) */
export const PURPOSES = ["기념", "축하", "감사", "위로", "기타"] as const;

/** 한국 시간 기준 오늘 (연·월·일·요일) */
function kstToday(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate(), w: kst.getUTCDay() };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 날짜 기준표 — 오늘부터 3주치 '날짜(요일)'를 줄줄이 준다.
 * '내일', '이번 주 금요일', '다음 주 토요일', '25일' 같은 말을 AI가 직접 계산하지 않고 표에서 찾게 해 틀리지 않게 한다.
 */
export function dateGuide(now = new Date(), days = 21): string {
  const t = kstToday(now);
  const base = Date.UTC(t.y, t.m - 1, t.d);
  const lines: string[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(base + i * 86400000);
    const label = i === 0 ? " ← 오늘" : i === 1 ? " ← 내일" : i === 2 ? " ← 모레" : "";
    lines.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} (${WEEKDAYS[dt.getUTCDay()]})${label}`);
  }
  return lines.join("\n");
}

export interface ReservationPromptOptions {
  /** 이 매장의 상품 유형 (꽃다발·꽃바구니 등 — 이 중에서만 고르게) */
  productTypes: string[];
  /** 상품 분위기 목록 */
  moods: readonly string[];
  now?: Date;
}

/** 시스템 지시문 — 역할·날짜 규칙·칸 채우는 규칙 */
export function buildReservationPrompt({ productTypes, moods, now = new Date() }: ReservationPromptOptions): string {
  const t = kstToday(now);
  return `너는 꽃집 사장님을 돕는 예약 정리 도우미야.
사장님이 손님과 나눈 메시지(네이버 톡톡·카카오톡·인스타 DM 등, 매장마다 주문서 양식이 다름)를 읽고, 정해진 JSON 형식의 예약 정보로 정리해.

[오늘]
오늘은 ${t.y}년 ${t.m}월 ${t.d}일 ${WEEKDAYS[t.w]}요일이야 (한국 시간).

[날짜 기준표] — 날짜는 반드시 이 표에서 찾아서 써. 직접 계산하지 마.
${dateGuide(now)}

[날짜·시간 규칙]
- pickupDate는 "YYYY-MM-DD" 형식. 손님이 말한 날짜를 위 기준표에서 찾아 그대로 옮겨.
- "내일", "모레", "이번 주 금요일", "다음 주 토요일", "25일", "12/3" 같은 말은 기준표 기준으로 바꿔.
  · "이번 주 ○요일" = 오늘이 속한 주(월~일)의 그 요일. 이미 지났으면 다음 주 그 요일.
  · "다음 주 ○요일" = 다음 주(월~일)의 그 요일.
  · 연도 없이 월·일만 있으면 오늘 이후로 가장 가까운 날짜.
  · 날짜만 있고 요일이 함께 적혀 있는데 서로 맞지 않으면 날짜를 따르고, 맞지 않는다는 것을 requests에 적어.
- pickupTime은 24시간 "HH:mm" 형식. "오후 3시" → "15:00", "3시 반" → 꽃집 영업시간 기준으로 오후로 보고 "15:30".
- "점심때", "저녁쯤", "오후에", "아침" 처럼 시각 없이 대략만 적었으면 pickupTime은 null로 두고(사장님이 확인해서 정한다), 손님이 쓴 표현은 requests에 "수령 시간: 점심때"처럼 남겨.
  "저녁 7시"처럼 시각이 함께 있으면 그 시각을 따라.
- 그 외에 날짜나 시간을 알 수 없으면 null. 추측하지 마.

[칸 채우기 규칙]
- 메시지에 없는 정보는 null. 지어내지 마.
- ordererPhone, recipientPhone은 숫자만 (예: "01012345678").
- productType은 반드시 다음 중 하나 (맞는 게 없으면 null): ${productTypes.join(", ")}
- price는 원 단위 숫자. "5만원대", "5만원 정도" → 50000.
- mood는 다음 중 확실히 맞는 것만 (애매하면 null로 두고 원문은 requests에): ${moods.join(", ")}
- 쇼핑백·메시지카드·생화 수명연장제는 손님이 추가한다고 했으면 true, 안 한다고 했으면 false, 말이 없으면 null.
- messageCardContent는 카드에 적어 달라고 한 문구만 그대로.
- 배송 주소는 두 칸으로 나눠:
  · address — 도로명(또는 지번) 주소까지만. 시·구·도로명·건물번호. 도로명과 건물번호 사이는 한 칸 띄워 (예: "서울 송파구 양재대로 1218").
  · addressDetail — 그 뒤의 동·호수·층·건물 안 위치(예: "115동 806호", "3층"). 괄호 안 참고 항목(법정동·건물 이름, 예: "(방이동 올림픽선수기자촌아파트)")은 addressDetail 맨 뒤에 그대로 붙여 (예: "115동 806호 (방이동 올림픽선수기자촌아파트)").
  · 동·호수가 없으면 addressDetail은 참고 항목만, 그것도 없으면 null.
- purpose(선물 용도)는 반드시 다음 중 하나로 골라: ${PURPOSES.join(", ")}
  · 생일·생신·결혼·졸업·입학·승진·개업·합격·출산 → 축하 / 기념일·100일·결혼기념일 → 기념 / 고마움·스승의 날·감사 인사 → 감사 / 병문안·조문·위로 → 위로 / 어디에도 안 맞으면 기타
  · 손님이 쓴 원문(예: "어머니 생신", "여자친구 생일선물")은 requests에 "선물 용도: 어머니 생신"처럼 남겨.
- 위 칸에 들어가지 않는 정보(희망 색감·스타일 원문, 무인 픽업 요청, 향·알레르기, 포장 요청 등)는 requests에 한 줄씩 짧게 모아.

[매장 주문서 양식]
- 손님은 매장이 보낸 주문서 양식(예: "1. 주문자 성함/연락처: …")에 답을 채워 보내는 경우가 많아.
- 항목 이름과 그 옆 괄호 안의 안내(가격 "(2천원)", 가능 여부 "(영업시간 외 무인픽업 가능)", 글자 수 "(30자 내외)" 등)는 매장이 미리 써 둔 양식 문구야. 손님 답이 아니니 어떤 칸에도 넣지 마.
- 손님이 실제로 적은 답만 읽어. 항목에 답이 비어 있으면 그 칸은 null.`;
}

/** Gemini 응답 형식 — 이 모양으로만 답하게 한다 (responseSchema) */
export function reservationResponseSchema({ productTypes, moods }: Pick<ReservationPromptOptions, "productTypes" | "moods">) {
  const str = { type: "STRING", nullable: true };
  const bool = { type: "BOOLEAN", nullable: true };
  return {
    type: "OBJECT",
    properties: {
      ordererName: str,
      ordererPhone: str,
      productType: { type: "STRING", nullable: true, enum: productTypes },
      productName: str,
      price: { type: "INTEGER", nullable: true },
      pickupDate: { ...str, description: "YYYY-MM-DD" },
      pickupTime: { ...str, description: "HH:mm (24시간)" },
      deliveryType: { type: "STRING", nullable: true, enum: ["픽업", "배송"] },
      recipientName: str,
      recipientPhone: str,
      address: str,
      addressDetail: str,
      recipientGender: { type: "STRING", nullable: true, enum: ["여성", "남성", "부모님"] },
      recipientAge: { type: "STRING", nullable: true, enum: ["10대", "20대", "30대", "40대", "50대 이상"] },
      relationship: { type: "STRING", nullable: true, enum: ["연인", "가족", "친구", "직장동료/상사", "기타"] },
      purpose: { type: "STRING", nullable: true, enum: [...PURPOSES] },
      mood: { type: "STRING", nullable: true, enum: [...moods] },
      shoppingBag: bool,
      messageCard: bool,
      messageCardContent: str,
      preservative: bool,
      requests: str,
    },
    required: ["ordererName", "ordererPhone", "productType", "price", "pickupDate", "pickupTime", "requests"],
  };
}

/** AI가 정리한 예약 — 폼에 채울 값 (없으면 null) */
export interface ParsedReservation {
  ordererName: string | null;
  ordererPhone: string | null;
  productType: string | null;
  productName: string | null;
  price: number | null;
  pickupDate: string | null;
  pickupTime: string | null;
  deliveryType: "픽업" | "배송" | null;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string | null;
  /** 동·호수·층 + 괄호 참고 항목 (상세 주소 칸) */
  addressDetail: string | null;
  recipientGender: string | null;
  recipientAge: string | null;
  relationship: string | null;
  purpose: string | null;
  mood: string | null;
  shoppingBag: boolean | null;
  messageCard: boolean | null;
  messageCardContent: string | null;
  preservative: boolean | null;
  requests: string | null;
}
