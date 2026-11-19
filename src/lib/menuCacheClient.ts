// 대시보드(브라우저)에서 메뉴판에 보이는 정보를 저장한 뒤 호출 — 공개 메뉴판 캐시를 비워 바로 반영되게 한다.
// 실패해도 저장 자체에는 영향이 없고, 캐시는 TTL(1시간)이 지나면 자동으로 최신화된다.
export function notifyMenuChanged() {
  fetch("/api/menu-cache/purge", { method: "POST" }).catch(() => {});
}

/** 상품 사진 임베딩 다시 만들기 — 상품을 올리거나 사진을 바꾼 뒤 부른다 (사진 주문 가격대 안내용, 실패해도 저장에는 영향 없음) */
export function refreshProductEmbedding(productId: string | null | undefined) {
  if (!productId) return;
  // [잠시 멈춤] 사진 주문 가격을 임베딩 대신 볼륨 참고 사진 비교로 내는 중 — 임베딩을 쓰지 않으니 만들지 않는다. 되돌릴 때 주석 해제
  // fetch("/api/ai/product-embedding", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ productId }),
  // }).catch(() => {});
}
