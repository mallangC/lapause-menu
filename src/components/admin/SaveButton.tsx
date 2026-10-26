"use client";

import { forwardRef, useImperativeHandle, useState, useRef, useLayoutEffect, useEffect } from "react";

type SaveState = "idle" | "saving" | "success";

export interface SaveButtonHandle {
  trigger: () => void;
}

interface Props {
  onSave: () => Promise<boolean | void> | boolean | void;
  idleLabel?: string;
  savingLabel?: string;
  successLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 저장 버튼 — idle → saving(스피너) → success(체크 팝) → 3초 후 idle로 복귀.
 * 상태별 콘텐츠 너비 변화는 버튼 자체에 transition을 걸어 부드럽게 늘었다 줄었다 하게 한다.
 * <form onSubmit>으로 Enter 제출을 지원해야 하면 ref로 trigger()를 호출한다 (버튼은 늘 type="button").
 */
const SaveButton = forwardRef<SaveButtonHandle, Props>(function SaveButton(
  { onSave, idleLabel = "저장", savingLabel = "저장 중...", successLabel = "저장 완료", disabled, className = "" },
  ref
) {
  const [state, setState] = useState<SaveState>("idle");
  const contentRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setWidth(contentRef.current.offsetWidth);
    }
  }, [state]);

  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [state]);

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("saving");
    try {
      const result = await onSave();
      if (result === false) {
        setState("idle");
      } else {
        setState("success");
      }
    } catch {
      setState("idle");
    }
  };

  useImperativeHandle(ref, () => ({ trigger: handleClick }));

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state !== "idle"}
      style={width !== undefined ? { width } : undefined}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg transition-[width] duration-300 ease-out disabled:cursor-default ${className}`}
    >
      <span ref={contentRef} className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 whitespace-nowrap">
        {state === "saving" && (
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z" />
          </svg>
        )}
        {state === "success" && (
          <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 animate-check-pop">
            <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {state === "idle" && idleLabel}
        {state === "saving" && savingLabel}
        {state === "success" && successLabel}
      </span>
    </button>
  );
});

export default SaveButton;
