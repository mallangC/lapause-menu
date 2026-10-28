import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purgeMenuCache } from "@/lib/menuCache";

export const dynamic = "force-dynamic";

// 사장님이 대시보드에서 메뉴판에 보이는 정보를 수정한 뒤 호출 — 본인 매장의 메뉴판 캐시를 비운다
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: company } = await supabase.from("companies").select("slug").eq("owner_id", user.id).maybeSingle();
  await purgeMenuCache(company?.slug);
  return NextResponse.json({ ok: true });
}
