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

export async function POST(request: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId가 필요합니다." }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Free 플랜 전환: 과금 중단을 위해 빌링키 제거, 만료일 없음(무기한)
  const { error } = await adminClient
    .from("company_subscriptions")
    .update({
      plan: "free",
      subscription_plan: null,
      billing_key: null,
      plan_expires_at: null,
      cancel_at_period_end: false,
      payment_retry_count: 0,
      next_retry_at: null,
    })
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminClient.from("billing_logs").insert({
    company_id: companyId,
    operator_id: operatorId,
    type: "charge",
    plan: "free",
    amount: 0,
    success: true,
    reason: "운영자가 Free 플랜으로 수동 전환",
  });

  return NextResponse.json({ ok: true });
}
