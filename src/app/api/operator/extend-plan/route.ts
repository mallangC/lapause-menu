import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "operator" ? user.id : null;
}

// 운영자가 매장 플랜 만료일(=다음 결제일)을 30일 뒤로 미룬다.
// 이미 만료됐으면 오늘로부터 +30일, 아직 안 지났으면 기존 만료일로부터 +30일.
export async function POST(request: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId가 필요합니다." }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sub } = await adminClient
    .from("company_subscriptions")
    .select("plan_expires_at")
    .eq("company_id", companyId)
    .single();

  const now = new Date();
  const currentExpiry = sub?.plan_expires_at ? new Date(sub.plan_expires_at) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + 30);

  const { error } = await adminClient
    .from("company_subscriptions")
    .update({ plan_expires_at: newExpiry.toISOString() })
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminClient.from("billing_logs").insert({
    company_id: companyId,
    operator_id: operatorId,
    type: "charge",
    plan: null,
    amount: 0,
    success: true,
    reason: "운영자가 플랜 만료일(결제일) 30일 연장",
  });

  return NextResponse.json({ ok: true, planExpiresAt: newExpiry.toISOString() });
}
