import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { purgeMenuCacheByCompanyId } from "@/lib/menuCache";

async function verifyOperator() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  return profile?.role === "operator";
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

  } else if (action === "reject") {
    if (!reason?.trim()) {
      return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
    }
    const { error } = await adminClient
      .from("company_settings")
      .update({ consult_apply_status: "rejected", consult_reject_reason: reason })
      .eq("company_id", company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else {
    return NextResponse.json({ error: "알 수 없는 액션입니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
