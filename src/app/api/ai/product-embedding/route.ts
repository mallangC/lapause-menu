import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedImage, fetchImageBase64, toVector } from "@/lib/ai/gemini";
import { thumbUrl } from "@/lib/imageThumb";

export const dynamic = "force-dynamic";

// 상품 사진 임베딩 저장 — 상품을 올리거나 사진을 바꾼 뒤 관리자 화면이 부른다 (사진 주문 가격대 안내에 쓰임)
// 로그인한 사장님 본인 매장 상품만. 사진이 없으면 임베딩을 지운다.
export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ ok: false, skipped: true });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const { productId } = ((await request.json().catch(() => null)) ?? {}) as { productId?: string };
  if (!productId) return NextResponse.json({ error: "상품이 없어요." }, { status: 400 });

  // 본인 매장 상품인지 (RLS + owner 확인)
  const { data: product } = await supabase
    .from("products")
    .select("id, company_id, image_url, company:companies!inner(owner_id)")
    .eq("id", productId)
    .single();
  const owner = (product?.company as unknown as { owner_id?: string } | null)?.owner_id;
  if (!product || owner !== user.id) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  const admin = createAdminClient();
  if (!product.image_url) {
    await admin.from("product_embeddings").delete().eq("product_id", productId);
    return NextResponse.json({ ok: true, removed: true });
  }

  try {
    // 작은 사진(썸네일)이 있으면 그걸로 — 빠르고 비교에는 충분하다
    let img;
    const small = thumbUrl(product.image_url);
    try {
      img = await fetchImageBase64(small ?? product.image_url);
    } catch {
      img = await fetchImageBase64(product.image_url);
    }
    const embedding = await embedImage(img.base64, img.mimeType);
    const { error } = await admin.from("product_embeddings").upsert({
      product_id: product.id,
      company_id: product.company_id,
      image_url: product.image_url,
      embedding: toVector(embedding),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ai/product-embedding] 실패:", e);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
