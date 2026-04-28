import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(request: NextRequest) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);
  const period_start = searchParams.get("period_start");
  const period_end = searchParams.get("period_end");

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "기간을 입력해주세요." }, { status: 400 });
  }

  // 미정산 결제 완료 예약 조회
  const { data: reservations, error } = await adminClient
    .from("reservations")
    .select("id, company_id, final_price")
    .eq("paid", true)
    .not("payment_id", "is", null)
    .is("settlement_id", null)
    .neq("status", "취소")
    .gte("desired_date", period_start)
    .lte("desired_date", period_end);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reservations?.length) return NextResponse.json([]);

  // company_id별 집계
  const companyMap = new Map<string, { count: number; total: number; reservationIds: string[] }>();
  for (const r of reservations) {
    const existing = companyMap.get(r.company_id) ?? { count: 0, total: 0, reservationIds: [] };
    existing.count += 1;
    existing.total += r.final_price || 0;
    existing.reservationIds.push(r.id);
    companyMap.set(r.company_id, existing);
  }

  // 회사 정보 조회
  const companyIds = [...companyMap.keys()];
  const { data: companies } = await adminClient
    .from("companies")
    .select("id, name, company_settings(bank_name, bank_account, bank_holder, business_number)")
    .in("id", companyIds);

  const result = (companies ?? []).map(c => {
    const settings = Array.isArray(c.company_settings)
      ? c.company_settings[0]
      : c.company_settings;
    const agg = companyMap.get(c.id)!;
    return {
      company_id: c.id,
      company_name: c.name,
      bank_name: settings?.bank_name ?? null,
      bank_account: settings?.bank_account ?? null,
      bank_holder: settings?.bank_holder ?? null,
      business_number: settings?.business_number ?? null,
      reservation_count: agg.count,
      total_amount: agg.total,
      reservation_ids: agg.reservationIds,
    };
  });

  return NextResponse.json(result);
}
