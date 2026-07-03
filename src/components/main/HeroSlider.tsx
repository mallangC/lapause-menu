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

  if (images.length === 0) return <div className="w-full aspect-[4/3] md:aspect-[16/6] bg-beige-200" />;

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/6] overflow-hidden bg-beige-200">
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <Image src={src} alt="" fill className="object-cover" priority={i === 0} />
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
