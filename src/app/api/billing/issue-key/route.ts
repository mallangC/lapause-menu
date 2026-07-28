import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    companyId,
    subscriptionPlan,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    customerIdentityNumber,
    cardPassword,
  } = await req.json();

  if (!companyId || !subscriptionPlan || !cardNumber || !cardExpirationMonth || !cardExpirationYear || !customerIdentityNumber || !cardPassword) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  // 회사 소유권 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const encodedKey = Buffer.from(`${process.env.TOSS_BILLING_SECRET_KEY!}:`).toString("base64");

  // 토스 카드 직접 빌링키 발급
  const tossRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/card", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey: companyId,
      cardNumber,
      cardExpirationYear,
      cardExpirationMonth,
      customerIdentityNumber,
      cardPassword,
    }),
  });

  if (!tossRes.ok) {
    const tossError = await tossRes.json().catch(() => ({}));
    console.error("[billing/issue-key] 토스 빌링키 발급 실패:", tossError);
    return NextResponse.json(
      { error: (tossError as { message?: string }).message ?? "카드 등록에 실패했습니다." },
      { status: 400 }
    );
  }

  const tossData = await tossRes.json();
  const billingKey: string = tossData.billingKey;

  // 체험 이력 확인
  const { data: existingSub } = await supabase
    .from("company_subscriptions")
    .select("trial_ends_at")
    .eq("company_id", companyId)
    .single();

  const alreadyHadTrial = existingSub?.trial_ends_at != null;

  const now = new Date();

  if (!alreadyHadTrial) {
    // 첫 구독: 30일 무료 체험 시작
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { error } = await supabase
      .from("company_subscriptions")
      .upsert(
        {
          company_id: companyId,
          plan: subscriptionPlan,
          billing_key: billingKey,
          pg_provider: "toss",
          subscription_plan: subscriptionPlan,
          trial_ends_at: trialEndsAt.toISOString(),
        },
        { onConflict: "company_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, trial: true });
  }

  // 재구독: 즉시 결제
  const planAmount: Record<string, number> = { monthly: 14900, annual: 118800 };
  const amount = planAmount[subscriptionPlan] ?? 14900;
  const planLabel = subscriptionPlan === "annual" ? "연간" : "월간";
  const orderId = `r${companyId.replace(/-/g, "").slice(0, 20)}${Date.now().toString().slice(-8)}`;

  // 빌링키 먼저 저장 후 결제
  const { error: upsertError } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: companyId,
        plan: subscriptionPlan,
        billing_key: billingKey,
        pg_provider: "toss",
        subscription_plan: subscriptionPlan,
      },
      { onConflict: "company_id" }
    );

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  // 즉시 결제
  const payRes = await fetch(
    `https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: companyId,
        amount,
        orderId,
        orderName: `Flo.Aide ${planLabel} 월 구독`,
      }),
    }
  );

  if (!payRes.ok) {
    const payError = await payRes.json().catch(() => ({}));
    console.error("[billing/issue-key] 즉시 결제 실패:", payError);

    await supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: null,
      success: false,
      error_message: (payError as { message?: string }).message ?? "결제 실패",
    });

    return NextResponse.json(
      { error: (payError as { message?: string }).message ?? "결제에 실패했습니다." },
      { status: 400 }
    );
  }

  const payData = await payRes.json();

  if (payData.status !== "DONE") {
    await supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: null,
      success: false,
      error_message: payData.message ?? "결제 실패",
    });

    return NextResponse.json({ error: payData.message ?? "결제에 실패했습니다." }, { status: 400 });
  }

  // 결제 성공: plan_expires_at 설정 (월간 30일, 연간 365일)
  const expiresAt = new Date(now);
  if (subscriptionPlan === "annual") {
    expiresAt.setDate(expiresAt.getDate() + 365);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  await Promise.all([
    supabase
      .from("company_subscriptions")
      .update({
        plan_expires_at: expiresAt.toISOString(),
        payment_retry_count: 0,
        next_retry_at: null,
      })
      .eq("company_id", companyId),
    supabase.from("billing_logs").insert({
      company_id: companyId,
      operator_id: null,
      type: "charge",
      plan: subscriptionPlan,
      amount,
      payment_id: payData.paymentKey ?? orderId,
      success: true,
      reason: "재구독 즉시 결제",
    }),
  ]);

  return NextResponse.json({ ok: true, trial: false });
}
