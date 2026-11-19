import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMenuData } from "@/lib/menuCache";
import { storeProductTypes } from "@/lib/productTypes";
import { fetchImageBase64, judgeVolumePrice } from "@/lib/ai/gemini";
import { normalizeSizeConfig, volumeJudgeRefs } from "@/lib/sizeTiers";
import { thumbUrl } from "@/lib/imageThumb";

export const dynamic = "force-dynamic";

// 사진 주문 — 손님이 고른 형태와 보낸 사진으로, 이 정도 볼륨이면 우리 매장의 어느 볼륨 단계(이름·가격)인지 알려준다.
// 매장이 정해 둔 그 형태의 볼륨감 참고 사진(가격 붙음)과 손님 사진을 함께 AI에게 보여주고 볼륨만 보고 판단하게 한다.
// 참고 사진이 2장 미만이면 묻지 않는다. 꽃 사진이 아니거나 애매하면 가격대는 비운다(지어내지 않는다).
// 손님(로그인 없음)이 부르므로 같은 IP에서 짧은 시간에 여러 번 못 하게 막는다.

const PER_MINUTE = 3;
const PER_DAY = 20;
/** 볼륨 판단에 필요한 참고 사진 최소 수 */
const MIN_REFS = 2;
/** 손님 사진 data URL 최대 길이 (약 2MB) */
const MAX_IMAGE = 2_800_000;

// 가격대를 못 낸 이유 — 서버 로그(개발: 터미널 / 배포: wrangler tail)에 남기고, 개발 중에는 응답에도 자세히 담는다
const DEV = process.env.NODE_ENV !== "production";
type Reason = "no_key" | "not_store_type" | "no_refs" | "limited" | "not_flower" | "low_confidence" | "error" | "ok";
const log = (slug: string, reason: Reason, extra?: Record<string, unknown>) =>
  console.log(`[ai/photo-price] ${slug} → ${reason}`, extra ? JSON.stringify(extra) : "");

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    log("-", "no_key");
    return NextResponse.json({ volume: null, reason: "no_key" });
  }

  const body = (await request.json().catch(() => null)) as { slug?: string; image?: string; productType?: string } | null;
  const slug = body?.slug;
  const image = body?.image ?? "";
  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!slug || !m || image.length > MAX_IMAGE) return NextResponse.json({ error: "사진을 확인하지 못했어요." }, { status: 400 });
  const [, mimeType, base64] = m;

  // 단계별 걸린 시간 (ms) — 느릴 때 어디서 걸리는지 로그로 본다
  const t0 = Date.now();
  const ms: Record<string, number> = {};
  const lap = (k: string) => { ms[k] = Date.now() - t0 - Object.values(ms).reduce((a, b) => a + b, 0); };
  const menu = await getMenuData(slug);
  lap("menu");
  if (!menu) return NextResponse.json({ error: "매장을 찾지 못했어요." }, { status: 404 });
  const s = menu.settings;
  const productTypes = storeProductTypes(s.hidden_product_types as string[] | null, menu.categories, true, s.product_type_order as string[] | null);
  // 손님이 고른 형태 — 이 매장 유형이 아니면(기타 등) 비교하지 않는다
  const productType = body?.productType ?? "";
  if (!productTypes.includes(productType)) {
    log(slug, "not_store_type", { productType, productTypes });
    return NextResponse.json({ volume: null, reason: "not_store_type" });
  }
  // 이 형태의 볼륨 기준이 2장 이상이어야 비교할 수 있다 — 사장님이 사진을 안 넣은 단계는 가격이 맞는 같은 형태 상품 사진으로 대신
  const refs = volumeJudgeRefs(normalizeSizeConfig(s.size_tiers), productType, menu.products);
  if (refs.length < MIN_REFS) {
    log(slug, "no_refs", { productType, refs: refs.length });
    return NextResponse.json({ volume: null, reason: "no_refs" });
  }

  // 같은 IP 횟수 제한
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("photo_price_take", { p_ip: ip, p_per_minute: PER_MINUTE, p_per_day: PER_DAY });
  lap("limit");
  if (allowed === false) {
    log(slug, "limited", { ip });
    return NextResponse.json({ volume: null, limited: true, reason: "limited" });
  }

  try {
    // 참고 사진(작은 사진이면 충분) + 손님 사진 → 볼륨만 보고 가격
    const refImgs = await Promise.all(
      refs.map(async (r) => {
        let img;
        try {
          img = await fetchImageBase64(thumbUrl(r.image) ?? r.image);
        } catch {
          img = await fetchImageBase64(r.image);
        }
        return { name: r.name, price: r.price, ...img };
      }),
    );
    lap("refImages");
    const j = await judgeVolumePrice({ productType, refs: refImgs, photo: { base64, mimeType } });
    lap("ai");
    const hi = refs[refs.length - 1].price;
    // 기준 목록 — 상품 사진으로 대신한 단계는 (자동: 상품 이름)
    const detail = { ms, photoKB: Math.round((base64.length * 3) / 4 / 1024), refKB: refImgs.map((r) => Math.round((r.base64.length * 3) / 4 / 1024)), productType, refs: refs.map((r) => `${r.name} ${r.price}${r.auto ? ` (자동: ${r.auto})` : ""}`), judgment: j };
    if (!j.is_flower_product) {
      log(slug, "not_flower", detail);
      return NextResponse.json({ volume: null, reason: "not_flower", ...(DEV ? { debug: detail } : {}) });
    }
    if (j.confidence === "low") {
      log(slug, "low_confidence", detail);
      return NextResponse.json({ volume: null, reason: "low_confidence", ...(DEV ? { debug: detail } : {}) });
    }
    // 손님에게는 가장 가까운 단계 하나로 말한다 (범위의 낮은 값에 눈이 가 '더 싸게도 되나' 싶지 않게)
    // AI가 낸 가격 범위는 판단이 맞는지 보려고 로그에만 남긴다
    const idx = Math.min(refs.length, Math.max(1, Math.round(j.closest_ref))) - 1;
    const near = refs[idx];
    // 가장 큰 단계보다 확실히 크면 '○○ 이상'
    const above = idx === refs.length - 1 && Math.min(j.price_min, j.price_max) > hi * 1.05;
    const volume = { name: near.name, price: near.price, above };
    const priceRange = { min: Math.min(j.price_min, j.price_max), max: Math.max(j.price_min, j.price_max) };
    log(slug, "ok", { ...detail, volume, aiRange: priceRange });
    return NextResponse.json({ volume, reason: "ok", ...(DEV ? { debug: { ...detail, aiRange: priceRange } } : {}) });
  } catch (e) {
    console.error("[ai/photo-price] 실패:", e);
    // 실패해도 주문은 이어지게 — 가격대만 생략
    return NextResponse.json({ volume: null, reason: "error", ...(DEV ? { debug: { error: String(e) } } : {}) });
  }
}
