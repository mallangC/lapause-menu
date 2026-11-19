// 대시보드(브라우저)에서 메뉴판에 보이는 정보를 저장한 뒤 호출 — 공개 메뉴판 캐시를 비워 바로 반영되게 한다.
// 실패해도 저장 자체에는 영향이 없고, 캐시는 TTL(1시간)이 지나면 자동으로 최신화된다.
export function notifyMenuChanged() {
  fetch("/api/menu-cache/purge", { method: "POST" }).catch(() => {});
}
