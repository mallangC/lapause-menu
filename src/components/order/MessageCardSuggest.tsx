"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MESSAGE_CARD_MAX } from "@/lib/constants";

// 메시지 카드 문구 추천 — [문구 추천]을 누르면 문구가 하나씩 나오고, 좌우로 넘기다 누르면 그 문구가 입력칸에 들어간다.
// 고른 선물 목적(기념·축하·감사·위로)에 맞는 문구를 먼저, 그다음 어디에나 어울리는 문구를 보여준다. (30자 이내)

// 문구는 담백하게 — 짧고 평범한 말투로 (과장·감탄 없이)
const BY_PURPOSE: Record<string, string[]> = {
  기념: [
    "함께한 시간 고마워. 앞으로도 잘 부탁해",
    "기념일 축하해. 늘 고마워",
    "변함없이 곁에 있어줘서 고마워",
    "오늘도 함께라서 좋아",
    "우리의 오늘을 축하하며",
  ],
  축하: [
    "축하해요. 정말 잘됐어요",
    "생일 축하해. 좋은 한 해 보내",
    "새로운 시작을 응원해요",
    "그동안 수고 많았어요. 축하해요",
    "좋은 소식 축하드려요",
  ],
  감사: [
    "늘 고마워요",
    "덕분에 힘이 났어요. 고맙습니다",
    "그동안 정말 감사했습니다",
    "작은 마음이지만 고마움을 전해요",
    "항상 감사한 마음입니다",
  ],
  위로: [
    "오늘 하루도 수고 많았어요",
    "천천히 괜찮아질 거예요",
    "곁에서 응원할게요",
    "마음으로 함께합니다",
    "깊은 위로를 전합니다",
  ],
};

// 꽃과 함께 마음을 전하는 말 — 받는 사람에게 건네는 한마디로
const COMMON = [
  "늘 고마워요. 사랑해요",
  "고마운 마음을 꽃에 담아 전해요",
  "늘 곁에 있어줘서 고마워요",
  "언제나 응원할게요",
  "앞으로도 잘 부탁해요",
  "건강하고 행복하세요",
  "웃는 날이 더 많기를 바라요",
  "보고 싶은 마음을 담아 보내요",
  "당신의 오늘을 응원해요",
  "마음을 담아 보냅니다",
];

export function cardPhrases(purpose?: string | null): string[] {
  const own = (purpose && BY_PURPOSE[purpose]) || [];
  return [...own, ...COMMON];
}

export default function MessageCardSuggest({ purpose, onPick }: { purpose?: string | null; onPick: (text: string) => void }) {
  const list = cardPhrases(purpose);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  // 추천 창이 열리고 닫히거나 문구 길이로 높이가 바뀌어도 아래 입력칸은 제자리 — 늘어난 만큼 화면을 바로 올려 위쪽이 밀려 올라가게
  // (아래로 밀렸다가 다시 올라오는 왔다갔다 없이)
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevBottom = useRef<number | null>(null);
  const keepBelow = () => {
    prevBottom.current = wrapRef.current?.getBoundingClientRect().bottom ?? null;
  };
  useLayoutEffect(() => {
    const before = prevBottom.current;
    prevBottom.current = null;
    const el = wrapRef.current;
    if (before == null || !el) return;
    const d = el.getBoundingClientRect().bottom - before;
    if (Math.abs(d) > 0.5) window.scrollBy({ top: d, behavior: "instant" });
  }, [open, idx]);
  const go = (d: number) => { keepBelow(); setIdx((i) => (i + d + list.length) % list.length); };
  const close = () => { keepBelow(); setOpen(false); };

  // 아래 여백은 감싸는 상자에 (버튼·창 어느 쪽이든 같은 기준으로 높이를 잰다)
  return <div ref={wrapRef} className="pb-2">{open ? panel() : button()}</div>;

  function button() {
    return (
      <button
        type="button"
        onClick={() => { keepBelow(); setOpen(true); setIdx(0); }}
        className="inline-flex align-top items-center gap-1 px-3 py-1.5 rounded-full border border-gold-400 bg-white text-xs font-medium text-gold-600 hover:bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.8 4.2 11 8l3.8 1.2L11 10.4 9.8 14.2 8.6 10.4 4.8 9.2 8.6 8l1.2-3.8ZM17 13l.7 2.3L20 16l-2.3.7L17 19l-.7-2.3L14 16l2.3-.7L17 13Z" />
        </svg>
        문구 추천
      </button>
    );
  }

  function panel() {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-gold-500)_35%,#fff)] bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] p-2">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="이전 문구" onClick={() => go(-1)} className="shrink-0 w-8 h-10 flex items-center justify-center text-gold-500 hover:text-gold-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        {/* 누르면 이 문구를 쓴다 · 좌우로 밀어 넘긴다 */}
        <button
          type="button"
          key={idx}
          onClick={() => { onPick(list[idx]); close(); }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const start = touchX.current;
            touchX.current = null;
            if (start == null) return;
            const dx = e.changedTouches[0].clientX - start;
            if (Math.abs(dx) > 40) { e.preventDefault(); go(dx < 0 ? 1 : -1); }
          }}
          className="flex-1 min-h-[52px] px-3 py-2 rounded-lg bg-white text-sm text-gray-800 text-center break-keep leading-snug hover:ring-1 hover:ring-gold-400"
        >
          {list[idx]}
        </button>
        <button type="button" aria-label="다음 문구" onClick={() => go(1)} className="shrink-0 w-8 h-10 flex items-center justify-center text-gold-500 hover:text-gold-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-2 text-[11px] text-gray-400">
        <span>문구를 누르면 입력돼요 · {idx + 1}/{list.length}</span>
        <button type="button" onClick={close} className="hover:text-gray-600">닫기</button>
      </div>
    </div>
  );
  }
}

/** 메시지 카드 권장 글자 수 — 이보다 길면 안내 (50자까지는 쓸 수 있다) */
export const MESSAGE_CARD_RECOMMEND = 30;
/** 메시지 카드 입력칸 안내 */
export const MESSAGE_CARD_PLACEHOLDER = `${MESSAGE_CARD_RECOMMEND}자 이내로 쓰면 카드에 가장 예쁘게 들어가요.`;

/** 입력칸 오른쪽 아래 글자 수 (30자 권장은 입력칸 안내 문구로만 알린다) */
export function MessageCardCount({ text }: { text: string }) {
  return (
    <p className="mt-1 text-right text-[11px] text-gray-400 tabular-nums">
      {text.length}/{MESSAGE_CARD_MAX}
    </p>
  );
}
