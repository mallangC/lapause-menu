import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeDiscount, describePromoTerms, PROMO_CODE_COLUMNS, type PromoCode } from "@/lib/billingPrice";

export const dynamic = "force-dynamic";

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

async function logDiscount(db: ReturnType<typeof createAdminClient>, companyId: string, operatorId: string, plan: string | null, promoCodeId: string | null, reason: string) {
  const { error } = await db.from("billing_logs").insert({
    company_id: companyId,
    operator_id: operatorId,
    type: "discount",
    plan,
    amount: null,
    promo_code_id: promoCodeId,
    success: true,
    reason,
  });
  if (error) console.error("[store-promo] billing_logs 기록 실패:", error);
}

// 운영자가 매장에 할인 코드를 직접 적용 (사장님이 코드를 입력할 필요 없음).
// 운영자가 의도적으로 붙이는 것이므로 사용 중지·등록 마감·한도와 관계없이 적용하고, 이미 다른 코드가 있으면 교체한다.
// 할인은 다음 결제부터 반영된다 (이미 결제된 금액은 바뀌지 않음).
export async function POST(req: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, promoCodeId } = await req.json();
  if (!companyId || !promoCodeId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const db = createAdminClient();
  const [{ data: sub }, { data: promo }] = await Promise.all([
    db.from("company_subscriptions").select("plan, subscription_plan, promo_code_id").eq("company_id", companyId).maybeSingle(),
    db.from("promo_codes").select(`${PROMO_CODE_COLUMNS}, redeemed_count`).eq("id", promoCodeId).maybeSingle(),
  ]);

  if (!sub) return NextResponse.json({ error: "구독 정보를 찾을 수 없습니다." }, { status: 404 });
  if (sub.plan === "free") return NextResponse.json({ error: "Free 플랜 매장은 결제가 없어 할인을 적용할 수 없습니다." }, { status: 400 });
  if (!promo) return NextResponse.json({ error: "할인 코드를 찾을 수 없습니다." }, { status: 404 });
  if (sub.promo_code_id === promo.id) return NextResponse.json({ error: "이미 이 할인 코드가 적용되어 있습니다." }, { status: 400 });

  const p = promo as PromoCode & { redeemed_count: number };
  const { error } = await db
    .from("company_subscriptions")
    .update({ promo_code_id: p.id, discount_cycles_remaining: p.duration_cycles })
    .eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 등록 수 집계 — 운영자 직접 적용도 1건으로 센다
  await db.from("promo_codes").update({ redeemed_count: p.redeemed_count + 1 }).eq("id", p.id);

  await logDiscount(
    db, companyId, operatorId, sub.subscription_plan ?? sub.plan, p.id,
    `운영자가 할인 적용: ${p.code} (${describeDiscount(p)} · ${describePromoTerms(p)})${sub.promo_code_id ? " — 기존 할인 교체" : ""}`
  );

  return NextResponse.json({
    ok: true,
    promo: { code: p.code, summary: `${describeDiscount(p)} · ${describePromoTerms(p)}`, cyclesRemaining: p.duration_cycles },
  });
}

// 할인 해제 — 다음 결제부터 정가로 결제된다
export async function DELETE(req: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId } = await req.json();
  if (!companyId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const db = createAdminClient();
  const { data: sub } = await db
    .from("company_subscriptions")
    .select("plan, subscription_plan, promo_code_id, promo:promo_codes(code)")
    .eq("company_id", companyId)
    .maybeSingle();
  if (!sub?.promo_code_id) return NextResponse.json({ error: "적용된 할인이 없습니다." }, { status: 400 });

  const { error } = await db
    .from("company_subscriptions")
    .update({ promo_code_id: null, discount_cycles_remaining: null })
    .eq("company_id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const promoRaw = Array.isArray(sub.promo) ? sub.promo[0] : sub.promo;
  const code = (promoRaw as { code?: string } | null)?.code ?? "";
  await logDiscount(db, companyId, operatorId, sub.subscription_plan ?? sub.plan, sub.promo_code_id as string, `운영자가 할인 해제: ${code} (다음 결제부터 정가)`);

  return NextResponse.json({ ok: true });
}
