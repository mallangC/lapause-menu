import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const PLAN_AMOUNT: Record<string, number> = {
  monthly: 14900,
  annual: 118800,
};

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, newPlan } = await req.json();
  if (!companyId || !newPlan) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (newPlan !== "monthly" && newPlan !== "annual") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 회사 소유권 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const supabaseAdmin = getSupabaseAdmin();

  // 현재 구독 정보 조회
  const { data: sub } = await supabaseAdmin
    .from("company_subscriptions")
    .select("billing_key, subscription_plan, plan, plan_expires_at")
    .eq("company_id", companyId)
    .single();

  if (!sub?.billing_key) {
    return NextResponse.json({ error: "결제 수단이 등록되지 않았습니다." }, { status: 400 });
  }

  const currentPlan = sub.plan as string | null;
  const currentSubscriptionPlan = sub.subscription_plan as string | null;

  // ── 전환 취소: plan과 subscription_plan이 다를 때 되돌리기 ──
  // 예: plan=monthly, subscription_plan=annual → newPlan=monthly이면 전환 취소
  if (currentPlan !== currentSubscriptionPlan && newPlan === currentPlan) {
    const { error } = await supabaseAdmin
      .from("company_subscriptions")
      .update({ subscription_plan: currentPlan })
      .eq("company_id", companyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, undone: true });
  }

  // ── 이미 같은 플랜 ──
  if (currentSubscriptionPlan === newPlan) {
    return NextResponse.json({ error: "이미 해당 플랜입니다." }, { status: 400 });
  }

  // ── 플랜 전환: 기간 만료 후 적용 (subscription_plan만 변경) ──
  // monthly → annual 또는 annual → monthly
  const { error } = await supabaseAdmin
    .from("company_subscriptions")
    .update({ subscription_plan: newPlan })
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const planLabel = newPlan === "annual" ? "연간" : "월간";
  const _ = PLAN_AMOUNT; // 참조 유지 (향후 즉시 결제 로직 추가 시 사용)
  void _;

  return NextResponse.json({ ok: true, planLabel });
}
