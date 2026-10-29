import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { PLATFORM_FEE_RATE, PLATFORM_MARGIN_RATE } from "@/lib/constants";
import { subtractBusinessDays } from "@/lib/businessDays";

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

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const year_month = period_start.slice(0, 7);

  // 토스 정산(영업일 기준 4일) 전에 선지급되지 않도록, 확정 처리 시점에도 다시 검증
  const cutoff = subtractBusinessDays(new Date(), 4).getTime();

  // 데모 매장은 정산 대상이 될 수 없음 (방어적 재검증 — pending 조회 단계에서 이미 제외되지만 여기서도 한 번 더 막는다)
  // 루프 돌기 전에 한 번만 조회해서 N+1 방지
  const companyIds = items.map((item) => item.company_id);
  const { data: demoCompanies } = await adminClient.from("companies").select("id").in("id", companyIds).eq("is_demo", true);
  const demoCompanyIds = new Set((demoCompanies ?? []).map((c) => c.id));

  for (const item of items) {
    if (demoCompanyIds.has(item.company_id)) {
      return NextResponse.json({ error: "데모 매장은 정산 대상이 아닙니다." }, { status: 400 });
    }

    // 결제 총액은 클라이언트를 신뢰하지 않고 연결된 예약에서 다시 집계
    const { data: linkedReservations } = await adminClient
      .from("reservations")
      .select("id, final_price, paid_amount, paid, payment_id, paid_at, created_at, settlement_id, deleted_at")
      .in("id", item.reservation_ids);

    const ineligible = (linkedReservations ?? []).find((r) =>
      !r.paid ||
      !r.payment_id ||
      r.settlement_id ||
      r.deleted_at ||
      new Date(r.paid_at ?? r.created_at).getTime() > cutoff
    );
    if (ineligible) {
      return NextResponse.json(
        { error: `아직 정산 가능 시점이 아니거나 이미 정산된 예약이 포함되어 있습니다. (예약 ID: ${ineligible.id}) 정산 대상을 다시 조회해주세요.` },
        { status: 400 }
      );
    }

    // 토스가 실제로 승인한 금액 기준 (예전 결제 건은 paid_amount가 없어 final_price로 대체)
    const gross_amount = (linkedReservations ?? []).reduce((s, r) => s + (r.paid_amount ?? r.final_price ?? 0), 0);
    const total_amount = Math.round(gross_amount * (1 - PLATFORM_FEE_RATE)); // 매장에 실제 이체되는 금액
    const fee_amount = gross_amount - total_amount;                           // 매장에서 차감한 수수료
    const margin_amount = Math.round(gross_amount * PLATFORM_MARGIN_RATE);    // Flo.Aide 순마진(PG 수수료 제외)

    // settlement 레코드 생성 (이체 완료 상태로)
    const { data: settlement, error: sErr } = await adminClient
      .from("settlements")
      .insert({
        company_id: item.company_id,
        period_start,
        period_end,
        year_month,
        total_amount,
        gross_amount,
        fee_amount,
        margin_amount,
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
