import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 예약의 payment_id 조회
  const { data: reservation } = await supabase
    .from("reservations")
    .select("payment_id, paid")
    .eq("id", id)
    .single();

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 이미 결제 완료 상태면 스킵
  if (reservation.paid) return NextResponse.json({ ok: true });

  // payment_id가 있으면 PortOne으로 결제 상태 검증
  if (reservation.payment_id) {
    const portoneRes = await fetch(`https://api.portone.io/payments/${reservation.payment_id}`, {
      headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
    });
    const portoneData = await portoneRes.json();
    if (!portoneRes.ok || portoneData.status !== "PAID") {
      return NextResponse.json({ error: "결제가 확인되지 않았습니다." }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("reservations")
    .update({ paid: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
