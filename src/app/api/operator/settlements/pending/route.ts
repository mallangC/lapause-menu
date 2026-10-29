import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { subtractBusinessDays } from "@/lib/businessDays";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

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
  let period_start = searchParams.get("period_start");
  let period_end = searchParams.get("period_end");

  // 마지막 정산 완료일 조회 (자동 시작일용)
  const { data: lastSettlement } = await adminClient
    .from("settlements")
    .select("period_end")
    .eq("status", "completed")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSettledDate = lastSettlement?.period_end?.slice(0, 10) ?? null;

  // 시작일은 안내용(배너 표시)으로만 사용 — 실제 조회 필터에는 하한선을 걸지 않습니다.
  // (결제일이 오래됐어도 settlement_id가 비어있는 건은 항상 다시 잡혀야 장기 예약 건이 누락되지 않습니다.)
  if (!period_start) {
    if (lastSettledDate) {
      const next = new Date(lastSettledDate);
      next.setDate(next.getDate() + 1);
      period_start = next.toISOString().slice(0, 10);
    } else {
      period_start = "2024-01-01";
    }
  }

  // 토스 정산(영업일 기준 4일) 전에 미리 지급하지 않도록 권장 종료일 계산
  const recommendedEnd = subtractBusinessDays(new Date(), 4).toISOString().slice(0, 10);

  // 종료일만 입력하는 경우 허용 (시작일은 자동)
  if (!period_end) {
    return NextResponse.json({ lastSettledDate, autoStart: period_start, recommendedEnd });
  }

  // 토스 정산 전에 선지급되지 않도록, 종료일이 권장일(영업일 4일 전)보다 늦으면 강제로 당겨서 조회
  let clamped = false;
  if (period_end > recommendedEnd) {
    period_end = recommendedEnd;
    clamped = true;
  }

  // 미정산 결제 완료 예약 조회 (하한선 없이, 결제 승인일 기준 종료일까지의 모든 미정산 건)
  // 링크결제는 예약 row 생성(created_at)과 실제 결제 승인 시점이 다를 수 있어 paid_at을 우선 사용하고,
  // paid_at이 없는 과거 데이터(컬럼 추가 이전 결제 건)만 created_at으로 대체합니다.
  const { data: reservations, error } = await adminClient
    .from("reservations")
    .select("id, company_id, final_price, paid_amount, paid_at, created_at")
    .eq("paid", true)
    .not("payment_id", "is", null)
    .is("settlement_id", null)
    .is("deleted_at", null)
    .eq("status", "픽업/배송완료");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 데모 매장은 실제 돈이 오가지 않으므로 정산 대상에서 완전히 제외
  const { data: demoCompanies } = await adminClient.from("companies").select("id").eq("is_demo", true);
  const demoCompanyIds = new Set((demoCompanies ?? []).map((c) => c.id));

  const cutoff = new Date(`${period_end}T23:59:59`).getTime();
  const eligible = (reservations ?? []).filter((r) => {
    if (demoCompanyIds.has(r.company_id)) return false;
    const effective = new Date(r.paid_at ?? r.created_at).getTime();
    return effective <= cutoff;
  });

  if (!eligible.length) return NextResponse.json([]);

  // company_id별 집계
  const companyMap = new Map<string, { count: number; total: number; reservationIds: string[] }>();
  for (const r of eligible) {
    const existing = companyMap.get(r.company_id) ?? { count: 0, total: 0, reservationIds: [] };
    existing.count += 1;
    existing.total += r.paid_amount ?? r.final_price ?? 0; // 실제 결제 승인 금액 기준
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
      // 결제 수수료(PG사 수수료 + Flo.Aide 마진) 차감 후 실제 이체 금액
      net_amount: Math.round(agg.total * (1 - PLATFORM_FEE_RATE)),
      reservation_ids: agg.reservationIds,
    };
  });

  return NextResponse.json(result);
}
