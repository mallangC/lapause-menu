import { createClient as createAdminClient } from "@supabase/supabase-js";

// reservation_logs는 RLS로 완전히 잠겨 있어 서비스 롤 키로만 쓸 수 있다.
// 클라이언트는 호출 시점에 만든다 — 모듈 최상단에서 만들면 빌드(page data 수집) 시
// 서비스 롤 키가 없는 빌드 환경에서 "supabaseKey is required"로 빌드가 실패한다.
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ReservationLogInput {
  reservationId: string;
  companyId: string;
  actorUserId: string | null;
  action: "status_change" | "field_update" | "delete";
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason?: string | null;
}

export async function logReservationChange(entries: ReservationLogInput | ReservationLogInput[]) {
  const rows = (Array.isArray(entries) ? entries : [entries]).map((e) => ({
    reservation_id: e.reservationId,
    company_id: e.companyId,
    actor_user_id: e.actorUserId,
    action: e.action,
    field: e.field,
    old_value: e.oldValue,
    new_value: e.newValue,
    reason: e.reason ?? null,
  }));
  const { error } = await getAdminClient().from("reservation_logs").insert(rows);
  if (error) console.error("[reservationLog] 기록 실패:", error);
}
