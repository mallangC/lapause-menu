// 메뉴판 캐시 KV 키 — Next 앱(src/lib/menuCache.ts)과 정기결제 Workflow(src/workflows/billingRenew.ts)가 함께 사용.
// 캐시 데이터 구조를 바꾸면 버전(v1)을 올려 이전 형식의 캐시를 무시한다.
export const menuCacheKey = (slug: string) => `menu:v1:${slug}`;
