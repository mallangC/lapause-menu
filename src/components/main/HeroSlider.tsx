"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSliderProps {
  images: string[];
}

export default function HeroSlider({ images }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setTimeout(next, 4000);
    return () => clearTimeout(timer);
  }, [current, next, images.length]);

  if (images.length === 0) return <div className="w-full h-52 bg-beige-200" />;

  return (
    <div className="py-4 bg-beige-100">
      {/* 양옆이 살짝 보이는 슬라이더 */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(calc(-${current * 80}% - ${current * 12}px + 10%))` }}
        >
          {images.map((src, i) => (
            <div
              key={src}
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 w-4/5 aspect-[4/3] rounded-2xl overflow-hidden mx-1.5 cursor-pointer transition-all duration-500 ${
                i === current ? "shadow-lg scale-100 opacity-100" : "shadow-sm scale-95 opacity-50"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" priority={i === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-5 bg-gold-500" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
