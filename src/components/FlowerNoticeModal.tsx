"use client";

import { useEffect } from "react";

interface Props {
  onConfirm: () => void;
  onClose: () => void;
  /** 찾아본 사진 주문 — 원하는 구성이 어려우면 취소될 수 있다는 안내를 함께 (한 번에 보여준다) */
  photoOrder?: boolean;
}

export default function FlowerNoticeModal({ onConfirm, onClose, photoOrder = false }: Props) {
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
        {photoOrder ? (
          // 사진 주문 — 안내가 두 가지라 줄머리 표시(-)로 나눠 보여준다
          <ul className="space-y-3 text-[16px] md:text-[17px] text-gray-700 leading-[1.75] break-keep">
            <li className="flex gap-2">
              <span className="shrink-0 text-gold-500">-</span>
              <span>생화는 계절과 입고 상황이 매번 다르기 때문에 사진과 똑같은 구성으로 제작이 어렵습니다. 이미지를 참고해 비슷한 분위기로 준비해 드릴게요.</span>
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 text-gold-500">-</span>
              <span>원하시는 구성으로 제작이 어려운 경우 예약이 취소될 수 있어요.</span>
            </li>
          </ul>
        ) : (
          <div className="text-[16px] md:text-[17px] text-gray-700 leading-[1.75] text-center break-keep">
            <p>생화는 계절과 입고 상황이 매번 다르기 때문에</p>
            <p>사진과 똑같은 구성으로 제작이 어렵습니다.</p>
            <p>이미지를 참고해 비슷한 분위기로 준비해 드릴게요.</p>
          </div>
        )}
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
