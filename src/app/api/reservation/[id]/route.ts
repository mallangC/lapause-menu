import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
