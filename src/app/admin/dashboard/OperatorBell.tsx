"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// 운영자 알림 종 — 판매 신청(검토 중) · 오류 알림(서버에서 심각한 오류가 나면 쌓인다)
// 판매 신청은 승인·반려하면, 오류 알림은 [확인]을 누르면 빠진다

export interface PendingApply {
  company_id: string;
  name: string;
}

export interface OpsAlert {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  count: number;
  last_at: string;
  company: { name: string; slug: string } | null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function OperatorBell({
  pending,
  onOpen,
  alerts = [],
  onResolve,
}: {
  pending: PendingApply[];
  /** 판매 신청을 고르면 — 검증 관리 탭으로 */
  onOpen: () => void;
  /** 오류 알림 (확인 전) */
  alerts?: OpsAlert[];
  /** 오류 알림 확인 — id 하나 또는 전부 */
  onResolve?: (id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = pending.length + alerts.length;
  // 창 위치 — 종 바로 아래, 화면 안에 들어오게
  const [pos, setPos] = useState<{ top: number; right: number; width: number; originX: number } | null>(null);

  const toggle = (el: HTMLElement) => {
    if (open) return setOpen(false);
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(380, vw - 32);
    const right = Math.min(Math.max(16, vw - r.right), vw - 16 - width);
    const left = vw - right - width;
    setPos({ top: r.bottom + 2, right, width, originX: r.left + r.width / 2 - left });
    setOpen(true);
  };

  // 창은 화면에 고정된 위치라 — 스크롤·화면 크기가 바뀌면 닫는다
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const go = () => {
    setOpen(false);
    onOpen();
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => toggle(e.currentTarget)}
        aria-label={`알림 ${count}건`}
        className={`relative p-1.5 rounded-lg transition-colors ${count > 0 ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center animate-pulse">{count}</span>
        )}
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            style={{ top: pos.top, right: pos.right, width: pos.width, transformOrigin: `${pos.originX}px 0` }}
            className="fixed z-[61] bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[70vh] overflow-y-auto animate-[bell-pop_.16s_ease-out]"
          >
            <p className="px-4 pt-3 pb-2 text-sm font-semibold text-gray-900 border-b border-gray-100">알림</p>
            {/* 오류 알림 — 위에 (고쳐야 할 것) */}
            {alerts.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 px-4 py-2 bg-red-50/60">
                  <p className="text-xs font-medium text-red-600">오류 알림 {alerts.length}건</p>
                  {onResolve && (
                    <button type="button" onClick={() => onResolve()} className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-white">
                      모두 확인
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-gray-50">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 px-4 py-2.5">
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="text-gray-800 break-keep">
                          {a.title}
                          {a.count > 1 && <span className="ml-1 text-xs text-red-500 font-medium">×{a.count}</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 break-all">
                          {a.company?.name ? `${a.company.name} · ` : ""}{when(a.last_at)}
                        </p>
                        {a.detail && <p className="text-xs text-gray-400 mt-0.5 break-all line-clamp-2">{a.detail}</p>}
                      </div>
                      {onResolve && (
                        <button type="button" onClick={() => onResolve(a.id)} className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                          확인
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {count === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">새 알림이 없어요.</p>
            ) : pending.length === 0 ? null : (
              <ul className="divide-y divide-gray-50 border-t border-gray-100">
                {pending.map((p) => (
                  <li key={p.company_id}>
                    <button type="button" onClick={go} className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-gray-50">
                      <span className="w-14 shrink-0 text-[11px] font-semibold text-red-600">판매 신청</span>
                      <span className="flex-1 min-w-0 truncate text-gray-800">{p.name || "(이름 없는 매장)"}</span>
                      <span className="shrink-0 text-xs text-gray-400">검토 →</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
