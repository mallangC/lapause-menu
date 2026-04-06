import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // payment_id 조회 (환불 필요 여부 확인)
  const { data: reservation } = await supabase
    .from("reservations")
    .select("payment_id, final_price, status")
    .eq("id", id)
    .single();

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

  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
