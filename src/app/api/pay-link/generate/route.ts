import { blockIfInactive } from "@/lib/requireActiveCompany";
import { NextRequest, NextResponse } from "next/server";
import { PAY_LINK_BLOCKED_MESSAGE, payLinkAllowed } from "@/lib/payLinkAllowed";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { reservationId, expiresInHours } = await request.json();

    if (!reservationId || !expiresInHours) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 판매 신청이 승인된 매장만 (사장님 본인 예약인지는 RLS가 확인 — 못 읽으면 없는 예약)
    const { data: rv } = await supabase.from("reservations").select("company_id").eq("id", reservationId).maybeSingle();
    if (!rv) return NextResponse.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    const blocked = await blockIfInactive(rv.company_id as string); if (blocked) return blocked; // 구독이 끝난 매장은 보기만
    if (!(await payLinkAllowed(supabase, rv.company_id as string))) {
      return NextResponse.json({ error: PAY_LINK_BLOCKED_MESSAGE }, { status: 403 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("reservations")
      .update({ payment_token: token, payment_link_expires_at: expiresAt })
      .eq("id", reservationId);

    if (error) {
      console.error("[pay-link/generate]", error.message);
      return NextResponse.json({ error: "링크 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ token, expiresAt });
  } catch (err) {
    console.error("[pay-link/generate] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
