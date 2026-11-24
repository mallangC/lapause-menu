import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendUnconfirmedReminderOwner } from "@/lib/solapi";
import { ownerWantsAlimtalk } from "@/lib/ownerAlimtalk";

export const dynamic = "force-dynamic";

// 매일 1회(크론, KST 밤 10시) 호출: 내일 받기로 한 손님 주문(Flo.Aide) 중 아직 '미확인'인 예약이 있는 매장에
// 사장님 재확인 알림톡을 1통씩 보낸다 (확정하지 않으면 수령일 다음 날 새벽 자동 취소·환불된다는 안내)
// · 내 정보 > 알림 받기에서 '놓친 미확인 예약 알림'을 끈 매장·데모 매장은 보내지 않는다
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // KST 기준 내일
  const tomorrowKst = new Date(Date.now() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: rows, error } = await db
    .from("reservations")
    .select("company_id")
    .eq("status", "미확인")
    .eq("channel", "Flo.Aide")
    .eq("desired_date", tomorrowKst)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const r of rows ?? []) counts.set(r.company_id as string, (counts.get(r.company_id as string) ?? 0) + 1);

  let sent = 0;
  const skipped: string[] = [];
  for (const [companyId, count] of counts) {
    try {
      const { data: co } = await db.from("companies").select("name, slug, is_demo").eq("id", companyId).single();
      if (!co || co.is_demo) { skipped.push(`${companyId}:demo`); continue; }
      if (!(await ownerWantsAlimtalk(db, companyId, "unconfirmed"))) { skipped.push(`${companyId}:off`); continue; }
      const { data: ownerPhone } = await db.rpc("get_owner_phone_by_slug", { p_slug: co.slug });
      if (!ownerPhone) { skipped.push(`${companyId}:no-phone`); continue; }
      await sendUnconfirmedReminderOwner({ to: ownerPhone as string, companyName: co.name ?? "", count, slug: co.slug });
      sent++;
    } catch (e) {
      console.error("[unconfirmed-reminder] 발송 실패:", companyId, e);
      skipped.push(`${companyId}:error`);
    }
  }
  return NextResponse.json({ ok: true, date: tomorrowKst, companies: counts.size, sent, skipped });
}
