"use client";

import { useEffect, useRef, useState } from "react";

// 설정 탭 — 저장한 값과 지금 입력 값이 다른지(바뀐 내용이 있는지) 알아낸다
// snapshot: 저장 대상 입력 값을 JSON 글자로 · clean(): "지금 값이 저장된 값"이라고 표시 (불러온 뒤 · 저장한 뒤 · 되돌린 뒤)
// clean()은 값이 아직 화면에 반영되기 전에 불러도 되도록, 다음 그리기 때의 값을 기준으로 잡는다

/** 탭별 '바뀐 내용 있음' — 탭을 옮길 때 확인하는 데 쓴다 */
const dirtyTabs = new Map<string, boolean>();
/** 이 탭에 저장하지 않은 내용이 있는지 */
export const hasUnsaved = (key: string) => dirtyTabs.get(key) === true;

let unloadBound = false;
const bindUnload = () => {
  if (unloadBound || typeof window === "undefined") return;
  unloadBound = true;
  // 저장하지 않고 창을 닫거나 새로고침하면 브라우저가 한 번 묻는다
  window.addEventListener("beforeunload", (e) => {
    if ([...dirtyTabs.values()].some(Boolean)) e.preventDefault();
  });
};

export function useDirty(key: string, snapshot: string) {
  const [base, setBase] = useState<string | null>(null);
  // 몇 번째 그리기인지 · clean()을 부른 그리기 — 그다음 그리기의 값을 '저장된 값'으로 잡는다
  // (불러온 값·저장한 값이 화면 상태에 반영된 뒤의 값을 잡아야 해서, 부른 그 순간이 아니라 한 번 더 그린 뒤)
  const renders = useRef(0);
  renders.current += 1;
  const cleanAt = useRef(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (cleanAt.current >= 0 && renders.current > cleanAt.current) {
      cleanAt.current = -1;
      setBase(snapshot);
    }
  });
  const dirty = base !== null && base !== snapshot;
  useEffect(() => {
    bindUnload();
    dirtyTabs.set(key, dirty);
  }, [key, dirty]);
  useEffect(() => () => { dirtyTabs.delete(key); }, [key]);
  return {
    dirty,
    clean: () => {
      cleanAt.current = renders.current;
      // 바뀐 값이 없어도 한 번 더 그려 기준을 잡게
      setTick((t) => t + 1);
    },
  };
}
