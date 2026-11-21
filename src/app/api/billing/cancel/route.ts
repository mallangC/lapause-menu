import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 구독 해지 예약 / 해지 취소 — 사장님은 구독을 직접 고칠 수 없어(DB 규칙) 서버에서 '해지 예약' 칸만 바꾼다
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, cancel } = ((await request.json().catch(() => null)) ?? {}) as { companyId?: string; cancel?: boolean };
  if (!companyId || typeof cancel !== "boolean") return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });

  // 본인 매장만
  const { data: own } = await supabase.from("companies").select("id").eq("id", companyId).eq("owner_id", user.id).maybeSingle();
  if (!own) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await createAdminClient()
    .from("company_subscriptions")
    .update({ cancel_at_period_end: cancel })
    .eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
