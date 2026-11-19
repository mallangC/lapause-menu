import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { purgeMenuCacheByCompanyId } from "@/lib/menuCache";
import { sendSalesApplyResult } from "@/lib/solapi";

async function verifyOperator() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  return profile?.role === "operator";
}

/** 판매 신청 결과를 사장님께 알림톡으로 — 실패해도 승인·반려는 그대로 (데모 매장은 보내지 않는다) */
async function notifyOwner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: ReturnType<typeof createClient<any>>,
  companyId: string,
  result: { approved: boolean; autoStarted?: boolean; reason?: string },
) {
  try {
    const { data: company } = await adminClient.from("companies").select("name, slug, is_demo").eq("id", companyId).single();
    const c = company as { name?: string; slug?: string; is_demo?: boolean } | null;
    if (!c?.slug || c.is_demo) return;
    const { data: phone } = await adminClient.rpc("get_owner_phone_by_slug", { p_slug: c.slug });
    if (!phone) return;
    await sendSalesApplyResult({ to: String(phone), companyName: c.name ?? "", slug: c.slug, ...result });
  } catch (e) {
    console.error("[consult-verify] 결과 알림톡 실패:", e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id: company_id } = await params;
  const { action, reason } = await request.json();

  if (action === "approve") {
    // 시작 설정에서 '승인되면 바로 시작'을 고른 매장은 판매 기능도 함께 켠다
    // (컬럼이 아직 없으면 읽기가 실패해 자동 시작 없이 승인만 한다)
    const { data: auto } = await adminClient
      .from("company_settings")
      .select("sales_auto_start")
      .eq("company_id", company_id)
      .single();
    const autoStart = (auto as { sales_auto_start?: boolean } | null)?.sales_auto_start === true;
    const { error } = await adminClient
      .from("company_settings")
      .update({
        consult_apply_status: "approved",
        consult_reject_reason: null,
        ...(autoStart ? { consult_enabled: true } : {}),
      })
      .eq("company_id", company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (autoStart) await purgeMenuCacheByCompanyId(company_id);
    await notifyOwner(adminClient, company_id, { approved: true, autoStarted: autoStart });

  } else if (action === "reject") {
    if (!reason?.trim()) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }
    const { error } = await adminClient
      .from("company_settings")
      .update({ consult_apply_status: "rejected", consult_reject_reason: reason })
      .eq("company_id", company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyOwner(adminClient, company_id, { approved: false, reason });

  } else {
    return NextResponse.json({ error: "알 수 없는 액션입니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
