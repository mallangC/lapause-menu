import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { activateBillingKey } from "@/lib/billingActivate";

// 토스 SDK requestBillingAuth() 리다이렉트 복귀 후 authKey -> billingKey 교환
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, subscriptionPlan, authKey, customerKey } = await req.json();

  if (!companyId || !subscriptionPlan || !authKey || !customerKey) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }
  if (customerKey !== companyId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
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

  const tossRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authKey, customerKey }),
  });

  if (!tossRes.ok) {
    const tossError = await tossRes.json().catch(() => ({}));
    console.error("[billing/confirm-auth] 빌링키 발급 실패:", tossError);
    return NextResponse.json(
      { error: (tossError as { message?: string }).message ?? "카드 등록에 실패했습니다." },
      { status: 400 }
    );
  }

  const tossData = await tossRes.json();
  const billingKey: string = tossData.billingKey;

  const result = await activateBillingKey(companyId, subscriptionPlan, billingKey);
  return NextResponse.json(result.body, { status: result.status });
}
