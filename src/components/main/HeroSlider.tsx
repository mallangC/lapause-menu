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
      {/* 슬라이더 + 좌우 화살표 */}
      <div className="flex items-center gap-2 px-3">
        {images.length > 1 ? (
          <button onClick={prev} className="shrink-0 p-1 text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : <div className="w-8 shrink-0" />}

        <div className="flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(calc(-${current * 100}%))` }}
          >
            {images.map((src, i) => (
              <div
                key={src}
                className="relative shrink-0 w-full aspect-[4/2.2] rounded-2xl overflow-hidden shadow-lg"
              >
                <Image src={src} alt="" fill className="object-cover" priority={i === 0} />
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 ? (
          <button onClick={next} className="shrink-0 p-1 text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : <div className="w-8 shrink-0" />}
      </div>

      {/* 도트 인디케이터 */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
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
      )}
    </div>
  );
}
