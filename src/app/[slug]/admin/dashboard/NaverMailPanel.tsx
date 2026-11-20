"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { naverMailAddress } from "@/lib/naverMail";
import type { CompanySettings } from "./companySettings";

// 예약 관리 — 네이버 예약 메일 연동
// · 매장 받는 주소(복사) · 마지막으로 받은 시각(연결 상태) · 연결 방법
// · 확인이 필요한 네이버 메일 (형식이 다르거나 취소할 예약을 못 찾은 메일) — 사장님 메일함을 거치지 않으니 여기서 꼭 보여준다

interface InboxMail {
  id: string;
  received_at: string;
  subject: string | null;
  body: string;
  reason: string | null;
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function NaverMailPanel({ companyId, settings }: { companyId: string; settings: CompanySettings }) {
  const supabase = createClient();
  const key = (settings as { naver_mail_key?: string | null }).naver_mail_key ?? null;
  const lastAt = (settings as { naver_mail_last_at?: string | null }).naver_mail_last_at ?? null;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inbox, setInbox] = useState<InboxMail[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);

  const load = () =>
    supabase
      .from("naver_mail_inbox")
      .select("id, received_at, subject, body, reason")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .order("received_at", { ascending: false })
      .then(({ data }) => setInbox((data as InboxMail[] | null) ?? []));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (!key) return null;
  const address = naverMailAddress(key);

  const done = async (id: string) => {
    await supabase.from("naver_mail_inbox").update({ status: "done" }).eq("id", id);
    setInbox((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-2">
      {/* 확인이 필요한 메일 — 있을 때만 눈에 띄게 */}
      {inbox.length > 0 && (
        <button
          type="button"
          onClick={() => setInboxOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-left"
        >
          <span className="text-sm text-amber-800">확인이 필요한 네이버 예약 메일 {inbox.length}건</span>
          <span className="text-xs text-amber-700 underline shrink-0">확인하기</span>
        </button>
      )}

      {/* 연동 안내 — 접어 두고 필요할 때 펼친다 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="text-sm font-medium text-gray-800">
            네이버 예약 자동 연동
            <span className="ml-2 text-xs font-normal text-gray-400">{lastAt ? `마지막으로 받은 메일 ${stamp(lastAt)}` : "아직 받은 메일이 없어요"}</span>
          </span>
          <span className="text-xs text-gray-400 shrink-0">{open ? "접기 ▴" : "펼치기 ▾"}</span>
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-3 text-sm text-gray-600">
            <p className="break-keep">
              네이버 예약 알림 메일을 아래 주소로 받게 하면, 예약이 확정되거나 손님이 취소할 때 이 목록에 바로 반영돼요.
              네이버 예약은 메일에 연락처가 없어 연락처 없이 들어오고, 손님 안내는 네이버가 보내요.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-[13px] text-gray-800">{address}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(address).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }).catch(() => {});
                }}
                className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-500 break-keep">
              <li>네이버 스마트플레이스(예약) 알림 설정에서 이메일 알림을 켜고 위 주소를 넣어 주세요.</li>
              <li>예약 확정 메일 → 이 목록에 &lsquo;준비중&rsquo;으로 추가, 손님 취소 메일 → 해당 예약을 &lsquo;취소&rsquo;로 바꿔요.</li>
              <li>읽지 못한 메일은 위에 &lsquo;확인이 필요한 네이버 예약 메일&rsquo;로 보여 드려요.</li>
            </ol>
            <p className="text-xs text-gray-400 break-keep">이 주소는 이 매장 전용이에요. 다른 곳에 알리지 마세요.</p>
          </div>
        )}
      </div>

      {/* 확인이 필요한 메일 목록 */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setInboxOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">확인이 필요한 네이버 예약 메일</h3>
              <button type="button" onClick={() => setInboxOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">닫기</button>
            </div>
            <p className="text-xs text-gray-500 break-keep">
              아래 메일은 자동으로 처리하지 못했어요. 내용을 보고 필요하면 [예약 추가]의 &lsquo;받은 주문 붙여넣기&rsquo;에 붙여 넣어 추가해 주세요. 처리했으면 [처리 완료]를 눌러 주세요.
            </p>
            {inbox.length === 0 && <p className="text-sm text-gray-400 text-center py-6">확인할 메일이 없어요.</p>}
            {inbox.map((m) => (
              <div key={m.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-400">{stamp(m.received_at)}</span>
                  {m.reason && <span className="text-amber-700 text-right">{m.reason}</span>}
                </div>
                <pre className="whitespace-pre-wrap break-words text-[12px] text-gray-700 bg-gray-50 rounded-lg p-2.5 max-h-56 overflow-y-auto font-sans">{m.body}</pre>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(m.body).catch(() => {})}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    내용 복사
                  </button>
                  <button type="button" onClick={() => done(m.id)} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs">
                    처리 완료
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
