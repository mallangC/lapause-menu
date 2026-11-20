"use client";

import { useState } from "react";

// 완성 사진 저장 — 사진을 받아 파일로 내려받는다 (안 되면 새 창으로 열어 길게 눌러 저장)
export default function PhotoSaveButton({ url, name }: { url: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 2000);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={save}
      disabled={busy}
      className="w-full py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60"
    >
      {busy ? "저장 중..." : "사진 저장"}
    </button>
  );
}
