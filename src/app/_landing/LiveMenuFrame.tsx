"use client";

import { useEffect, useRef, useState } from "react";

// 랜딩 기능 소개 — 정지 캡처 대신 프리뷰 화면을 그대로 넣어 보여준다
// (메뉴판·대시보드를 고치면 캡처를 다시 찍을 필요 없이 여기도 저절로 바뀐다)
// 이미지처럼 보이기만 한다 — 맨 위에 고정, 스크롤·누르기 안 됨 (휠은 랜딩 페이지 스크롤로 그대로)
// 정해진 화면 폭(휴대폰 390px / PC 1280px)으로 그린 화면을 자리에 맞게 줄여서 보여준다.
// 프리뷰의 설명 말풍선·이동 바·떠 있는 버튼은 다른 화면 안에 넣으면 나오지 않는다.

interface Props {
  src: string;
  title: string;
  /** 그릴 화면 폭 (px) */
  viewportWidth: number;
  /** 그릴 화면 높이 (px) — 주면 자리 높이를 폭에 맞춰 이 비율로 정하고, 없으면 감싼 자리 높이를 채운다 */
  viewportHeight?: number;
}

export default function LivePreviewFrame({ src, title, viewportWidth, viewportHeight }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / viewportWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewportWidth]);
  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden bg-white ${viewportHeight ? "" : "h-full"}`}
      style={viewportHeight ? { aspectRatio: `${viewportWidth} / ${viewportHeight}` } : undefined}
    >
      {scale > 0 && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          scrolling="no"
          tabIndex={-1}
          aria-hidden
          className="absolute top-0 left-0 border-0"
          style={{
            width: viewportWidth,
            height: viewportHeight ?? `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

/** 랜딩 '전자 메뉴판' — 프리뷰 메뉴판 휴대폰 화면 */
export function LiveMenuFrame() {
  return <LivePreviewFrame src="/preview/customer/menu" title="전자 메뉴판 미리보기" viewportWidth={390} />;
}
