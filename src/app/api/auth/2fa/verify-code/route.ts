import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  DEVICE_COOKIE_NAME,
  REMEMBER_DAYS,
  UNREMEMBERED_HOURS,
  generateDeviceToken,
  hashToken,
} from "@/lib/twoFactor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, remember } = await request.json() as { code?: string; remember?: boolean };
  if (!code) return NextResponse.json({ error: "인증번호를 입력해주세요." }, { status: 400 });

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: otp } = await adminClient
    .from("login_otp_codes")
    .select("id, code, expires_at, consumed")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || otp.consumed || otp.code !== code || new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "인증번호가 올바르지 않거나 만료되었습니다." }, { status: 400 });
  }

  await adminClient.from("login_otp_codes").update({ consumed: true }).eq("id", otp.id);

  const token = generateDeviceToken();
  const days = remember ? REMEMBER_DAYS : UNREMEMBERED_HOURS / 24;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const { error: insertError } = await adminClient.from("trusted_devices").insert({
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
