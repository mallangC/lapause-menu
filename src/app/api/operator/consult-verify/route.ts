import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decryptResidentNumber, maskResidentNumber } from "@/lib/residentNumber";

async function verifyOperator() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  return profile?.role === "operator";
}

export async function GET() {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("company_settings")
    .select(`
      company_id, business_number, business_verified_at, business_status,
      bank_name, bank_account, bank_holder, bank_account_image_url,
      business_registration_image_url, resident_number_enc,
      consult_apply_status, consult_reject_reason,
      companies(name, created_at)
    `)
    .not("consult_apply_status", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 평문은 절대 클라이언트로 내려보내지 않고, 마스킹된 형태로만 변환해서 반환
  const result = (data ?? []).map(({ resident_number_enc, ...rest }) => ({
    ...rest,
    resident_number_masked: resident_number_enc ? maskResidentNumber(decryptResidentNumber(resident_number_enc)) : null,
  }));

  return NextResponse.json(result);
}
