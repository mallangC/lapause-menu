import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 운영 알림 — 확인 전 알림 목록 / [확인] (운영자만)
async function isOperator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  return data?.role === "operator";
}

export async function GET() {
  if (!(await isOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const { data, error } = await db
    .from("ops_alerts")
    .select("id, kind, title, detail, count, created_at, last_at, company:companies(name, slug)")
    .is("resolved_at", null)
    .order("last_at", { ascending: false })
    .limit(50);
  // 테이블이 아직 없으면(SQL 실행 전) 빈 목록
  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}

/** 확인 — id 하나 또는 전부(ids 없음) */
export async function POST(request: NextRequest) {
  if (!(await isOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = ((await request.json().catch(() => null)) ?? {}) as { id?: string };
  const db = createAdminClient();
  let q = db.from("ops_alerts").update({ resolved_at: new Date().toISOString() }).is("resolved_at", null);
  if (id) q = q.eq("id", id);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
