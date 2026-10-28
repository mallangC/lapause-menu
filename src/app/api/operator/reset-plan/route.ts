import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { purgeMenuCacheByCompanyId } from "@/lib/menuCache";

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

// 환불 없이 구독 상태만 "플랜 없음"으로 초기화 (잘못 설정된 상태를 바로잡을 때 등)
export async function POST(request: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId가 필요합니다." }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from("company_subscriptions")
    .update({
      plan: "none",
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
    plan: "none",
    amount: 0,
    success: true,
    reason: "운영자가 플랜을 초기화(없음)",
  });

  // 구독 상태가 바뀌면 공개 메뉴판(영업 중/서비스 중지) 캐시도 비운다
  await purgeMenuCacheByCompanyId(companyId);
  return NextResponse.json({ ok: true });
}
