import { NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { generateOtpCode, CODE_TTL_MINUTES, RESEND_COOLDOWN_SECONDS } from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

async function sendCodeEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "Flo.Aide <noreply@flo-aide.com>",
      to,
      subject: `[Flo.Aide] 로그인 인증번호 ${code}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0ea;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:32px 16px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;font-family:'Apple SD Gothic Neo',sans-serif;">
      <tr><td style="background:#2c2416;padding:28px 32px;text-align:center;">
        <img src="https://www.flo-aide.com/logo-light.png" alt="Flo.Aide" height="28" style="display:block;margin:0 auto;filter:brightness(0) invert(1);" />
      </td></tr>
      <tr><td style="background:#c9a96e;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:32px 32px 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:14px;color:#6b5c4a;">로그인 인증번호입니다. ${CODE_TTL_MINUTES}분 안에 입력해주세요.</p>
        <p style="margin:16px 0;font-size:32px;font-weight:700;letter-spacing:6px;color:#2c2416;">${code}</p>
        <p style="margin:0;font-size:12px;color:#9a8a7a;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    }),
  }).catch((err) => console.error("[2fa/send-code] 이메일 발송 실패:", err));
}

export async function POST() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 너무 짧은 간격으로 재발송 요청 시 차단
  const { data: recent } = await adminClient
    .from("login_otp_codes")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - new Date(recent.created_at).getTime() < RESEND_COOLDOWN_SECONDS * 1000) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await adminClient.from("login_otp_codes").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendCodeEmail(user.email, code);

  return NextResponse.json({ ok: true });
}
