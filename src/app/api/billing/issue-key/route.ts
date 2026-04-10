import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { billingKey, pgProvider, companyId, subscriptionPlan } = await req.json();
  if (!billingKey || !companyId || !subscriptionPlan) {
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

  // 체험은 한 번만: 기존에 trial_ends_at이 있으면 새로 부여하지 않음
  const { data: existingSub } = await supabase
    .from("company_subscriptions")
    .select("trial_ends_at")
    .eq("company_id", companyId)
    .single();

  const alreadyHadTrial = existingSub?.trial_ends_at != null;

  const updateData: Record<string, unknown> = {
    plan: "pro",
    billing_key: billingKey,
    pg_provider: pgProvider ?? null,
    subscription_plan: subscriptionPlan,
  };

  if (!alreadyHadTrial) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    updateData.trial_ends_at = trialEndsAt.toISOString();
  }

  const { error } = await supabase
    .from("company_subscriptions")
    .update(updateData)
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
