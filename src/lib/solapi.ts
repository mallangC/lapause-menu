import { SolapiMessageService } from "solapi";

// 검수 완료 후 템플릿 ID 입력
const TEMPLATES = {
  /** 고객 → 예약 확정 시 발송 */
  RESERVATION_RECEIVED: "KA01TP260326063623079sya42My8HXv",
  /**
   * 고객 → 예약 확정 시 발송 (매장 주소 아래 #{주차정보} 한 줄이 있는 새 템플릿)
   * 검수 통과 후 ID를 넣으면 위 템플릿 대신 이걸로 보낸다. 비어 있으면 기존 템플릿.
   */
  RESERVATION_RECEIVED_WITH_PARKING: "KA01TP2611060039104717O6R5PkzREo",
  /** 사장님 → 새 예약 접수 시 발송 */
  RESERVATION_CONFIRMED_OWNER: "KA01TP260326133524843omlSt2W5DcZ",
  /** 고객 → 예약 취소 시 발송 */
  RESERVATION_CANCELLED: "KA01TP260326064935575n6c296qNkqi",
  /** 사장님 → 링크결제 완료 시 발송 */
  PAYMENT_COMPLETED_OWNER: "KA01TP260901111604774ZUP03d7NvDR",
};

type AlimtalkButton = {
  buttonType: "WL";
  buttonName: string;
  linkMo: string;
  linkPc: string;
};

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
  /** 매장 주차 정보 ('주차 가능' | '잠시 주차 가능' | '주차 불가' | null) */
  parking?: string | null;
}) {
  // 주차 정보 한 줄 — 매장이 입력하지 않았으면 빈 값 (줄 자체가 비어 보이게)
  const PARKING_LINE: Record<string, string> = { "주차 가능": "주차 : 가능", "잠시 주차 가능": "주차 : 잠시 가능", "주차 불가": "주차 : 불가" };
  const withParking = !!TEMPLATES.RESERVATION_RECEIVED_WITH_PARKING;
  return sendAlimtalk({
    to,
    templateId: withParking ? TEMPLATES.RESERVATION_RECEIVED_WITH_PARKING : TEMPLATES.RESERVATION_RECEIVED,
    variables: {
      ...(withParking ? { "#{주차정보}": (parking && PARKING_LINE[parking]) || "" } : {}),
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
