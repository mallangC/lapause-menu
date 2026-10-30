"use client";

import { useEffect } from "react";
import { normalizeTrafficSource, readTrafficSource, saveTrafficSource } from "@/lib/trafficSource";

// 매장 공개 페이지(메뉴판·상품 상세·장바구니·맞춤 주문)에 들어오면
// 1) 주소의 ?utm_source= (예전 링크는 ?from=) 를 이번 방문의 유입 출처로 기억하고 — 이후 어느 경로로 주문해도 함께 저장된다
// 2) 같은 브라우저 기준 하루 1번만 방문 수를 기록한다 (새로고침·페이지 이동은 다시 세지 않음)
export default function TrafficTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const path = window.location.pathname;
    // 사장님 관리 화면과 결제 링크 페이지는 손님 유입이 아니므로 제외
    if (path.startsWith(`/${slug}/admin`) || path.startsWith(`/${slug}/pay/`)) return;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeTrafficSource(params.get("utm_source") ?? params.get("from"));
    if (fromUrl) saveTrafficSource(slug, fromUrl);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD (KST)
    const visitKey = `flo_visit_${slug}`;
    try {
      if (localStorage.getItem(visitKey) === today) return;
      localStorage.setItem(visitKey, today);
    } catch {
      // 저장소를 못 쓰면 중복 방지 없이 이번 1번만 기록
    }

    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, source: fromUrl ?? readTrafficSource(slug) }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
