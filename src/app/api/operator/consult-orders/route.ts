import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "operator";
}

// 맞춤 주문 분석 (운영자) — 맞춤 주문으로 들어온 예약만, 취소·삭제·데모 매장 제외 / ?days=7|30|90
export async function GET(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days"))) ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const db = createAdminClient();
  const { data, error } = await db
    .from("reservations")
    .select("id, company_id, created_at, mood, budget, items, traffic_source, company:companies!inner(is_demo)")
    .eq("order_path", "recommend")
    .eq("company.is_demo", false)
    .is("deleted_at", null)
    .neq("status", "취소")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map(({ items, company: _company, ...r }) => {
      const item = (items as { type?: string; name?: string; price?: number; product_id?: string }[] | null)?.[0];
      return {
        ...r,
        product_type: item?.type ?? null,
        product_name: item?.name ?? null,
        product_price: item?.price ?? null,
      };
    })
  );
}
