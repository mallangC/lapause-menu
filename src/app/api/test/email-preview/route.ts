import { NextRequest, NextResponse } from "next/server";

// 개발 환경 전용 이메일 미리보기
// 사용법: GET /api/test/email-preview?type=charge_success|charge_retry|charge_final
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "charge_success";

  const companyName = "라포즈 플뢰르";
  const planLabel = "Pro";
  const amount = 9900;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const errorMessage = "잔액 부족";
  const retryCount = 1;
  const maxRetry = 2;

  function header() {
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f0ea;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:32px 16px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;font-family:'Apple SD Gothic Neo',sans-serif;">
      <tr>
        <td style="background:#2c2416;padding:28px 32px;text-align:center;">
          <img src="https://www.flo-aide.com/logo-light.png" alt="Flo.Aide" height="28" style="display:block;margin:0 auto;filter:brightness(0) invert(1);" />
        </td>
      </tr>
      <tr><td style="background:#c9a96e;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
  }

  function footer() {
    return `      <tr>
        <td style="background:#faf7f2;border-top:1px solid #ede8e0;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b0a090;">본 메일은 자동 발송된 메일입니다. · <a href="https://www.flo-aide.com" style="color:#9a7a3a;text-decoration:none;">flo-aide.com</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
  }

  let html = "";

  if (type === "charge_success") {
    html = `${header()}
      <tr>
        <td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#2c2416;">구독 결제 완료</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b5c4a;">안녕하세요, <strong>${companyName}</strong> 관리자님.<br>아래 내역으로 결제가 정상 완료되었습니다.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ede8e0;border-radius:12px;overflow:hidden;font-size:14px;">
            <tr style="background:#faf7f2;">
              <td style="padding:12px 16px;color:#9a7a3a;font-weight:600;width:40%;">플랜</td>
              <td style="padding:12px 16px;color:#2c2416;font-weight:700;">${planLabel}</td>
            </tr>
            <tr style="border-top:1px solid #ede8e0;">
              <td style="padding:12px 16px;color:#9a7a3a;font-weight:600;">결제 금액</td>
              <td style="padding:12px 16px;color:#2c2416;font-weight:700;">₩${amount.toLocaleString()}</td>
            </tr>
            <tr style="border-top:1px solid #ede8e0;">
              <td style="padding:12px 16px;color:#9a7a3a;font-weight:600;">다음 결제일</td>
              <td style="padding:12px 16px;color:#2c2416;font-weight:700;">${expiresAt.toLocaleDateString("ko-KR")}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="https://www.flo-aide.com" style="display:inline-block;background:#6b5c4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">대시보드 바로가기</a>
        </td>
      </tr>
${footer()}`;
  } else if (type === "charge_retry") {
    const isLastRetry = retryCount === maxRetry;
    html = `${header()}
      <tr>
        <td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#d97706;">결제 실패 알림</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b5c4a;">안녕하세요, <strong>${companyName}</strong> 관리자님.<br>${planLabel} 구독 결제에 실패했습니다.</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">실패 사유</p>
            <p style="margin:0;font-size:13px;color:#78350f;">${errorMessage}</p>
          </div>
          <p style="margin:0;font-size:14px;color:#6b5c4a;">
            ${isLastRetry
              ? "내일 마지막으로 한 번 더 시도합니다. 계속 실패할 경우 구독이 자동 해지됩니다."
              : "24시간 후 자동으로 재시도됩니다."
            }<br>카드 잔액 및 유효기간을 확인해주세요.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="https://www.flo-aide.com" style="display:inline-block;background:#6b5c4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">카드 정보 확인하기</a>
        </td>
      </tr>
${footer()}`;
  } else if (type === "charge_final") {
    html = `${header()}
      <tr>
        <td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#c0392b;">구독 해지 안내</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b5c4a;">안녕하세요, <strong>${companyName}</strong> 관리자님.<br>3회 결제 시도가 모두 실패하여 구독이 자동 해지되었습니다.</p>
          <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#c0392b;">실패 사유</p>
            <p style="margin:0;font-size:13px;color:#7f1d1d;">${errorMessage}</p>
          </div>
          <p style="margin:0;font-size:14px;color:#6b5c4a;">카드 잔액이나 유효기간을 확인하신 후 대시보드에서 다시 구독해주세요.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="https://www.flo-aide.com" style="display:inline-block;background:#6b5c4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">대시보드 바로가기</a>
        </td>
      </tr>
${footer()}`;
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
