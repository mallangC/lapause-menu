import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, newPlan } = await req.json();
  if (!companyId || !newPlan) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // 회사 소유권 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // billing_key 존재 확인
  const { data: sub } = await supabase
    .from("company_subscriptions")
    .select("billing_key, subscription_plan")
    .eq("company_id", companyId)
    .single();
  if (!sub?.billing_key) {
    return NextResponse.json({ error: "결제 수단이 등록되지 않았습니다." }, { status: 400 });
  }

  if (newPlan === "pro") {
    // 업그레이드: 즉시 Pro 기능 부여, 다음 결제부터 Pro 가격 적용
    const { error } = await supabase
      .from("company_subscriptions")
      .update({ subscription_plan: "pro", plan: "pro" })
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (newPlan === "starter") {
    // 다운그레이드: subscription_plan만 변경, plan은 현재 기간 만료 후 변경됨
    const { error } = await supabase
      .from("company_subscriptions")
      .update({ subscription_plan: "starter" })
      .eq("company_id", companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
