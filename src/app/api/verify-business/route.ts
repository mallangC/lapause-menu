import { blockIfInactive } from "@/lib/requireActiveCompany";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { business_number, company_id } = await request.json();
  if (!business_number || !company_id) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const raw = business_number.replace(/\D/g, "");
  if (raw.length !== 10) {
    return NextResponse.json({ error: "사업자등록번호 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const apiKey = process.env.NTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const ntsRes = await fetch(
    `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ b_no: [raw] }),
    }
  );

  if (!ntsRes.ok) {
    return NextResponse.json({ error: "국세청 API 조회에 실패했습니다." }, { status: 502 });
  }

  const ntsData = await ntsRes.json();
  const result = ntsData?.data?.[0];

  if (!result) {
    return NextResponse.json({ error: "조회 결과가 없습니다." }, { status: 404 });
  }

  // b_stt_cd: "01"=계속사업자, "02"=휴업자, "03"=폐업자
  const statusMap: Record<string, string> = {
    "01": "계속사업자",
    "02": "휴업자",
    "03": "폐업자",
  };
  const status = statusMap[result.b_stt_cd] ?? result.b_stt ?? "알 수 없음";
  const isActive = result.b_stt_cd === "01";

  // 인증 성공 시 DB에 기록 — 인증 칸은 사장님 키로 쓸 수 없게 막혀 있어 서버 키로 (본인 매장인지 먼저 확인)
  if (isActive) {
    const { data: own } = await supabase.from("companies").select("id").eq("id", company_id).eq("owner_id", user.id).maybeSingle();
    if (!own) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    { const blocked = await blockIfInactive(company_id); if (blocked) return blocked; } // 구독이 끝난 매장은 보기만
    await createAdminClient()
      .from("company_settings")
      .update({
        business_number: business_number,
        business_verified_at: new Date().toISOString(),
        business_status: status,
      })
      .eq("company_id", company_id);
  }

  return NextResponse.json({ status, isActive });
}
