"use client";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

const WINDOW = 5;

// 관리자 목록 공통 페이지 번호 — 현재 페이지 주변 최대 5개 + 이전/다음
export default function Pagination({ page, totalPages, onChange, disabled = false, className = "" }: Props) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), totalPages - WINDOW + 1));
  const numbers = Array.from({ length: Math.min(WINDOW, totalPages) }, (_, i) => start + i);
  const arrowCls = "w-8 h-8 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors";

  return (
    <div className={`flex items-center justify-center gap-1 ${disabled ? "opacity-50" : ""} ${className}`}>
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1 || disabled} className={arrowCls} aria-label="이전 페이지">
        ‹
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          disabled={disabled}
          className={`w-8 h-8 rounded-lg text-sm transition-colors ${n === page ? "bg-gold-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          {n}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages || disabled} className={arrowCls} aria-label="다음 페이지">
        ›
      </button>
    </div>
  );
}
