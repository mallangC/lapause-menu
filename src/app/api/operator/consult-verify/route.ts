import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

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
      business_registration_image_url,
      consult_apply_status, consult_reject_reason,
      companies(name, created_at)
    `)
    .not("consult_apply_status", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
