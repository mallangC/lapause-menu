"use client";

import { useEffect, useState } from "react";
import { PROVIDER_LABEL } from "@/lib/oauthIntent";

interface Props {
  /** 이미 가입되어 있는 계정의 로그인 방법 (email | google | kakao) */
  existing: string;
  /** 방금 시도한 소셜 로그인 (google | kakao) */
  attempted: string;
}

export default function AccountExistsModal({ existing, attempted }: Props) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const existingLabel = PROVIDER_LABEL[existing] ?? "다른 방법";
  const attemptedLabel = PROVIDER_LABEL[attempted] ?? "소셜";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 text-center">
          <h2 className="text-base font-semibold text-gray-900">이미 가입된 계정이 있어요</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            같은 이메일로 <strong className="text-gray-900">{existingLabel}</strong> 계정이 이미 가입되어 있습니다.
            <br />
            {existingLabel}(으)로 로그인한 뒤 <strong className="text-gray-900">내 정보 &gt; 소셜 계정 연결</strong>에서
            {" "}{attemptedLabel} 계정을 연결해주세요.
          </p>
          <p className="text-xs text-gray-400">연결 후에는 {attemptedLabel}(으)로도 로그인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full bg-gold-500 text-white py-3 rounded-xl font-medium text-sm hover:bg-gold-600 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
