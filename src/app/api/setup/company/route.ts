import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVED_SLUGS } from "@/lib/constants";
import { startFreeTrial } from "@/lib/freeTrial";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]+$/;

// 매장 정보 입력(/setup) 저장 + 카드 없는 무료 체험 시작
// 체험 시작 전(plan = none)에는 DB가 사장님 키로 매장·설정 수정을 막으므로(20261122b) 본인 매장 확인 후 서버 키로 저장한다.
// 무료 체험은 한 번도 체험하지 않은 매장만 시작되고, 이미 체험·구독했으면 그냥 넘어간다.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = ((await request.json().catch(() => null)) ?? {}) as { name?: unknown; slug?: unknown; logoUrl?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const logoUrl = typeof body.logoUrl === "string" && body.logoUrl ? body.logoUrl : null;

  if (!name) return NextResponse.json({ error: "매장 이름을 입력해 주세요." }, { status: 400 });
  if (!slug || !SLUG_RE.test(slug) || slug.startsWith("pending-")) {
    return NextResponse.json({ error: "URL 슬러그는 영문 소문자·숫자·하이픈(-)만 쓸 수 있어요." }, { status: 400 });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "사이트에서 쓰는 주소라 사용할 수 없습니다. 다른 슬러그를 입력해 주세요." }, { status: 400 });
  }
  // 로고는 우리 저장소에 올린 파일만
  if (logoUrl && !logoUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`)) {
    return NextResponse.json({ error: "로고 이미지를 다시 올려 주세요." }, { status: 400 });
  }

  const { data: company } = await supabase.from("companies").select("id, slug").eq("owner_id", user.id).maybeSingle();
  if (!company) return NextResponse.json({ error: "매장 정보를 찾을 수 없습니다. 다시 로그인해 주세요." }, { status: 404 });
  const wasPending = company.slug.startsWith("pending-");

  const db = createAdminClient();
  const { error: updateError } = await db.from("companies").update({ name, slug }).eq("id", company.id);
  if (updateError) {
    return NextResponse.json(
      { error: updateError.code === "23505" ? "이미 사용 중인 URL입니다. 다른 슬러그를 입력해 주세요." : updateError.message },
      { status: updateError.code === "23505" ? 409 : 500 }
    );
  }

  const defaultBusinessHours = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [String(i), { closed: i === 0, open: "09:00", close: "18:00" }])
  );
  const { error: settingsError } = await db.from("company_settings")
    .update({
      logo_image: logoUrl,
      // 처음 가입한 매장은 '오늘 가능한 꽃 색상'을 끈 채 시작 — 사장님이 대시보드에서 켠다 (DB 기본값은 켜짐이라 여기서 끈다)
      ...(wasPending ? { business_hours: defaultBusinessHours, today_colors_enabled: false } : {}),
    })
    .eq("company_id", company.id);
  if (settingsError) console.error("[setup/company] 매장 설정 저장 실패:", settingsError);

  const trial = await startFreeTrial(company.id);
  if (trial.error) return NextResponse.json({ error: "무료 체험을 시작하지 못했어요. 다시 시도해 주세요." }, { status: 500 });

  return NextResponse.json({ ok: true, wasPending, trialStarted: trial.started });
}
