import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company_id } = await request.json();
  if (!company_id) return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });

  // 오너 확인
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", company_id)
    .eq("owner_id", user.id)
    .single();
  if (!company) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 필수 조건 확인
  const { data: settings } = await supabase
    .from("company_settings")
    .select("business_verified_at, bank_account_image_url, bank_name, bank_account, bank_holder, consult_apply_status")
    .eq("company_id", company_id)
    .single();

  if (!settings?.business_verified_at) {
    return NextResponse.json({ error: "사업자등록번호 인증이 필요합니다." }, { status: 400 });
  }
  if (!settings?.bank_account_image_url) {
    return NextResponse.json({ error: "통장사본 업로드가 필요합니다." }, { status: 400 });
  }
  if (!settings?.bank_name || !settings?.bank_account || !settings?.bank_holder) {
    return NextResponse.json({ error: "계좌 정보를 모두 입력해주세요." }, { status: 400 });
  }
  if (settings?.consult_apply_status === "pending") {
    return NextResponse.json({ error: "이미 검토 중인 신청이 있습니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("company_settings")
    .update({ consult_apply_status: "pending", consult_reject_reason: null, consult_enabled: false })
    .eq("company_id", company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
