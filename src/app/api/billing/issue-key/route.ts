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

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const { error } = await supabase
    .from("company_subscriptions")
    .update({
      plan: "pro",
      billing_key: billingKey,
      pg_provider: pgProvider ?? null,
      subscription_plan: subscriptionPlan,
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
