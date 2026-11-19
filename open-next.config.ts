import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 정적 페이지(랜딩·프리뷰·약관 등 데이터 없는 페이지)는 빌드 때 만든 결과를 그대로 내보낸다 — 요청마다 다시 그리지 않아 Worker CPU를 아낀다.
// · incrementalCache: 빌드 결과를 정적 자산(ASSETS)에서 읽는 읽기 전용 캐시 (ISR·revalidate를 쓰지 않아서 이걸로 충분)
// · enableCacheInterception: 캐시에 있는 페이지는 Next 서버를 띄우지 않고 바로 응답
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
