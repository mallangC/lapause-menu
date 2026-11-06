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
        className="bg-white rounded-3xl shadow-xl w-full max-w-[400px] px-5 py-6 md:px-6 md:py-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[16px] md:text-[17px] text-gray-700 leading-[1.75] text-center break-keep">
          <p>생화는 계절과 입고 상황이 매번 다르기 때문에</p>
          <p>사진과 똑같은 구성으로 제작이 어렵습니다.</p>
          <p>이미지를 참고해 비슷한 분위기로 준비해 드릴게요.</p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-gold-500 text-white py-4 rounded-2xl font-medium text-base md:text-[17px] hover:bg-gold-600 transition-colors"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}
