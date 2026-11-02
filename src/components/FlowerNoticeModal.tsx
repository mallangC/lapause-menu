"use client";

import { useEffect } from "react";

interface Props {
  onConfirm: () => void;
  onClose: () => void;
}

export default function FlowerNoticeModal({ onConfirm, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-gray-700 leading-relaxed text-center">
          <p>생화는 계절과 입고 상황이 매번 다르기 때문에</p>
          <p>사진과 똑같은 구성으로 제작할 수 없습니다.</p>
          <p>이미지를 참고해 비슷한 분위기로 제작해드립니다.</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-gold-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-gold-600 transition-colors"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}
