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

export async function GET() {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settlementsRaw, error } = await adminClient
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settlementsRaw?.length) return NextResponse.json([]);

  const companyIds = [...new Set(settlementsRaw.map(s => s.company_id))];
  const settlementIds = settlementsRaw.map(s => s.id);

  const [{ data: companies }, { data: reservationMappings }] = await Promise.all([
    adminClient
      .from("companies")
      .select("id, name, company_settings(bank_name, bank_account, bank_holder, business_number)")
      .in("id", companyIds),
    adminClient
      .from("reservations")
      .select("settlement_id")
      .in("settlement_id", settlementIds),
  ]);

  const companyMap = new Map((companies ?? []).map(c => [c.id, c]));
  const countMap = new Map<string, number>();
  for (const r of reservationMappings ?? []) {
    if (r.settlement_id) {
      countMap.set(r.settlement_id, (countMap.get(r.settlement_id) ?? 0) + 1);
    }
  }

  const settlements = settlementsRaw.map(s => {
    const company = companyMap.get(s.company_id);
    const settings = Array.isArray(company?.company_settings)
      ? company.company_settings[0]
      : company?.company_settings;
    return {
      ...s,
      company_name: company?.name ?? "",
      bank_name: settings?.bank_name ?? null,
      bank_account: settings?.bank_account ?? null,
      bank_holder: settings?.bank_holder ?? null,
      business_number: settings?.business_number ?? null,
      reservation_count: countMap.get(s.id) ?? 0,
    };
  });

  return NextResponse.json(settlements);
}

export async function POST(request: NextRequest) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { company_id, period_start, period_end, dry_run } = body;

  if (!company_id || !period_start || !period_end) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const { data: reservations, error: rErr } = await adminClient
    .from("reservations")
    .select("id, final_price")
    .eq("company_id", company_id)
    .eq("paid", true)
    .is("settlement_id", null)
    .neq("status", "취소")
    .gte("desired_date", period_start)
    .lte("desired_date", period_end);

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const total = (reservations ?? []).reduce((sum, r) => sum + (r.final_price || 0), 0);
  const count = reservations?.length ?? 0;

  if (dry_run) return NextResponse.json({ count, total });
  if (count === 0) {
    return NextResponse.json({ error: "정산 대상 예약이 없습니다." }, { status: 400 });
  }

  const year_month = period_start.slice(0, 7);

  const { data: settlement, error: sErr } = await adminClient
    .from("settlements")
    .insert({ company_id, period_start, period_end, year_month, total_amount: total })
    .select()
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  await adminClient
    .from("reservations")
    .update({ settlement_id: settlement.id })
    .in("id", reservations!.map(r => r.id));

  return NextResponse.json({ settlement });
}
