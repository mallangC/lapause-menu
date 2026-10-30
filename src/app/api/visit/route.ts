import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTrafficSource } from "@/lib/trafficSource";

export const dynamic = "force-dynamic";

// 검색엔진·미리보기 봇은 방문 수에서 제외 (대부분 JS를 실행하지 않지만, 실행하는 봇도 있어 한 번 더 거른다)
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i;

// 메뉴판 방문 1회 기록 — 매장·날짜·유입 출처별 숫자만 올린다 (개인정보 저장 없음)
export async function POST(req: NextRequest) {
  if (BOT_UA.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });

  const { slug, source } = await req.json().catch(() => ({}));
  if (typeof slug !== "string" || !slug || slug.length > 100) return new NextResponse(null, { status: 204 });

  const db = createAdminClient();
  const { data: companyId } = await db.rpc("get_company_id_by_slug", { p_slug: slug });
  if (!companyId) return new NextResponse(null, { status: 204 });

  // 데모 매장 방문은 집계하지 않음
  const { data: company } = await db.from("companies").select("is_demo").eq("id", companyId).single();
  if (company?.is_demo) return new NextResponse(null, { status: 204 });

  const { error } = await db.rpc("record_menu_visit", {
    p_company_id: companyId,
    p_source: normalizeTrafficSource(source) ?? "direct",
  });
  if (error) console.error("[visit] 방문 기록 실패:", error.message);

  return new NextResponse(null, { status: 204 });
}
