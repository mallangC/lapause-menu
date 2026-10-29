import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type PromoCode } from "@/lib/billingPrice";

export const dynamic = "force-dynamic";

// redeem_promo_code RPC가 던지는 오류 코드 → 사장님에게 보여줄 문구
const ERROR_MESSAGES: Record<string, string> = {
  PROMO_NOT_FOUND: "존재하지 않는 할인 코드입니다.",
  PROMO_INACTIVE: "사용이 중지된 할인 코드입니다.",
  PROMO_EXPIRED: "등록 기간이 지난 할인 코드입니다.",
  PROMO_EXHAUSTED: "사용 가능 횟수가 모두 소진된 할인 코드입니다.",
  PROMO_ALREADY_APPLIED: "이미 할인 코드가 적용되어 있습니다. 할인 코드는 매장당 1개만 적용할 수 있습니다.",
  FREE_PLAN: "Free 플랜 매장은 할인 코드를 적용할 수 없습니다.",
  NO_SUBSCRIPTION: "구독 정보를 찾을 수 없습니다.",
};

// 사장님이 할인 코드를 등록 — 등록 즉시 매장 구독에 연결되고, 이후 결제(체험 후 첫 결제·정기결제·재구독)부터 할인된다.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, code } = await req.json();
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!companyId || !normalized) {
    return NextResponse.json({ error: "할인 코드를 입력해주세요." }, { status: 400 });
  }
  if (normalized.length > 30) {
    return NextResponse.json({ error: ERROR_MESSAGES.PROMO_NOT_FOUND }, { status: 400 });
  }

  // 회사 소유권 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { data, error } = await createAdminClient().rpc("redeem_promo_code", {
    p_company_id: companyId,
    p_code: normalized,
  });

  if (error) {
    const known = Object.keys(ERROR_MESSAGES).find((k) => error.message.includes(k));
    if (!known) console.error("[billing/promo] 할인 코드 등록 실패:", error);
    return NextResponse.json(
      { error: known ? ERROR_MESSAGES[known] : "할인 코드 등록 중 오류가 발생했습니다." },
      { status: known ? 400 : 500 }
    );
  }

  const row = data as PromoCode & Record<string, unknown>;
  const promo: PromoCode = {
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    applies_to: row.applies_to,
    duration_cycles: row.duration_cycles,
  };
  return NextResponse.json({ ok: true, promo, cyclesRemaining: promo.duration_cycles });
}
