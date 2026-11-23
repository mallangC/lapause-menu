"use client";

import PriceTag from "@/components/PriceTag";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import StoreImage from "@/components/StoreImage";
import { FLOWER_COLOR_MAP } from "@/lib/constants";

// 첫 화면 대화의 매장 작품 사진 — 누르면 크게 보고, 좌우로 넘겨 다른 사진도 보며 상품 정보(가격·색·분위기 등)를 확인한다.
// 판매 중인 매장이면 아래 [이 상품으로 주문하기]로 대화 안에서 바로 주문을 이어간다.
// 큰 사진 창은 body에 바로 그린다 (말풍선 등장 애니메이션(transform) 위로 올라오게) — 볼륨감 참고 사진과 같은 모양.

export interface IntroProduct {
  id: string;
  name: string;
  price: number;
  /** 할인 전 정가 (있으면 할인 중) */
  original_price?: number | null;
  image_url: string;
  product_type: string;
  flower_colors?: string[] | null;
  wrapping_color?: string | null;
  seasons?: string[] | null;
  mood?: string | null;
  bag_included?: boolean;
  message_card_unavailable?: boolean;
  preservative_unavailable?: boolean;
  /** 상품 옵션 묶음 — 이 사진으로 주문하면 채팅에서 옵션을 고른다 */
  options?: unknown;
}

export default function IntroProductViewer({
  products,
  start,
  onClose,
  onOrder,
}: {
  products: IntroProduct[];
  start: number;
  onClose: () => void;
  /** 없으면 주문 버튼 없이 보기만 (미리보기 등) */
  onOrder?: (p: IntroProduct) => void;
}) {
  const [idx, setIdx] = useState(start);
  const last = products.length - 1;
  const go = (d: number) => setIdx((i) => Math.min(last, Math.max(0, i + d)));
  const touchX = useRef<number | null>(null);
  const p = products[idx];

  // 키보드 — ←→ 넘기기, Esc 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!p) return null;
  // 상품 정보 — 넣어 둔 것만
  const colors = p.flower_colors ?? [];
  const rows: [string, string][] = [
    ["형태", p.product_type],
    // 꽃 색상은 컬러칩으로 (아래에서 따로 그린다)
    ["꽃 색상", colors.length ? "칩" : ""],
    ["포장지", p.wrapping_color ?? ""],
    ["분위기", p.mood ?? ""],
    ["시즌", (p.seasons ?? []).join(", ")],
  ].filter((r): r is [string, string] => !!r[1]);

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-[400px] max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div
          className="relative w-full aspect-[4/5] max-h-[58vh] bg-beige-100 select-none"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <StoreImage key={p.image_url} src={p.image_url} alt={p.name} fill sizes="400px" className="object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 shadow flex items-center justify-center text-gray-700 hover:bg-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          {idx > 0 && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="이전 사진"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center text-gray-700 hover:bg-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {idx < last && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="다음 사진"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center text-gray-700 hover:bg-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
          {products.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
              {products.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`${x.name} 보기`}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-base font-semibold text-gray-900 break-keep">{p.name}</p>
          <p className="mt-0.5"><PriceTag price={p.price} original={p.original_price} size="md" /></p>
          {rows.length > 0 && (
            <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-gray-400">{k}</dt>
                  {k === "꽃 색상" ? (
                    // 컬러칩 — 색 동그라미 + 이름 (흰색은 테두리로 보이게)
                    <dd className="flex flex-wrap gap-1.5">
                      {colors.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[13px] text-gray-700">
                          <span
                            className={`w-3.5 h-3.5 rounded-full shrink-0 border ${c === "흰색" ? "border-gray-300" : "border-black/5"}`}
                            style={{ backgroundColor: FLOWER_COLOR_MAP[c] ?? "#a8a29e" }}
                          />
                          {c}
                        </span>
                      ))}
                    </dd>
                  ) : (
                    <dd className="text-gray-800 break-keep">{v}</dd>
                  )}
                </div>
              ))}
            </dl>
          )}
          {onOrder ? (
            <button
              type="button"
              onClick={() => onOrder(p)}
              className="mt-4 w-full py-3 rounded-2xl bg-gold-500 text-white font-medium hover:bg-gold-600 transition-colors"
            >
              이 상품으로 주문하기
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-3 rounded-2xl bg-gold-500 text-white font-medium hover:bg-gold-600 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
