"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { thumbUrl } from "@/lib/imageThumb";

// 매장 사진 — thumb를 주면 목록용 작은 사진(…_thumb.webp)을 먼저 받고, 없으면(예전 사진) 원본으로 바꾼다.
// 사진은 Supabase에서 바로 받는다 (next.config images.unoptimized — Worker CPU를 쓰지 않게).
export default function StoreImage({ src, thumb = false, onError, ...rest }: ImageProps & { src: string; thumb?: boolean }) {
  const small = thumb ? thumbUrl(src) : null;
  // 썸네일을 못 받은 사진 주소 (주소가 바뀌면 다시 썸네일부터)
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const failed = failedFor === src;
  return (
    <Image
      {...rest}
      src={small && !failed ? small : src}
      onError={(e) => {
        if (small && !failed) setFailedFor(src);
        else onError?.(e);
      }}
    />
  );
}
