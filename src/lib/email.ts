export interface ReservationEmailData {
  companyName: string;
  slug: string;
  ordererName: string;
  ordererPhone: string;
  channel?: string | null;
  deliveryType: string;
  desiredDatetime?: string;
  productType?: string;
  finalPrice?: number;
  paid?: boolean;
}

export function buildReservationNotificationHtml(
  data: ReservationEmailData,
  baseUrl: string
): string {
  const { companyName, slug, ordererName, ordererPhone, channel, deliveryType, desiredDatetime, productType, finalPrice, paid } = data;

  const rows: [string, string][] = [
    ["예약자", `${ordererName}&nbsp;/&nbsp;${ordererPhone}`],
    ...(channel ? [["채널", channel] as [string, string]] : []),
    ["수령 방법", deliveryType],
    ...(desiredDatetime ? [["희망 일시", desiredDatetime] as [string, string]] : []),
    ...(productType ? [["상품 유형", productType] as [string, string]] : []),
    ...(finalPrice != null ? [["최종 가격", `${finalPrice.toLocaleString()}원`] as [string, string]] : []),
    ...(paid != null ? [["결제 상태", paid ? "결제완료" : "미결제"] as [string, string]] : []),
  ];

  const rowsHtml = rows.map(([label, value], i) => `
    <tr>
      <td style="padding:11px 18px;background:#faf7f2;color:#999;font-size:13px;width:100px;vertical-align:top;white-space:nowrap;${i < rows.length - 1 ? "border-bottom:1px solid #f0ebe3;" : ""}">${label}</td>
      <td style="padding:11px 18px;color:#2c2416;font-size:13px;${i < rows.length - 1 ? "border-bottom:1px solid #f0ebe3;" : ""}">${value}</td>
    </tr>`).join("");

  const dashboardUrl = `${baseUrl}/${slug}/admin/dashboard`;

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ede9e2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(44,36,22,0.10);">

    <div style="background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%);padding:28px 32px 24px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.70);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">New Reservation</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">${companyName}</h1>
    </div>

    <div style="padding:28px 32px 20px;">
      <p style="margin:0 0 22px;color:#7a6f64;font-size:14px;line-height:1.7;">
        <strong style="color:#2c2416;">${ordererName}</strong>님의 새로운 예약이 접수되었습니다.
      </p>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #ede8e0;">
        ${rowsHtml}
      </table>
    </div>

    <div style="padding:4px 32px 32px;text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#c9a96e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
        대시보드에서 확인하기
      </a>
    </div>

    <div style="padding:16px 32px;background:#faf7f2;border-top:1px solid #f0ebe3;text-align:center;">
      <p style="margin:0;font-size:11px;color:#c0b8ae;">고객에게 직접 연락하여 예약을 확정해 주세요.</p>
    </div>
  </div>
</body>
</html>`;
}
