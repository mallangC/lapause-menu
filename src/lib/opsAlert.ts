import type { SupabaseClient } from "@supabase/supabase-js";

// 운영 알림 — 서버에서 심각한 오류가 나면 운영자 화면 위쪽 알림 종에 띄운다 (테이블 ops_alerts, 서버 키로만)
// 같은 매장·같은 종류가 아직 확인 전이면 한 줄로 모아 횟수만 올린다. 알림을 남기다 실패해도 원래 처리는 막지 않는다.

export type OpsAlertKind =
  | "naver_mail" // 네이버 예약 메일 자동 처리 실패
  | "payment_cancel_failed" // 결제 자동 취소 실패 (주문 저장 실패·금액 불일치·중복 결제) — 손님 돈만 빠진 상태
  | "refund_failed" // 사장님이 카드 결제 예약을 취소했는데 환불 실패
  | "cancel_after_refund_failed" // 환불은 됐는데 예약을 '취소'로 저장하지 못함 — 정산에 잡힐 수 있다
  | "refund_manual_needed" // 이미 정산된 예약을 취소 — 운영자가 직접 환불 처리
  | "billing_extend_failed" // 구독 결제는 됐는데 이용 기간 연장 저장 실패
  | "billing_renew_failed" // 정기결제 갱신 실행 실패
  | "billing_refund_failed"; // 구독 환불 요청 실패

const SEPARATE = new Set<OpsAlertKind>([
  "payment_cancel_failed",
  "refund_failed",
  "cancel_after_refund_failed",
  "refund_manual_needed",
  "billing_extend_failed",
  "billing_refund_failed",
]);

export async function reportOpsAlert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  alert: { kind: OpsAlertKind; companyId?: string | null; title: string; detail?: string | null },
): Promise<void> {
  try {
    // 돈이 걸린 알림은 건마다 따로 (결제키·금액이 달라 한 줄로 합치면 앞의 건을 잃는다)
    if (SEPARATE.has(alert.kind)) {
      await db.from("ops_alerts").insert({ kind: alert.kind, company_id: alert.companyId ?? null, title: alert.title, detail: alert.detail ?? null });
      return;
    }
    let q = db.from("ops_alerts").select("id, count").eq("kind", alert.kind).is("resolved_at", null);
    q = alert.companyId ? q.eq("company_id", alert.companyId) : q.is("company_id", null);
    const { data: open } = await q.order("last_at", { ascending: false }).limit(1).maybeSingle();
    const now = new Date().toISOString();
    if (open) {
      await db
        .from("ops_alerts")
        .update({ count: (open.count as number) + 1, last_at: now, title: alert.title, detail: alert.detail ?? null })
        .eq("id", open.id);
    } else {
      await db.from("ops_alerts").insert({
        kind: alert.kind,
        company_id: alert.companyId ?? null,
        title: alert.title,
        detail: alert.detail ?? null,
        last_at: now,
      });
    }
  } catch (e) {
    console.error("[opsAlert] 운영 알림 기록 실패:", e);
  }
}
