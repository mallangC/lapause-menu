import { SolapiMessageService } from "solapi";

// 검수 완료 후 템플릿 ID 입력
const TEMPLATES = {
  /** 고객 → 예약 확정 시 발송 (#{주차정보} 줄 · [주문 확인하기] 버튼 https://www.flo-aide.com/#{LINK}, #{LINK} = 매장/order/주문코드) */
  RESERVATION_RECEIVED: "KA01TP261119215013966yyrjZOj2BJf",
  /** 사장님 → 새 예약 접수 시 발송 (#{결제방법} 줄 포함) */
  RESERVATION_CONFIRMED_OWNER: "KA01TP261107025454875hEQUY4ULrB4",
  /** 고객 → 예약 취소 시 발송 */
  RESERVATION_CANCELLED: "KA01TP260326064935575n6c296qNkqi",
  /** 사장님 → 링크결제 완료 시 발송 */
  PAYMENT_COMPLETED_OWNER: "KA01TP260901111604774ZUP03d7NvDR",
  /**
   * 운영자 → 매장이 판매 신청을 하면 발송 (#{매장명} #{신청시각} · 버튼: 운영자 페이지)
   * 검수 통과 후 ID를 넣으면 알림톡으로 보낸다. 비어 있으면 문자(SMS)로 보낸다.
   */
  SALES_APPLY_OPERATOR: "KA01TP261119083541146Cb4eZJLJMir",
  /** 사장님 → 판매 신청 결과(승인·반려) 안내 (#{매장명} #{결과} #{안내내용} #{LINK} · 버튼: 대시보드 보기) */
  SALES_APPLY_RESULT: "KA01TP261115063704558CL1eqMa9TUi",
};

type AlimtalkButton = {
  buttonType: "WL";
  buttonName: string;
  linkMo: string;
  linkPc: string;
};

/**
 * 알림톡 #{상품유형} 값 — 상품 유형으로 짧게 (수량도 개수로 센다)
 * · 1개: "꽃다발"
 * · 모두 같은 유형: "꽃다발 2건"
 * · 다른 유형이 섞임: "꽃다발 외 2건" (첫 상품 유형 + 나머지 개수)
 */
export function productTypeSummary(items: { type?: string | null; quantity?: number | null }[] | null | undefined): string {
  const list = (items ?? []).filter(Boolean);
  if (list.length === 0) return "";
  const qty = (i: { quantity?: number | null }) => Math.max(1, Number(i.quantity) || 1);
  const total = list.reduce((s, i) => s + qty(i), 0);
  const first = list[0].type || "상품";
  if (total === 1) return first;
  const sameType = list.every((i) => (i.type || "상품") === first);
  return sameType ? `${first} ${total}건` : `${first} 외 ${total - 1}건`;
}

async function sendAlimtalk({
  to,
  templateId,
  variables,
  buttons,
}: {
  to: string;
  templateId: string;
  variables: Record<string, string>;
  buttons?: AlimtalkButton[];
}) {
  const client = new SolapiMessageService(
    process.env.SOLAPI_API_KEY!,
    process.env.SOLAPI_API_SECRET!
  );
  const PFID = process.env.SOLAPI_PFID!;
  const SENDER = process.env.SOLAPI_SENDER_PHONE!;
  return client.sendOne({
    to,
    from: SENDER,
    kakaoOptions: {
      pfId: PFID,
      templateId,
      variables,
      ...(buttons ? { buttons } : {}),
    },
  });
}

/** 고객에게 예약 확정 알림 발송 */
export async function sendReservationReceived({
  to,
  ordererName,
  companyName,
  finalPrice,
  productType,
  deliveryType,
  desiredDateTime,
  companyPhone,
  companyAddress,
  parking,
  afterHoursNote,
  unattendedNote,
  orderLink,
}: {
  to: string;
  ordererName: string;
  companyName: string;
  finalPrice: number;
  productType: string;
  deliveryType: string;
  desiredDateTime: string;
  companyPhone: string;
  companyAddress: string;
  /** 매장 주차 정보 ('주차 가능' | '잠시 주차 가능' | '주차 불가' | 사장님이 직접 쓴 안내 | null) */
  parking?: string | null;
  /** 영업시간 외 수령 주문이면 사장님이 써 둔 안내 (아니면 null) */
  afterHoursNote?: string | null;
  /** 무인 픽업 주문이면 사장님이 써 둔 가져가는 방법 (아니면 null) */
  unattendedNote?: string | null;
  /** 주문 확인 페이지 경로 '매장/order/주문코드' — [주문 확인하기] 버튼 #{LINK} */
  orderLink: string;
}) {
  // #{주차정보} 칸 — 주문에 맞는 안내를 줄줄이 (마지막 연락 줄은 늘 들어가서 칸이 비지 않는다)
  //  · 주차 정보가 있으면 → 주차 : 가능
  //  · 영업시간 외 수령이면 → [영업시간 외 수령 안내] + 사장님 안내
  //  · 무인 픽업이면 → [무인 픽업 안내] + 사장님 안내
  //  · 항상 → 궁금한 점은 매장으로 연락 주세요 : 전화번호
  const PARKING_LINE: Record<string, string> = { "주차 가능": "주차 : 가능", "잠시 주차 가능": "주차 : 잠시 가능", "주차 불가": "주차 : 불가" };
  const lines: string[] = [];
  // 정해진 세 가지는 짧게, 사장님이 직접 쓴 안내는 그대로
  if (parking?.trim()) lines.push(PARKING_LINE[parking] ?? `주차 : ${parking.trim()}`);
  if (afterHoursNote?.trim()) lines.push(`[영업시간 외 수령 안내]\n${afterHoursNote.trim()}`);
  if (unattendedNote?.trim()) lines.push(`[무인 픽업 안내]\n${unattendedNote.trim()}`);
  lines.push(companyPhone ? `궁금한 점은 매장으로 연락 주세요 : ${companyPhone}` : "궁금한 점은 매장으로 연락 주세요.");
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.RESERVATION_RECEIVED,
    variables: {
      "#{LINK}": orderLink,
      "#{주차정보}": lines.join("\n"),
      "#{고객성함}": ordererName,
      "#{매장명}": companyName,
      "#{상품유형}": productType,
      "#{수령방법}": deliveryType,
      "#{수령일시}": desiredDateTime,
      "#{주문금액}": `${finalPrice.toLocaleString()}원`,
      "#{매장전화번호}": companyPhone,
      "#{매장주소}": companyAddress,
    },
  });
}

/** 사장님에게 새 예약 접수 알림 발송 */
export async function sendReservationConfirmedOwner({
  to,
  companyName,
  productType,
  deliveryType,
  desiredDateTime,
  finalPrice,
  ordererName,
  ordererPhone,
  requests,
  paymentMethod,
  slug,
}: {
  to: string;
  companyName: string;
  productType: string;
  deliveryType: string;
  desiredDateTime: string;
  finalPrice: number;
  ordererName: string;
  ordererPhone: string;
  requests: string;
  /** 결제 방법 — transfer(무통장 입금)면 입금 확인이 필요하다고 함께 알린다 */
  paymentMethod: "card" | "transfer";
  slug: string;
}) {
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.RESERVATION_CONFIRMED_OWNER,
    variables: {
      "#{매장명}": companyName,
      "#{상품유형}": productType,
      "#{수령방법}": deliveryType,
      "#{수령일시}": desiredDateTime,
      "#{주문금액}": `${finalPrice.toLocaleString()}원`,
      // 관리자 예약 상세와 같은 이름 (무통장 입금은 사장님이 입금을 확인해야 확정)
      "#{결제방법}": paymentMethod === "transfer" ? "무통장 입금 · 입금 확인 필요" : "카드·간편결제",
      "#{고객성함}": ordererName,
      "#{고객번호}": ordererPhone,
      "#{요청사항내용}": requests || "없음",
      "#{LINK}": slug,
    },
  });
}

/** 사장님에게 링크결제 완료 알림 발송 */
export async function sendPaymentCompletedOwner({
  to,
  companyName,
  ordererName,
  ordererPhone,
  productType,
  deliveryType,
  desiredDateTime,
  finalPrice,
}: {
  to: string;
  companyName: string;
  ordererName: string;
  ordererPhone: string;
  productType: string;
  deliveryType: string;
  desiredDateTime: string;
  finalPrice: number;
}) {
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.PAYMENT_COMPLETED_OWNER,
    variables: {
      "#{매장명}": companyName,
      "#{고객성함}": ordererName,
      "#{고객번호}": ordererPhone,
      "#{상품유형}": productType,
      "#{수령방법}": deliveryType,
      "#{수령일시}": desiredDateTime,
      "#{주문금액}": `${finalPrice.toLocaleString()}원`,
    },
  });
}

/** 고객에게 예약 취소 알림 발송 */
export async function sendReservationCancelled({
  to,
  ordererName,
  companyName,
  productType,
  finalPrice,
  cancelReason,
  companyPhone,
}: {
  to: string;
  ordererName: string;
  companyName: string;
  productType: string;
  finalPrice: number;
  cancelReason: string;
  companyPhone: string;
}) {
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.RESERVATION_CANCELLED,
    variables: {
      "#{고객성함}": ordererName,
      "#{매장명}": companyName,
      "#{상품유형}": productType,
      "#{주문금액}": `${finalPrice.toLocaleString()}원`,
      "#{취소사유}": cancelReason,
      "#{매장전화번호}": companyPhone,
    },
  });
}

/**
 * 운영자 → 판매 신청 접수 알림 (받는 번호: 보내는 번호와 같은 SOLAPI_SENDER_PHONE — 운영자 휴대폰)
 * 알림톡 템플릿(SALES_APPLY_OPERATOR)이 검수 전이면 같은 내용을 문자로 보낸다.
 */
export async function sendSalesApplyOperator({ companyName, slug }: { companyName: string; slug: string }) {
  const to = process.env.SOLAPI_SENDER_PHONE?.replace(/\D/g, "");
  if (!to) return;
  const at = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const adminUrl = "https://flo-aide.com/admin/dashboard";
  if (TEMPLATES.SALES_APPLY_OPERATOR) {
    return sendAlimtalk({
      to,
      templateId: TEMPLATES.SALES_APPLY_OPERATOR,
      // 버튼(운영자 페이지)은 템플릿에 들어 있다
      variables: { "#{매장명}": companyName, "#{신청시각}": at },
    });
  }
  const client = new SolapiMessageService(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!);
  return client.sendOne({
    to,
    from: process.env.SOLAPI_SENDER_PHONE!,
    text: `[Flo.Aide] 판매 신청 접수\n${companyName}(${slug}) 매장이 판매 신청을 했어요.\n${at}\n${adminUrl}`,
  });
}

/**
 * 사장님 → 판매 신청 결과 안내 (승인·반려 하나의 템플릿)
 * · 승인 + 승인되면 바로 시작: 판매가 시작됐다고
 * · 승인 + 바로 시작 안 함: 판매 설정에서 켜면 된다고
 * · 반려: (반려 사유) 고쳐서 다시 신청
 */
export async function sendSalesApplyResult({
  to,
  companyName,
  slug,
  approved,
  autoStarted,
  reason,
}: {
  to: string;
  companyName: string;
  slug: string;
  approved: boolean;
  autoStarted?: boolean;
  reason?: string;
}) {
  const guide = approved
    ? autoStarted
      ? "판매가 시작되었습니다. 이제 손님이 메뉴판에서 바로 주문·결제할 수 있습니다."
      : "판매 설정에서 판매를 켜시면 손님이 메뉴판에서 바로 주문·결제할 수 있습니다."
    : `(${(reason ?? "").trim()}) 내용을 고쳐 다시 신청해 주세요.`;
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.SALES_APPLY_RESULT,
    variables: {
      "#{매장명}": companyName,
      "#{결과}": approved ? "승인" : "반려",
      "#{안내내용}": guide,
      "#{LINK}": slug,
    },
  });
}
