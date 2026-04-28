import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "private-documents";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// 통장사본 업로드
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const companyId = formData.get("company_id") as string | null;

  if (!file || !companyId) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }
  if (!(await verifyCompanyOwner(companyId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ext = file.name.split(".").pop();
  const path = `bank-accounts/${companyId}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // DB에 경로 저장
  await adminClient
    .from("company_settings")
    .update({ bank_account_image_url: path })
    .eq("company_id", companyId);

  return NextResponse.json({ path });
}

// 서명된 URL 발급 (60분 유효)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("company_id");

  if (!companyId) {
    return NextResponse.json({ error: "company_id가 필요합니다." }, { status: 400 });
  }

  // 오너 또는 운영자만 접근 가능
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

  // 저장된 경로 조회
  const { data: settings } = await adminClient
    .from("company_settings")
    .select("bank_account_image_url")
    .eq("company_id", companyId)
    .single();

  const path = settings?.bank_account_image_url;
  if (!path) return NextResponse.json({ error: "통장사본이 없습니다." }, { status: 404 });

  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
