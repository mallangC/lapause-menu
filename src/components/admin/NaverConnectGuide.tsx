"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// 네이버 예약 자동 연동 — 연결 방법 안내 창 (위에 설명, 아래 화면 사진을 한 장씩 단계별로)
// 사진: public/naver-guide/step-1.webp ~ step-3.webp (사장님이 넣은 png를 webp로 바꿔 둔다)
// 매장 정보 탭의 '연결 방법 보기'와 온보딩 대화의 '화면 사진으로 따라 하기'가 함께 쓴다

export const NAVER_GUIDE_STEPS = [
  { image: "/naver-guide/step-1.webp", caption: "스마트플레이스 왼쪽 메뉴에서 예약 > 설정을 눌러 설정 화면으로 이동해요." },
  { image: "/naver-guide/step-2.webp", caption: "위쪽 탭에서 알림설정을 누르고, 아래 관리자 운영 알림을 눌러요." },
  { image: "/naver-guide/step-3.webp", caption: "이메일 알림을 활성화하고, 이메일 추가를 눌러 이메일 알림 주소를 넣어요." },
] as const;

export default function NaverConnectGuide({ open, onClose, address }: { open: boolean; onClose: () => void; address?: string }) {
  const [step, setStep] = useState(0);
  const [missing, setMissing] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);
  // 주소 복사 — 잠깐 '복사됨'
  const [copied, setCopied] = useState(false);
  // 사진 크기 — 화면 캡처(2배 해상도)라 원래 폭의 절반이 제 크기. 그보다 크게 늘리지 않는다 (늘리면 흐려진다)
  const [naturalW, setNaturalW] = useState<Record<number, number>>({});
  // 크게 보기
  const [zoom, setZoom] = useState(false);
  const copy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  useEffect(() => setMounted(true), []);
  // 열 때마다 첫 장부터
  useEffect(() => {
    if (open) { setStep(0); setZoom(false); }
  }, [open]);
  // 키보드 — ←/→ 넘기기, Esc 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (zoom) setZoom(false); else onClose(); return; }
      if (zoom) return;
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, NAVER_GUIDE_STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, zoom]);

  if (!open || !mounted) return null;
  const last = NAVER_GUIDE_STEPS.length - 1;
  const cur = NAVER_GUIDE_STEPS[step];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-md flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">네이버 예약 연결 방법</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* 설명 */}
          <div className="space-y-1.5 text-sm text-gray-600 break-keep">
            <p>네이버 스마트플레이스의 이메일 알림에 아래 주소를 추가하면, 네이버 예약이 확정될 때 예약 관리에 자동으로 추가되고 손님이 취소하면 자동으로 취소돼요.</p>
            {address && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <p className="text-[11px] text-gray-400">이메일 알림 주소</p>
                {/* 좁은 화면에서는 주소 뒷부분을 …으로 줄이고 복사 버튼은 늘 보이게 */}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="flex-1 min-w-0 truncate text-sm font-mono text-gray-800" title={address}>{address}</p>
                  <button
                    type="button"
                    onClick={copy}
                    className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-colors ${copied ? "border-gold-500 bg-gold-500/10 text-gold-600 font-medium" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                  >
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 break-keep mt-1">이 주소는 이 매장 전용이에요. 다른 곳에 알리지 마세요.</p>
              </div>
            )}
          </div>

          {/* 단계별 사진 — 한 장씩 */}
          <div>
            <p className="text-sm font-medium text-gray-800 break-keep mb-2">
              <span className="inline-flex w-5 h-5 mr-1.5 rounded-full bg-gold-500 text-white text-xs items-center justify-center align-[1px]">{step + 1}</span>
              {cur.caption}
            </p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center min-h-[240px]">
              {missing[step] ? (
                <p className="text-xs text-gray-400 py-16">사진 준비 중이에요</p>
              ) : (
                // 누르면 크게 보기
                <button type="button" onClick={() => setZoom(true)} className="block w-full cursor-zoom-in" aria-label={`${step + 1}단계 사진 크게 보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={cur.image}
                    src={cur.image}
                    alt={`${step + 1}단계 — ${cur.caption}`}
                    onLoad={(e) => { const w = e.currentTarget.naturalWidth; setNaturalW((m) => (m[step] === w ? m : { ...m, [step]: w })); }}
                    onError={() => setMissing((m) => ({ ...m, [step]: true }))}
                    style={naturalW[step] ? { width: naturalW[step] / 2 } : undefined}
                    className="block mx-auto max-w-full h-auto max-h-[55vh] object-contain"
                  />
                </button>
              )}
            </div>
          </div>

          {/* 연결 후에는 — 마지막 단계에서만 (사진을 다 본 뒤) */}
          {step === NAVER_GUIDE_STEPS.length - 1 && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1.5 text-xs text-gray-600 break-keep">
              <p className="text-sm font-medium text-gray-800">연결 후에는</p>
              {/* 목록 — 줄이 넘어가도 점 뒤 글자에 맞춰 들여쓴다 */}
              <ul className="list-disc pl-4 space-y-1.5 marker:text-gray-400">
                {/* 네이버 메일에는 이름 가운데가 가려져 있고 전화번호가 없다 — 사장님이 직접 채워야 한다 */}
                <li>네이버 예약 메일에는 예약자 이름이 &lsquo;홍*동&rsquo;처럼 일부 가려져 오고 전화번호는 오지 않아요. 고객 관리를 위해 네이버 예약 내역에서 확인한 뒤, &lsquo;예약 수정&rsquo;에서 이름과 전화번호를 직접 입력해 주세요.</li>
                <li>예약 확정 시 예약 관리에 예약이 추가되고, 손님이 예약을 취소 시 해당 예약을 &lsquo;취소&rsquo;로 변경해요.</li>
                <li>둘 다 확인하실 때까지 &lsquo;확인 필요&rsquo;로 표시돼요.</li>
                <li>새로 추가·취소된 예약과 읽지 못한 메일은 화면 위쪽 알림
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-3.5 h-3.5 mx-0.5 -mt-0.5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-label="종 아이콘">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  에서 볼 수 있어요.</li>
              </ul>
            </div>
          )}
        </div>

        {/* 넘기기 */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            ← 이전
          </button>
          <div className="flex items-center gap-1.5" aria-label={`${step + 1} / ${NAVER_GUIDE_STEPS.length}단계`}>
            {NAVER_GUIDE_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`${i + 1}단계 보기`}
                className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-gold-500" : "w-2 bg-gray-200 hover:bg-gray-300"}`}
              />
            ))}
          </div>
          {step < last ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="px-3 py-2 rounded-lg text-sm font-medium text-gold-600 hover:bg-gold-50">
              다음 →
            </button>
          ) : (
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm font-medium text-gold-600 hover:bg-gold-50">
              다 했어요
            </button>
          )}
        </div>
      </div>
      {/* 크게 보기 — 화면 가득, 누르거나 Esc로 닫기 */}
      {zoom && !missing[step] && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out overflow-auto"
          onClick={(e) => { e.stopPropagation(); setZoom(false); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.image} alt={`${step + 1}단계 — ${cur.caption}`} className="max-w-full max-h-full object-contain rounded-lg bg-white" />
        </div>
      )}
    </div>,
    document.body,
  );
}
