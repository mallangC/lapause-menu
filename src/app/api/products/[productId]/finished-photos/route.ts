import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 상품 상세 — 이 상품을 골라 결제한 주문에서 사장님이 '상품 페이지에 공개'한 완성 사진 (최근 몇 장)
// 사진 주소만 돌려준다 (어느 주문인지·손님 정보는 없다)
const LIMIT = 6;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return NextResponse.json({ photos: [] });
  const db = createAdminClient();
  const { data } = await db
    .from("reservation_photos")
    .select("image_url")
    .eq("product_id", productId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  return NextResponse.json(
    { photos: (data ?? []).map((p) => p.image_url as string) },
    // 잠깐은 캐시해도 된다 (사장님이 공개를 바꾸면 몇 분 안에 반영)
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
