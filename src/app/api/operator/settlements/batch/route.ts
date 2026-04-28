import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "operator";
}

interface PendingItem {
  company_id: string;
  total_amount: number;
  reservation_ids: string[];
}

// 전체 정산 완료 처리 (이체 후 호출)
export async function POST(request: NextRequest) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { items, period_start, period_end, transferred_at, transfer_memo } = body as {
    items: PendingItem[];
    period_start: string;
    period_end: string;
    transferred_at: string;
    transfer_memo?: string;
  };

  if (!items?.length || !period_start || !period_end || !transferred_at) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const year_month = period_start.slice(0, 7);

  for (const item of items) {
    // settlement 레코드 생성 (이체 완료 상태로)
    const { data: settlement, error: sErr } = await adminClient
      .from("settlements")
      .insert({
        company_id: item.company_id,
        period_start,
        period_end,
        year_month,
        total_amount: item.total_amount,
        status: "completed",
        transferred_at,
        transfer_memo: transfer_memo || null,
      })
      .select()
      .single();

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    // 예약에 settlement_id 연결
    await adminClient
      .from("reservations")
      .update({ settlement_id: settlement.id })
      .in("id", item.reservation_ids);
  }

  return NextResponse.json({ ok: true, count: items.length });
}
