import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/types";
import { menuCacheKey } from "@/lib/menuCacheKey";

// 공개 메뉴판(/[slug]) 데이터 캐시 — Cloudflare KV(MENU_CACHE)에 매장별로 저장.
// 손님이 메뉴판을 열 때마다 DB를 5번씩 조회하던 것을 캐시가 있으면 0번으로 줄인다.
// 사장님이 메뉴 관련 정보를 수정하면 purgeMenuCache*()로 바로 비우고, 놓친 경우에도 TTL이 지나면 자동으로 최신화된다.
// 로컬 `next dev`처럼 KV 바인딩이 없는 환경에서는 캐시 없이 DB를 바로 조회한다.

// KV 무료 플랜 쓰기 한도(하루 1천 회)를 고려해 1시간 — 수정 시에는 즉시 비우므로 길게 잡아도 된다
const TTL_SECONDS = 60 * 60;

interface KVNamespace {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface MenuData {
  company: {
    id: string;
    name: string | null;
    phone: string | null;
    owner_id: string;
    is_demo: boolean;
  };
  settings: Record<string, unknown>;
  plan: string | null;
  ownerName: string | null;
  products: Product[];
  categories: { category_type: string; name: string; hidden: boolean }[];
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function getKV(): { kv: KVNamespace; waitUntil: (p: Promise<unknown>) => void } | null {
  try {
    const { env, ctx } = getCloudflareContext();
    const kv = (env as unknown as { MENU_CACHE?: KVNamespace }).MENU_CACHE;
    if (!kv) return null;
    return { kv, waitUntil: (p) => (ctx as { waitUntil(p: Promise<unknown>): void }).waitUntil(p) };
  } catch {
    return null;
  }
}

async function loadMenuData(slug: string): Promise<MenuData | null> {
  // 공개 데이터지만 구독(plan)·대표자명은 RLS상 익명 조회가 안 되므로 서비스 롤로 한 번에 조회
  const db = adminClient();
  const { data: raw } = await db
    .from("companies")
    .select(`
      id, name, phone, owner_id, is_demo,
      settings:company_settings(
        logo_image, theme_bg, theme_accent,
        location_url, kakao_channel_url, instagram_url, youtube_url,
        hidden_product_types, hidden_seasons, consult_enabled,
        business_number, mail_order_number, address
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (!raw) return null;

  // 매장 조회 이후의 쿼리는 서로 의존하지 않으므로 한 번에 병렬로 보낸다
  const [{ data: sub }, { data: ownerProfile }, { data: products }, { data: categories }] = await Promise.all([
    db.from("company_subscriptions").select("plan").eq("company_id", raw.id).maybeSingle(),
    db.from("profiles").select("name").eq("user_id", raw.owner_id).maybeSingle(),
    db.from("products")
      .select("*")
      .eq("company_id", raw.id)
      .eq("status", "active")
      .order("product_type", { ascending: true })
      .order("price", { ascending: true }),
    db.from("company_categories").select("category_type, name, hidden").eq("company_id", raw.id),
  ]);

  return {
    company: { id: raw.id, name: raw.name, phone: raw.phone, owner_id: raw.owner_id, is_demo: raw.is_demo ?? false },
    settings: (raw.settings as unknown as Record<string, unknown> | null) ?? {},
    plan: sub?.plan ?? null,
    ownerName: ownerProfile?.name ?? null,
    products: (products as Product[]) ?? [],
    categories: (categories as MenuData["categories"]) ?? [],
  };
}

/** 메뉴판 데이터 조회 (캐시 우선). 같은 요청 안에서 layout·page가 함께 불러도 한 번만 실행된다. */
export const getMenuData = cache(async (slug: string): Promise<MenuData | null> => {
  const store = getKV();
  const key = menuCacheKey(slug);

  if (store) {
    try {
      const cached = await store.kv.get(key, "json");
      if (cached) return cached as MenuData;
    } catch (err) {
      console.error("[menuCache] KV 읽기 실패:", err);
    }
  }

  const data = await loadMenuData(slug);

  // 없는 매장은 캐시하지 않는다 (가입 직후 slug가 생기는 경우 바로 보여야 함)
  if (store && data) {
    store.waitUntil(
      store.kv.put(key, JSON.stringify(data), { expirationTtl: TTL_SECONDS })
        .catch((err) => console.error("[menuCache] KV 쓰기 실패:", err))
    );
  }
  return data;
});

/** slug로 메뉴판 캐시 비우기 */
export async function purgeMenuCache(slug: string | null | undefined) {
  if (!slug) return;
  const store = getKV();
  if (!store) return;
  try {
    await store.kv.delete(menuCacheKey(slug));
  } catch (err) {
    console.error("[menuCache] KV 삭제 실패:", err);
  }
}

/** company_id로 메뉴판 캐시 비우기 (서버 API에서 구독·설정 변경 후 호출) */
export async function purgeMenuCacheByCompanyId(companyId: string | null | undefined) {
  if (!companyId || !getKV()) return;
  const { data } = await adminClient().from("companies").select("slug").eq("id", companyId).maybeSingle();
  await purgeMenuCache(data?.slug);
}
