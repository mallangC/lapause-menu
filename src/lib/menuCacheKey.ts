// 메뉴판 캐시 KV 키 — Next 앱(src/lib/menuCache.ts)과 정기결제 Workflow(src/workflows/billingRenew.ts)가 함께 사용.
// 캐시 데이터 구조를 바꾸면 버전을 올려 이전 캐시를 무시한다. (v3: Supabase 서울 프로젝트 이전 — 옛 이미지 주소가 담긴 캐시 폐기)
export const menuCacheKey = (slug: string) => `menu:v3:${slug}`;
