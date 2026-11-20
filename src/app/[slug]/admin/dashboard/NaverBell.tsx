"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import NaverMailPanel from "./NaverMailPanel";
import type { Reservation } from "./reservations/types";
import type { CompanySettings } from "./companySettings";

// 위쪽 알림 종 (헤더 오른쪽) — 어느 탭에서든 보인다
// · 확인하지 않은 네이버 예약 (메일로 자동으로 들어온 새 예약·취소)
// · 읽지 못한 네이버 메일 (자동으로 처리하지 못한 메일)
// 목록을 밀지 않고 눌러서 본다 — 휴대폰도 종에서 펼쳐지는 창

export default function NaverBell({
  companyId,
  settings,
  unchecked,
  onCheck,
  onOpenReservation,
}: {
  companyId: string;
  settings: CompanySettings;
  unchecked: Reservation[];
  /** 확인했어요 — 한 건(id) 또는 전부 */
  onCheck: (id?: string) => void;
  /** 예약을 고르면 — 예약 관리로 넘어가 그 예약 상세를 연다 */
  onOpenReservation: (r: Reservation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  // 화면이 뜬 뒤에만 페이지 맨 위층에 붙인다 (서버에서 그린 화면과 어긋나지 않게)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = unchecked.length + inboxCount;
  // 창 위치 — 종 바로 아래, 화면 안에 들어오게
  const [pos, setPos] = useState<{ top: number; right: number; width: number; originX: number } | null>(null);

  const toggle = (el: HTMLElement) => {
    if (open) return setOpen(false);
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.min(380, vw - 32);
    // 창 오른쪽 끝은 종 오른쪽에 맞추되, 왼쪽이 화면 밖으로 나가면 안쪽으로 당긴다
    const right = Math.min(Math.max(16, vw - r.right), vw - 16 - width);
    const left = vw - right - width;
    setPos({ top: r.bottom + 8, right, width, originX: r.left + r.width / 2 - left });
    setOpen(true);
  };

  // 창은 화면에 고정된 위치라 — 페이지가 스크롤되거나 화면 크기가 바뀌면 닫는다 (종과 떨어지지 않게)
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

  const date = (r: Reservation) =>
    `${Number(r.desired_date.slice(5, 7))}/${Number(r.desired_date.slice(8, 10))}${r.desired_time ? ` ${r.desired_time.slice(0, 5)}` : ""}`;

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

      {/* 위쪽 줄(sticky) 안에 두면 다른 화면 요소에 가려질 수 있어 페이지 맨 위층에 띄운다 */}
      {open && pos && createPortal(
        <>
          {/* 바깥을 누르면 닫힘 */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            style={{ top: pos.top, right: pos.right, width: pos.width, transformOrigin: `${pos.originX}px 0` }}
            className="fixed z-[61] bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[70vh] overflow-y-auto animate-[bell-pop_.16s_ease-out]"
          >
            <p className="px-4 pt-3 pb-2 text-sm font-semibold text-gray-900">알림</p>
            <div className="flex items-center justify-between gap-3 px-4 pb-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                확인하지 않은 알림 <span className="font-semibold text-red-500">{unchecked.length}</span>건
              </p>
              {unchecked.length > 0 && (
                <button type="button" onClick={() => onCheck()} className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  모두 확인
                </button>
              )}
            </div>
            {unchecked.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">새로 확인할 네이버 예약이 없어요.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {unchecked.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50">
                    {/* 누르면 예약 관리로 넘어가 그 예약 상세 (확인 처리) — 왼쪽은 구분, 오른쪽은 이름·날짜 / 상품 */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onCheck(r.id);
                        onOpenReservation(r);
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2.5 text-left text-sm"
                    >
                      <span className={`w-11 shrink-0 text-[11px] font-semibold ${r.status === "취소" ? "text-gray-500" : "text-red-600"}`}>{r.status === "취소" ? "취소됨" : "새 예약"}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">
                          <span className="text-gray-800">{r.orderer_name}</span>
                          <span className="ml-1.5 text-gray-500">{date(r)}</span>
                        </span>
                        <span className="block text-xs text-gray-400 truncate">{(r.items ?? []).map((i) => i.name).join(", ")}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => onCheck(r.id)} className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                      확인
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {inboxCount > 0 && (
              <button
                type="button"
                onClick={() => { setOpen(false); setInboxOpen(true); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-amber-700 hover:bg-amber-50"
              >
                <span>읽지 못한 네이버 메일 {inboxCount}건</span>
                <span className="text-xs">보기 →</span>
              </button>
            )}
          </div>
        </>,
        document.body,
      )}

      {/* 처리하지 못한 네이버 메일 목록 — '보기'로 연다 (메일 수는 늘 불러와 종 숫자에 더한다) */}
      {mounted &&
        createPortal(
          <NaverMailPanel companyId={companyId} settings={settings} part="inbox" open={inboxOpen} onClose={() => setInboxOpen(false)} onCount={setInboxCount} />,
          document.body,
        )}
    </>
  );
}
