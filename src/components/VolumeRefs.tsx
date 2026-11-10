"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

// 볼륨감 참고 이미지 — 희망 금액을 정하기 전에 '이 가격이면 이 정도 볼륨' 사진을 나란히 보여준다.
// 카드만 그린다 — 한 줄로 옆으로 밀어 보는 줄(ChipRow)은 쓰는 쪽에서 감싼다.
// 사진을 누르면 크게 본다 — 크게 본 채로 좌우(화살표·밀기·키보드 ←→)로 넘겨 다른 단계와 비교할 수 있다. 큰 사진 창은 body에 바로 그린다 (말풍선의 등장 애니메이션(transform) 위로 올라오게).

export interface VolumeRef {
  name: string;
  price: number;
  image: string;
}

export default function VolumeRefs({ refs }: { refs: VolumeRef[] }) {
  // 크게 보는 사진 번호 (없으면 닫힘)
  const [idx, setIdx] = useState<number | null>(null);
  const open = idx != null ? refs[idx] : null;
  const last = refs.length - 1;
  const go = (d: number) => setIdx((i) => (i == null ? i : Math.min(last, Math.max(0, i + d))));
  // 손가락으로 밀기 — 시작점에서 40px 넘게 옆으로 움직이면 넘긴다
  const touchX = useRef<number | null>(null);

  // 키보드 — ←→ 넘기기, Esc 닫기
  useEffect(() => {
    if (idx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape") setIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <>
      {refs.map((r, i) => (
          <button
            key={`${r.name}-${r.price}`}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`${r.name} 볼륨감 크게 보기`}
            className="group w-32 md:w-36 shrink-0 bg-white rounded-2xl overflow-hidden text-left"
          >
            <div className="relative w-full aspect-[4/5] bg-beige-200">
              <Image src={r.image} alt="" fill sizes="150px" className="object-cover group-hover:scale-[1.03] transition-transform" />
            </div>
            <div className="px-3 py-2">
              <p className="text-[13px] text-gray-500 truncate">{r.name}</p>
              <p className="text-[15px] font-semibold text-gray-900">{r.price.toLocaleString("ko-KR")}원</p>
            </div>
          </button>
      ))}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50" onClick={() => setIdx(null)}>
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-[400px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* 넘겨도 창 크기가 그대로이게 사진 칸은 4:5로 고정 (비교하기 쉽게) */}
              <div
                className="relative w-full aspect-[4/5] max-h-[65vh] bg-beige-100 select-none"
                onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchX.current == null) return;
                  const dx = e.changedTouches[0].clientX - touchX.current;
                  touchX.current = null;
                  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                }}
              >
                <Image key={open.image} src={open.image} alt={`${open.name} 볼륨감 참고`} fill sizes="400px" className="object-cover" />
                {/* 좌우 넘기기 — 끝에서는 숨긴다 */}
                {idx! > 0 && (
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="이전 볼륨"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center text-gray-700 hover:bg-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                {idx! < last && (
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="다음 볼륨"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center text-gray-700 hover:bg-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
                {/* 몇 번째인지 — 점 (누르면 그 단계로) */}
                {refs.length > 1 && (
                  <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                    {refs.map((r, i) => (
                      <button
                        key={`${r.name}-${r.price}`}
                        type="button"
                        onClick={() => setIdx(i)}
                        aria-label={`${r.name} 보기`}
                        className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-4">
                <p className="text-base font-semibold text-gray-900">
                  {open.name} · {open.price.toLocaleString("ko-KR")}원
                </p>
                <p className="text-sm text-gray-500 mt-1 break-keep">볼륨감만 참고해 주세요. 꽃 구성과 색은 주문마다 달라요.</p>
                <button
                  type="button"
                  onClick={() => setIdx(null)}
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
