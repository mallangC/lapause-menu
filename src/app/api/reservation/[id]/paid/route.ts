import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 내부 서버 간 호출만 허용
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: reservation } = await supabase
    .from("reservations")
    .select("payment_id, paid")
    .eq("id", id)
    .single();

  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reservation.paid) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from("reservations")
    .update({ paid: true })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
