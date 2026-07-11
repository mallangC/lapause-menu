"use client";

export default function ServiceSuspended({ companyName }: { companyName: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf7f2] px-6 text-center">
      <div className="mb-8">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#c9a96e] mb-3">
        {companyName}
      </p>
      <h1 className="text-xl font-semibold text-[#2c2416] mb-3">
        현재 메뉴판 운영이 중단되었습니다
      </h1>
      <p className="text-sm text-[#9a8470] leading-relaxed">
        일시적으로 서비스를 이용할 수 없습니다.<br />
        자세한 문의는 매장으로 연락해 주세요.
      </p>
    </div>
  );
}
