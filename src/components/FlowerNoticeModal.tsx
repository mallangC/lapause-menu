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
        <p className="text-sm text-gray-700 leading-relaxed">
          생화 특성상 선택하신 상품과 <br />똑같은 구성으로 제작이 불가능합니다.<br />
          이미지를 참고해 비슷한 분위기로 제작해드립니다.
        </p>
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
