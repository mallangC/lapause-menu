"use client";

import { useEffect, useRef } from "react";
import type { CompanySettings } from "./companySettings";

/**
 * 공유 매장 설정(settings)으로 탭의 입력 상태를 채운다.
 * - 처음 마운트될 때, 그리고 "다른 탭"이 저장해서 settings가 바뀌었을 때 apply를 실행
 * - 이 탭이 직접 저장한 경우(반환된 markOwnSave를 먼저 호출)는 건너뛴다 — 저장 형식이 입력 형식과 다른
 *   필드(예: 주소+상세주소 합쳐 저장)가 입력칸에 다시 채워져 꼬이는 것을 막기 위함
 */
export function useSettingsSync(settings: CompanySettings, apply: (data: CompanySettings) => void) {
  const skipNext = useRef(false);
  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    apply(settings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);
  return () => { skipNext.current = true; };
}
