import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logReservationChange } from "@/lib/reservationLog";

// 클라이언트에서 직접 건드리면 안 되는 정산/결제 관련 필드 — 여기 포함된 키는 요청 본문에 와도 무시한다.
// payment_id/settlement_id/paid_at/order_type/deleted_at/status는 각각 결제 승인 콜백, 정산 배치, 상태변경 API에서만 세팅됨.
const PROTECTED_FIELDS = new Set([
  "payment_id", "settlement_id", "paid_at", "order_type", "deleted_at", "status", "company_id", "id",
]);

async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string
) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", userId).single();
  if (profile?.role === "operator") return true;
  const { data: company } = await supabase
    .from("companies").select("id").eq("id", companyId).eq("owner_id", userId).single();
  return !!company;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: reservation } = await supabase
    .from("reservations").select("company_id, paid, final_price").eq("id", id).single();
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await verifyOwnership(supabase, user.id, reservation.company_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED_FIELDS.has(key)) continue;
    update[key] = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 결제/금액 관련 필드 변경만 로그로 남긴다 (메모, 상품 내역 등 일반 수정은 제외)
  // reservation_logs는 RLS로 잠겨 있어 사용자 권한으로는 insert가 막히므로 서비스 롤 헬퍼로 기록한다
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  if ("paid" in update && update.paid !== reservation.paid) {
    changes.push({ field: "paid", oldValue: String(reservation.paid), newValue: String(update.paid) });
  }
  if ("final_price" in update && update.final_price !== reservation.final_price) {
    changes.push({ field: "final_price", oldValue: String(reservation.final_price), newValue: String(update.final_price) });
  }
  if (changes.length > 0) {
    await logReservationChange(
      changes.map((c) => ({
        reservationId: id,
        companyId: reservation.company_id,
        actorUserId: user.id,
        action: "field_update" as const,
        ...c,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // payment_id + company_id 조회
  const { data: reservation } = await supabase
    .from("reservations")
    .select("payment_id, final_price, status, company_id")
    .eq("id", id)
    .single();

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 소유권 확인 (operator 또는 해당 회사 오너만 허용)
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "operator") {
    const { data: company } = await supabase
      .from("companies").select("id").eq("id", reservation.company_id).eq("owner_id", user.id).single();
    if (!company) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 포트원 환불 (결제된 예약인 경우)
  if (reservation?.payment_id) {
    try {
      await fetch(`https://api.portone.io/payments/${reservation.payment_id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "관리자 취소" }),
      });
    } catch (err) {
      console.error("[reservation cancel] 환불 실패:", err);
    }
  }

  // 소프트 딜리트: 판매 수량 집계·정산 로그 무결성을 위해 실제 삭제 대신 deleted_at만 기록
  const { error } = await supabase.from("reservations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logReservationChange({
    reservationId: id,
    companyId: reservation.company_id,
    actorUserId: user.id,
    action: "delete",
    field: "deleted_at",
    oldValue: null,
    newValue: new Date().toISOString(),
    reason: reservation.payment_id ? `결제 상태: ${reservation.status}, 금액: ${reservation.final_price}` : null,
  });

  return NextResponse.json({ ok: true });
}
