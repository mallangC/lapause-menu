"use client";

import { useEffect, type RefObject } from "react";

/**
 * 상품 상세 PC(2단) — 왼쪽 사진은 헤더 아래 고정(sticky)이고 오른쪽 정보·버튼이 올라오다가,
 * 버튼 아래 끝이 사진 아래 끝과 한 줄이 되면 그때부터 함께 내려간다.
 *
 * 화면 폭이 좁아 사진은 작아졌는데 오른쪽(설명·옵션)이 길고 창 세로까지 길면,
 * 버튼이 사진과 한 줄이 되기 전에 페이지 끝에 닿아 더 내려가지 않았다 (사진 아래가 비어 보인 채로 멈춤).
 * 그럴 때만 페이지 맨 아래 여백(spacerRef)을 모자란 만큼 늘려, 한 줄이 되는 지점까지 스크롤할 수 있게 한다.
 * 모바일(1단)에서는 여백을 두지 않는다.
 *
 * rowRef: 두 칸을 감싼 줄 (아래 여백은 이 줄의 padding-bottom), imageRef: 왼쪽 사진 칸, spacerRef: 페이지 맨 아래 빈 칸
 */
export function useDetailImageFollow(
  rowRef: RefObject<HTMLElement | null>,
  imageRef: RefObject<HTMLElement | null>,
  spacerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const row = rowRef.current;
    const img = imageRef.current;
    const spacer = spacerRef.current;
    if (!row || !img || !spacer) return;
    const twoColumns = window.matchMedia("(min-width: 768px)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const current = spacer.offsetHeight;
      let need = 0;
      if (twoColumns.matches) {
        const padBottom = parseFloat(getComputedStyle(row).paddingBottom) || 0;
        const rowTop = row.getBoundingClientRect().top + window.scrollY;
        const stickyTop = parseFloat(getComputedStyle(img).top) || 0;
        // 버튼 아래 끝(= 오른쪽 내용 끝)이 고정된 사진 아래 끝에 닿는 스크롤 위치
        const lineUp = rowTop + row.offsetHeight - padBottom - img.offsetHeight - stickyTop;
        // 지금 여백을 빼고 내릴 수 있는 끝
        const maxScroll = document.documentElement.scrollHeight - current - window.innerHeight;
        need = Math.max(0, Math.ceil(lineUp - maxScroll) + 1); // 소수점 반올림으로 1px 모자라지 않게
      }
      if (need !== current) spacer.style.height = need ? `${need}px` : "";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", schedule);
    twoColumns.addEventListener("change", schedule);
    // 옵션·추천 상품·실제 사진을 불러와 높이가 바뀌어도 다시 맞춘다
    const observer = new ResizeObserver(schedule);
    observer.observe(row);
    observer.observe(img);
    observer.observe(document.body);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      twoColumns.removeEventListener("change", schedule);
      observer.disconnect();
      spacer.style.height = "";
    };
  }, [rowRef, imageRef, spacerRef]);
}
