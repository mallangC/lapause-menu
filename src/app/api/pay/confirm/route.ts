import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const { reservationId } = await req.json();
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reservations")
    .update({ paid: true })
    .eq("id", reservationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
