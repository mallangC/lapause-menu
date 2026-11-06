"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

// 크기 참고 사진 보기 — 동그라미 안 물음표(?)를 누르면 사장님이 넣어 둔 그 크기의 참고 사진이 뜬다.
// 사진이 없는 크기면 버튼을 그리지 않는다.
// 사진 창은 body에 바로 그린다 — 말풍선 안에 두면 등장 애니메이션(transform) 때문에 뒤에 오는 카드가 창 위로 올라오고,
// 문장(<p>) 안에 <div>가 들어가 화면 구조 오류가 난다.

export default function SizeGuideButton({ name, image, className = "" }: { name: string; image: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!image) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${name} 크기 참고 사진 보기`}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-gold-400 text-gold-600 text-[11px] font-bold leading-none hover:bg-gold-500 hover:text-white hover:border-gold-500 transition-colors align-middle ${className}`}
      >
        ?
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 창 너비는 고정, 사진은 가로를 꽉 채우고 세로는 사진 비율대로 (빈 여백 없이). 너무 긴 사진만 화면 높이에 맞춰 자른다 */}
            <Image
              src={image}
              alt={`${name} 크기 참고`}
              width={800}
              height={1000}
              sizes="400px"
              className="block w-full h-auto max-h-[65vh] object-cover bg-beige-100"
            />
            <div className="px-5 py-4">
              <p className="text-base font-semibold text-gray-900">{name} 크기 참고</p>
              <p className="text-sm text-gray-500 mt-1 break-keep">크기만 참고해 주세요. 꽃 구성과 색은 주문마다 달라요.</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full py-3 rounded-2xl bg-gold-500 text-white font-medium hover:bg-gold-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
