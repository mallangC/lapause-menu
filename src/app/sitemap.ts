import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://www.flo-aide.com";

// 테스트용으로 만든 매장 slug — 검색 결과에 노출되지 않도록 사이트맵에서 제외
const EXCLUDED_SLUGS = new Set(["test"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${BASE_URL}/notice`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const supabase = await createClient();
    const { data: companies } = await supabase
      .from("companies")
      .select("id, slug, created_at")
      .eq("is_demo", false);

    // company_subscriptions는 RLS가 소유주 본인만 읽을 수 있어서 서비스 롤로 plan만 조회
    const { data: subs } = await createAdminClient()
      .from("company_subscriptions")
      .select("company_id, plan");
    const activeCompanyIds = new Set(
      (subs ?? []).filter((s) => s.plan && s.plan !== "none").map((s) => s.company_id)
    );

    // 데모·테스트·가입 진행 중(pending-)·구독 없는 매장은 영업 중인 메뉴판이 아니므로 제외
    const shopPages: MetadataRoute.Sitemap = (companies ?? [])
      .filter((c) => c.slug && !c.slug.startsWith("pending-") && !EXCLUDED_SLUGS.has(c.slug))
      .filter((c) => activeCompanyIds.has(c.id))
      .map((c) => ({
        url: `${BASE_URL}/${c.slug}`,
        lastModified: new Date(c.created_at),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticPages, ...shopPages];
  } catch {
    return staticPages;
  }
}
