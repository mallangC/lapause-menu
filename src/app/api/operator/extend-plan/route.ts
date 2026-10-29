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

const MAX_MONTHS = 24;
const DAYS_PER_MONTH = 30;

// 서버(Workers)는 UTC라 로그 문구의 날짜는 KST 기준으로 맞춘다
function formatDate(d: Date) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")}`;
}

// 운영자가 매장 이용 기간을 N개월(1개월 = 30일) 늘린다.
// - 무료체험 중(plan_expires_at 없음): 체험 종료일(trial_ends_at)을 늘린다 → 첫 결제일도 같이 밀림
// - 유료 구독 중: 플랜 만료일(plan_expires_at, = 다음 결제일)을 늘린다
// 이미 지난 날짜면 오늘부터, 아직 안 지났으면 기존 날짜부터 더한다.
export async function POST(request: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { companyId, months } = await request.json();
  if (!companyId) return NextResponse.json({ error: "companyId가 필요합니다." }, { status: 400 });
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    return NextResponse.json({ error: `연장 기간은 1~${MAX_MONTHS}개월 사이로 입력해주세요.` }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sub } = await adminClient
    .from("company_subscriptions")
    .select("plan, subscription_plan, plan_expires_at, trial_ends_at")
    .eq("company_id", companyId)
    .maybeSingle();

  // 플랜 없음(해지·강등)이나 Free 매장은 날짜를 늘려도 이용 상태가 바뀌지 않으므로 막는다
  if (!sub || sub.plan === "none" || sub.plan === "free") {
    return NextResponse.json({ error: "구독 중이거나 무료체험 중인 매장만 연장할 수 있습니다." }, { status: 400 });
  }

  const isTrial = !sub.plan_expires_at && !!sub.trial_ends_at;
  const column = isTrial ? "trial_ends_at" : "plan_expires_at";
  const current = isTrial ? sub.trial_ends_at : sub.plan_expires_at;

  const now = new Date();
  const currentDate = current ? new Date(current) : null;
  const base = currentDate && currentDate > now ? currentDate : now;
  const newDate = new Date(base);
  newDate.setDate(newDate.getDate() + months * DAYS_PER_MONTH);

  // 결제 실패 재시도 중이었다면 새 기간으로 처음부터 다시 결제하도록 재시도 상태도 초기화
  const { error } = await adminClient
    .from("company_subscriptions")
    .update({ [column]: newDate.toISOString(), payment_retry_count: 0, next_retry_at: null })
    .eq("company_id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const label = isTrial ? "무료체험" : "구독 기간";
  const { error: logError } = await adminClient.from("billing_logs").insert({
    company_id: companyId,
    operator_id: operatorId,
    type: "extend",
    plan: sub.subscription_plan ?? sub.plan,
    amount: null,
    success: true,
    reason: `운영자가 ${label} ${months}개월(${months * DAYS_PER_MONTH}일) 연장 (${currentDate ? formatDate(currentDate) : "없음"} → ${formatDate(newDate)})`,
  });
  // 연장 자체는 이미 반영됐으므로 응답은 성공으로 두고 로그 실패만 남긴다
  if (logError) console.error("[extend-plan] billing_logs 기록 실패:", logError);

  // 구독 상태가 바뀌면 공개 메뉴판(영업 중/서비스 중지) 캐시도 비운다
  await purgeMenuCacheByCompanyId(companyId);
  return NextResponse.json({
    ok: true,
    target: isTrial ? "trial" : "plan",
    planExpiresAt: isTrial ? sub.plan_expires_at : newDate.toISOString(),
    trialEndsAt: isTrial ? newDate.toISOString() : sub.trial_ends_at,
  });
}
