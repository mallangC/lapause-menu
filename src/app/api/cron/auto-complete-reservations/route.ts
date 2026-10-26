import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logReservationChange } from "@/lib/reservationLog";

export const dynamic = "force-dynamic";

// 매일 1회(크론, KST 새벽 1시) 호출: 예약일이 지났는데도 관리자가 상태를 바꾸지 않은
// '준비중'/'제작완료' 예약을 '픽업/배송완료'로 자동 전환한다.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // KST 기준 오늘 날짜 — 이 날짜보다 이전인 예약만 대상 (당일 예약은 건드리지 않음)
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: targets, error } = await supabaseAdmin
    .from("reservations")
    .select("id, company_id, status, desired_date")
    .in("status", ["준비중", "제작완료"])
    .lt("desired_date", todayKst)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!targets?.length) return NextResponse.json({ ok: true, updated: 0 });

  const { error: updateError } = await supabaseAdmin
    .from("reservations")
    .update({ status: "픽업/배송완료" })
    .in("id", targets.map((r) => r.id));

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await logReservationChange(
    targets.map((r) => ({
      reservationId: r.id,
      companyId: r.company_id,
      actorUserId: null,
      action: "status_change" as const,
      field: "status",
      oldValue: r.status,
      newValue: "픽업/배송완료",
      reason: "예약일 경과 — 크론에 의한 자동 완료 처리",
    }))
  );

  return NextResponse.json({ ok: true, updated: targets.length });
}
