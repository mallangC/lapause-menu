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
          className="absolute bottom-full left-0 right-0 mb-3 rounded-2xl px-5 py-4 shadow-2xl"
          style={{
            background: "rgba(24,19,14,0.94)",
            border: "1px solid rgba(201,169,110,0.4)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-1.5"
            style={{ color: "#c9a96e" }}
          >
            사장님께
          </p>
          <p className="text-[13px] leading-relaxed text-white/85">
            손님이 상품을 예약하기 전에 이 안내가 자동으로 떠요.
            <br />
            결제 전에 손님이 안내를 확인하도록 해 손님이 꽃의 특성을 이해하고
            &lsquo;사진과 달라요&rsquo; 같은 분쟁을 줄여줘요.
          </p>
        </div>

        {/* 실제 손님 화면과 같은 안내 팝업 */}
        <div
          className="bg-white rounded-2xl shadow-xl w-full p-6 space-y-4"
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
    </div>
  );
}
