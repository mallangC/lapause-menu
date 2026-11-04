"use client";

import { useEffect } from "react";

interface Props {
  onConfirm: () => void;
  onClose: () => void;
}

// 미리보기 생화 안내 팝업 — 실제 FlowerNoticeModal 복사본에 사장님용 설명 카드를 팝업 바로 위에 붙였다
export default function PreviewFlowerNotice({ onConfirm, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      {/* 안내 팝업은 실제 화면처럼 정중앙에 두고, 설명 카드는 그 바로 위에 띄운다 */}
      <div className="relative w-full max-w-sm">
        {/* 사장님용 설명 카드 */}
        <div
          // 흰 바탕 — 아래 안내 팝업과 같은 톤
          className="absolute bottom-full left-0 right-0 mb-3 rounded-2xl px-5 py-4 shadow-xl bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-xs tracking-[0.2em] uppercase font-semibold mb-2"
            style={{ color: "#c9a96e" }}
          >
            사장님께
          </p>
          <p className="text-sm leading-relaxed text-gray-600">
            손님이 상품을 예약하기 전에 이 안내가 자동으로 떠요.
            <br />
            손님은 결제 전에 아래와 같은 안내 사항을 확인하고
            <br />
            사장님은 반복되는 내용을 별도로 안내하지 않아도 돼요.
          </p>
        </div>

        {/* 실제 손님 화면과 같은 안내 팝업 */}
        <div
          className="bg-white rounded-2xl shadow-xl w-full p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm text-gray-700 leading-relaxed text-center">
            <p>생화는 계절과 입고 상황이 매번 다르기 때문에</p>
            <p>사진과 똑같은 구성으로 제작이 어렵습니다.</p>
            <p>이미지를 참고해 비슷한 분위기로 준비해 드릴게요.</p>
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
    </div>
  );
}
