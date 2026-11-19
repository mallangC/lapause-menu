"use client";

import SaveButton, { type SaveButtonHandle } from "./SaveButton";

// 설정 탭 아래 저장 줄 — 바뀐 내용이 있으면 '바뀐 내용이 있어요 · 되돌리기'와 금색 저장 버튼, 없으면 흐린 저장 버튼
// (붙어 있는 자리·여백은 쓰는 쪽의 sticky 상자가 정한다)
export default function SaveBar({
  dirty,
  onSave,
  onRevert,
  saveRef,
}: {
  dirty: boolean;
  onSave: () => Promise<boolean | void> | boolean | void;
  onRevert?: () => void;
  /** 폼 Enter로 저장할 때 (trigger) */
  saveRef?: React.Ref<SaveButtonHandle>;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 min-w-0">
        {dirty ? (
          <p className="flex items-center gap-1.5 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 animate-pulse" aria-hidden />
            <span className="truncate">바뀐 내용이 있어요</span>
          </p>
        ) : null}
      </div>
      {dirty && onRevert && (
        <button type="button" onClick={onRevert} className="shrink-0 text-sm text-gray-500 hover:text-gray-800 px-2 py-2">
          되돌리기
        </button>
      )}
      <SaveButton
        ref={saveRef}
        onSave={onSave}
        idleLabel="저장하기"
        className={`shrink-0 text-sm font-medium transition-colors ${dirty ? "text-white bg-gold-500 hover:bg-gold-600 shadow-sm" : "text-gray-400 bg-gray-100"}`}
      />
    </div>
  );
}
