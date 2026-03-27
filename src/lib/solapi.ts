import { SolapiMessageService } from "solapi";

const client = new SolapiMessageService(
  process.env.SOLAPI_API_KEY!,
  process.env.SOLAPI_API_SECRET!
);

const PFID = process.env.SOLAPI_PFID!;
const SENDER = process.env.SOLAPI_SENDER_PHONE!;

// 검수 완료 후 템플릿 ID 입력
const TEMPLATES = {
  /** 고객 → 예약 확정 시 발송 */
  RESERVATION_RECEIVED: "KA01TP260326063623079sya42My8HXv",
  /** 사장님 → 새 예약 접수 시 발송 */
  RESERVATION_CONFIRMED_OWNER: "KA01TP260326133524843omlSt2W5DcZ",
  /** 고객 → 예약 취소 시 발송 */
  RESERVATION_CANCELLED: "KA01TP260326064935575n6c296qNkqi",
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
}) {
  return sendAlimtalk({
    to,
    templateId: TEMPLATES.RESERVATION_RECEIVED,
    variables: {
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
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${slug}/admin/dashboard`;
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
      "#{LINK}": dashboardUrl,
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
