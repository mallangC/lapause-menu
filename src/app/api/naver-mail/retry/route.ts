import { blockIfInactive } from "@/lib/requireActiveCompany";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processNaverMail } from "@/lib/naverMailIngest";

export const dynamic = "force-dynamic";

// '확인이 필요한 네이버 예약 메일' 다시 읽기 — 사장님 본인 매장 메일만 (보관된 원문으로 다시 처리)
// 처리되면(예약 추가·취소·이미 있음) 보관함에서 내리고, 또 못 읽으면 사유만 새로 적는다
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const { id } = ((await request.json().catch(() => null)) ?? {}) as { id?: string };
  if (!id) return NextResponse.json({ error: "메일이 없어요." }, { status: 400 });

  // 본인 매장 메일인지 — RLS로 읽히는 것만
  const { data: row } = await supabase.from("naver_mail_inbox").select("id, company_id, subject, body, status").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "메일을 찾지 못했어요." }, { status: 404 });

  const db = createAdminClient();
  { const blocked = await blockIfInactive(row.company_id as string); if (blocked) return blocked; } // 구독이 끝난 매장은 보기만
  const result = await processNaverMail(db, row.company_id as string, row.body as string, { subject: row.subject as string | null, inboxId: row.id as string });
  if (!result.kept) await db.from("naver_mail_inbox").update({ status: "done" }).eq("id", row.id);
  return NextResponse.json(result);
}
