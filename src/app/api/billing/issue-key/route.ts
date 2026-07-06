import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { authKey, customerKey, companyId, subscriptionPlan } = await req.json();
  if (!authKey || !customerKey || !companyId || !subscriptionPlan) {
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

  // 토스 빌링키 발급
  const encodedKey = Buffer.from(`${process.env.TOSS_SECRET_KEY!}:`).toString("base64");
  const tossRes = await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${authKey}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ customerKey }),
  });

  if (!tossRes.ok) {
    const tossError = await tossRes.json().catch(() => ({}));
    console.error("[billing/issue-key] 토스 빌링키 발급 실패:", tossError);
    return NextResponse.json(
      { error: (tossError as { message?: string }).message ?? "빌링키 발급에 실패했습니다." },
      { status: 500 }
    );
  }

  const tossData = await tossRes.json();
  const billingKey: string = tossData.billingKey;

  // 체험은 한 번만
  const { data: existingSub } = await supabase
    .from("company_subscriptions")
    .select("trial_ends_at")
    .eq("company_id", companyId)
    .single();

  const alreadyHadTrial = existingSub?.trial_ends_at != null;

  const updateData: Record<string, unknown> = {
    plan: "pro",
    billing_key: billingKey,
    pg_provider: "toss",
    subscription_plan: subscriptionPlan,
  };

  if (!alreadyHadTrial) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    updateData.trial_ends_at = trialEndsAt.toISOString();
  }

  const { error } = await supabase
    .from("company_subscriptions")
    .upsert({ company_id: companyId, ...updateData }, { onConflict: "company_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
