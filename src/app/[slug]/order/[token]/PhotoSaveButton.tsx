"use client";

import { useRef, useState } from "react";

// 완성 사진 저장 — 스토리지의 webp 원본을 받아 손님 브라우저 안에서 jpg 로 바꿔 저장한다 (서버·스토리지에는 아무것도 더 저장하지 않음)
// · 휴대폰: 공유 창을 띄운다 → 아이폰은 '이미지 저장'으로 바로 사진첩에, 안드로이드는 갤러리·카톡 등으로
// · PC·공유가 안 되는 브라우저: jpg 파일로 내려받는다
// · 다 실패하면 새 창으로 열어 길게 눌러 저장

/** webp 등 → jpg (흰 바탕, 화질 92%) */
async function toJpeg(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff"; // 투명한 부분이 검게 나오지 않게
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.92),
  );
}

function download(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export default function PhotoSaveButton({ url, name }: { url: string; name: string }) {
  const [busy, setBusy] = useState(false);
  // 사진을 받는 사이 공유 창을 띄울 수 있는 시간이 지나 버리면(아이폰) — 만든 파일을 들고 한 번 더 누르게 한다
  const [again, setAgain] = useState(false);
  const fileRef = useRef<File | null>(null);

  const getFile = async () => {
    if (fileRef.current) return fileRef.current;
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    let file: File;
    try {
      file = new File([await toJpeg(blob)], name, { type: "image/jpeg" });
    } catch {
      // 바꾸기에 실패하면 원본 그대로 (확장자도 원본에 맞춤)
      const ext = blob.type.split("/")[1] || "webp";
      file = new File([blob], name.replace(/\.jpe?g$/i, `.${ext}`), { type: blob.type });
    }
    fileRef.current = file;
    return file;
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = await getFile();
      if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          setAgain(false);
        } catch (e) {
          const err = e as DOMException;
          if (err?.name === "AbortError") return; // 손님이 공유 창을 닫음
          if (err?.name === "NotAllowedError") {
            setAgain(true); // 파일은 준비됐다 — 다시 누르면 바로 공유 창
            return;
          }
          download(file);
        }
        return;
      }
      download(file);
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
      className="w-full py-2 rounded-xl border border-gray-200 text-[13px] text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 break-keep"
    >
      {busy ? "저장 중..." : again ? "한 번 더 누르면 저장돼요" : "사진 저장"}
    </button>
  );
}
