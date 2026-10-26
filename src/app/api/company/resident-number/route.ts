import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  encryptResidentNumber,
  decryptResidentNumber,
  maskResidentNumber,
  isValidResidentNumberFormat,
} from "@/lib/residentNumber";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyCompanyOwner(companyId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_id", user.id)
    .single();
  return !!data;
}

// 대표자 주민등록번호 저장 (평문은 요청 처리 중에만 사용, 암호화해서만 저장)
export async function POST(request: NextRequest) {
  const { company_id, front, back } = await request.json() as { company_id?: string; front?: string; back?: string };

  if (!company_id || !front || !back) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }
  if (!(await verifyCompanyOwner(company_id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isValidResidentNumberFormat(front, back)) {
    return NextResponse.json({ error: "주민등록번호 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const full = `${front}${back}`;
  const encrypted = encryptResidentNumber(full);

  const { error } = await getAdminClient()
    .from("company_settings")
    .update({ resident_number_enc: encrypted })
    .eq("company_id", company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, masked: maskResidentNumber(full) });
}

// 마스킹된 주민등록번호 조회 — 오너 또는 운영자만, 평문은 절대 반환하지 않음
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");
  if (!companyId) {
    return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isOperator = profile?.role === "operator";
  if (!isOperator && !(await verifyCompanyOwner(companyId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings } = await getAdminClient()
    .from("company_settings")
    .select("resident_number_enc")
    .eq("company_id", companyId)
    .single();

  if (!settings?.resident_number_enc) {
    return NextResponse.json({ masked: null });
  }

  const full = decryptResidentNumber(settings.resident_number_enc);
  return NextResponse.json({ masked: maskResidentNumber(full) });
}
