import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const { id: company_id } = await params;
  const { action, reason } = await request.json();

  if (action === "approve") {
    const { error } = await adminClient
      .from("company_settings")
      .update({ consult_apply_status: "approved", consult_reject_reason: null })
      .eq("company_id", company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
