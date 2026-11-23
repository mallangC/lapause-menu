"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// 상품 상세 사진 — 여러 장이면 옆으로 넘겨 본다 (휴대폰은 밀기, PC는 화살표). 아래 점으로 몇 번째인지 표시
// 부모가 크기(aspect)와 position: relative 를 정한다
export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length <= 1) {
    return <Image src={images[0]} alt={alt} fill className="object-cover" priority />;
  }

  const go = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={trackRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={src + i} className="relative w-full h-full shrink-0 snap-center">
            <Image src={src} alt={`${alt} ${i + 1}`} fill className="object-cover" priority={i === 0} sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        ))}
      </div>

      {/* PC — 화살표 */}
      {index > 0 && (
        <button type="button" aria-label="이전 사진" onClick={() => go(index - 1)}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow items-center justify-center text-gray-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </button>
      )}
      {index < images.length - 1 && (
        <button type="button" aria-label="다음 사진" onClick={() => go(index + 1)}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow items-center justify-center text-gray-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </button>
      )}

      {/* 몇 번째 사진인지 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
        {images.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
        ))}
      </div>
    </>
  );
}
