"use client";

import { useState } from "react";

export default function FloAideFooter() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
      >
        Powered by Flo.Aide
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 text-[10px] text-gray-400 space-y-0.5 leading-relaxed">
          <p>상호명: 라포즈 플레르 스토어 &nbsp;|&nbsp; 대표자: 최경재</p>
          <p>사업자등록번호: 698-15-00460</p>
          {/* <p>통신판매업신고번호: 제0000-서울강남-0000호</p> */}
          <p>사업장 주소: 서울특별시 관악구 남부순환로 168나길 14-2</p>
          <p>이메일: kk3500@naver.com</p>
        </div>
      )}
    </div>
  );
}
