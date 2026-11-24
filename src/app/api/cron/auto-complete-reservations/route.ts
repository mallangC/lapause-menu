import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logReservationChange } from "@/lib/reservationLog";
import { cancelTossPayment, restoreStock } from "@/lib/orderPricing";
import { reportOpsAlert } from "@/lib/opsAlert";
import { productTypeSummary, sendReservationCancelled } from "@/lib/solapi";

export const dynamic = "force-dynamic";

// 매일 1회(크론, KST 새벽 1시) 호출:
// 1) 수령일이 지났는데도 사장님이 확정하지 않은 손님 주문(Flo.Aide '미확인')을 자동 취소 — 카드 결제는 전액 환불, 손님에게 취소 알림톡, 재고 되돌림
//    (전날 밤 10시에 사장님께 재확인 알림톡을 보낸다 — /api/cron/unconfirmed-reminder)
// 2) 예약일이 지났는데 상태를 바꾸지 않은 '준비중'/'제작완료' 예약을 '픽업/배송완료'로 자동 전환
const AUTO_CANCEL_REASON = "매장에서 수령일까지 예약을 확인하지 못해 자동 취소됐어요";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoCancelUnconfirmed(db: any, todayKst: string) {
  const { data: rows } = await db
    .from("reservations")
    .select("id, company_id, status, payment_id, settlement_id, paid_amount, final_price, orderer_name, orderer_phone, items, order_type")
    .eq("status", "미확인")
    .eq("channel", "Flo.Aide")
    .lt("desired_date", todayKst)
    .is("deleted_at", null);
  let cancelled = 0;
  for (const r of (rows ?? []) as Record<string, unknown>[]) {
    const id = r.id as string;
    const companyId = r.company_id as string;
    const who = `${(r.orderer_name as string) ?? ""}${r.paid_amount ? ` · ${(r.paid_amount as number).toLocaleString()}원` : ""} · 예약 ${id}`;
    // 이미 정산된 카드 결제는 자동 환불하지 않는다 — 운영자에게 알리고 그대로 둔다
    if (r.payment_id && r.settlement_id) {
      await reportOpsAlert(db, { kind: "refund_manual_needed", companyId, title: "미확인 자동 취소 — 정산된 예약이라 직접 환불 필요", detail: who });
      continue;
    }
    if (r.payment_id) {
      const ok = await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, r.payment_id as string, "매장 미확인 자동 취소");
      if (!ok) {
        await reportOpsAlert(db, { kind: "refund_failed", companyId, title: "미확인 자동 취소 환불 실패 — 취소되지 않음", detail: who });
        continue;
      }
    }
    const { error } = await db.from("reservations").update({ status: "취소", cancel_reason: AUTO_CANCEL_REASON }).eq("id", id).eq("status", "미확인");
    if (error) {
      if (r.payment_id) await reportOpsAlert(db, { kind: "cancel_after_refund_failed", companyId, title: "환불됐지만 미확인 자동 취소 저장 실패 — 직접 취소 필요", detail: `예약 ${id} · ${error.message}` });
      continue;
    }
    cancelled++;
    await logReservationChange({ reservationId: id, companyId, actorUserId: null, action: "status_change", field: "status", oldValue: "미확인", newValue: "취소", reason: AUTO_CANCEL_REASON });
    // 손님 주문으로 줄었던 재고 되돌리기
    if (["product", "consult"].includes((r.order_type as string) ?? "")) await restoreStock(db, r.items as { product_id?: string | null; quantity?: number | null }[] | null);
    // 손님 취소 알림톡 (데모 매장 제외)
    try {
      const { data: co } = await db.from("companies").select("name, phone, is_demo").eq("id", companyId).single();
      if (co && !co.is_demo && r.orderer_phone) {
        await sendReservationCancelled({
          to: r.orderer_phone as string,
          ordererName: (r.orderer_name as string) ?? "",
          companyName: co.name ?? "",
          productType: productTypeSummary(r.items as { type?: string; quantity?: number }[] | null),
          finalPrice: (r.final_price as number) ?? 0,
          cancelReason: AUTO_CANCEL_REASON,
          companyPhone: co.phone ?? "",
        });
      }
    } catch (e) {
      console.error("[auto-cancel] 손님 알림톡 실패:", id, e);
    }
  }
  return cancelled;
}
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

  // 1) 미확인 자동 취소 (실패해도 아래 자동 완료는 계속)
  let autoCancelled = 0;
  try {
    autoCancelled = await autoCancelUnconfirmed(supabaseAdmin, todayKst);
  } catch (e) {
    console.error("[auto-cancel] 실패:", e);
  }

  const { data: targets, error } = await supabaseAdmin
    .from("reservations")
    .select("id, company_id, status, desired_date")
    .in("status", ["준비중", "제작완료"])
    .lt("desired_date", todayKst)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!targets?.length) return NextResponse.json({ ok: true, updated: 0, autoCancelled });

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

  return NextResponse.json({ ok: true, updated: targets.length, autoCancelled });
}
