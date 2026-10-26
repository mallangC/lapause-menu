"use client";

import { useState } from "react";

interface StoreBusinessInfo {
  name: string;
  representativeName?: string | null;
  businessNumber?: string | null;
  mailOrderNumber?: string | null;
  address?: string | null;
  phone?: string | null;
}

interface Props {
  store: StoreBusinessInfo;
}

export default function BusinessInfoFooter({ store }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1"
      >
        사업자 정보
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
        <div className="mt-2 max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-0 sm:divide-x sm:divide-gray-200">
          <div className="sm:pr-4">
            <p className="text-[10px] text-gray-400 font-medium mb-1">판매자 정보</p>
            <div className="text-[10px] text-gray-400 space-y-0.5 leading-relaxed">
              <p>상호명: {store.name}</p>
              {store.representativeName && <p>대표자: {store.representativeName}</p>}
              {store.businessNumber && <p>사업자등록번호: {store.businessNumber}</p>}
              {store.mailOrderNumber && <p>통신판매업신고번호: {store.mailOrderNumber}</p>}
              {store.address && <p>사업장 주소: {store.address}</p>}
              {store.phone && <p>전화: {store.phone}</p>}
            </div>
          </div>

          <div className="sm:pl-4">
            <p className="text-[10px] text-gray-400 font-medium mb-1">플랫폼 운영자 정보</p>
            <div className="text-[10px] text-gray-400 space-y-0.5 leading-relaxed">
              <p>상호명: 말랑 스튜디오</p>
              <p>대표자: 최경재</p>
              <p>사업자등록번호: 698-15-00460</p>
              <p>사업장 주소: 서울특별시 관악구 남부순환로 168나길 14-2</p>
              <p>전화: 0507-1371-6290</p>
              <p>이메일: floaide.team@gmail.com</p>
              <p>@2026 Flo.Aide</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
