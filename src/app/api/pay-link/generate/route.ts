import { NextRequest, NextResponse } from "next/server";
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
