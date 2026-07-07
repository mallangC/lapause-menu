"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSliderProps {
  images: string[];
}

export default function HeroSlider({ images }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setTimeout(next, 4000);
    return () => clearTimeout(timer);
  }, [current, next, images.length]);

  if (images.length === 0) return <div className="w-full h-52 bg-beige-200" />;

  return (
    <div className="py-4 bg-beige-100 overflow-hidden">
      <div
        className="flex gap-3 transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(calc(8% - ${current * 84}% - ${current * 12}px))` }}
      >
        {images.map((src, i) => (
          <div
            key={src}
            onClick={() => setCurrent(i)}
            className={`relative shrink-0 w-[84%] aspect-[4/2.2] rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
              i === current ? "shadow-lg opacity-100 scale-100" : "shadow-sm opacity-40 scale-95"
            }`}
          >
            <Image src={src} alt="" fill className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>

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
