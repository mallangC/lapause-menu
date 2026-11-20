import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mailHtmlToText, naverMailKeyOf } from "@/lib/naverMail";
import { processNaverMail } from "@/lib/naverMailIngest";

export const dynamic = "force-dynamic";

// 네이버 예약 메일 받기 — Cloudflare 이메일 라우팅 → 워커(email) → 여기 (내부 비밀값으로만)
// · 예약 확정 메일 → 예약 추가 (채널 네이버 · 준비중 · 연락처 없음 · 손님 알림톡 없음 · 정산 제외)
// · 고객 취소 메일 → 같은 예약번호의 예약을 취소 (환불은 네이버가 이미 했다 — 우리 쪽 환불 없음)
// · 그 외·처리 못 한 메일 → '확인이 필요한 네이버 메일'로 보관 (사장님 메일함을 거치지 않으니 버리지 않는다)

interface Body {
  to?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
}

/** 네이버가 보낸 메일인지 (보낸 주소 도메인) */
const fromNaver = (from: string) => /@([a-z0-9-]+\.)*(naver\.com|navercorp\.com)>?\s*$/i.test(from.trim());

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = ((await request.json().catch(() => null)) ?? {}) as Body;
  const key = naverMailKeyOf(body.to ?? "");
  if (!key) return NextResponse.json({ ok: false, reason: "unknown address" });

  const db = createAdminClient();
  const { data: setting } = await db.from("company_settings").select("company_id").eq("naver_mail_key", key).maybeSingle();
  if (!setting) return NextResponse.json({ ok: false, reason: "unknown store" });
  const companyId = setting.company_id as string;

  // 네이버가 아닌 곳에서 온 메일은 예약으로 만들지 않는다 (가짜 예약 방지)
  if (!fromNaver(body.from ?? "")) {
    console.warn("[naver-mail] 네이버가 아닌 발신자:", body.from);
    return NextResponse.json({ ok: false, reason: "not from naver" });
  }

  // 연결 상태 — 마지막으로 받은 시각
  await db.from("company_settings").update({ naver_mail_last_at: new Date().toISOString() }).eq("company_id", companyId);

  const text = (body.text && body.text.trim()) || mailHtmlToText(body.html ?? "");
  const result = await processNaverMail(db, companyId, text, { subject: body.subject ?? null });
  return NextResponse.json(result);
}
