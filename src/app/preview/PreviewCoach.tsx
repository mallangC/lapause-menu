"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface CoachStep {
  /** 강조할 요소 — 앞에서부터 화면에 보이는 첫 요소를 쓴다 (PC·모바일에서 위치가 다른 버튼 대응) */
  selectors: string[];
  /** 함께 감쌀 요소 — 여러 개가 걸리면 첫 줄(맨 위와 같은 높이)만 합친다 */
  also?: string[];
  title: string;
  body: string;
  /** 설명이 끝난 뒤 반짝이는 점을 찍을 요소 — 없으면 강조한 영역의 오른쪽 위 */
  dot?: string[];
  /** 화면에 대상이 없으면 건너뛰는 단계 (예: PC에만 있는 영역) */
  optional?: boolean;
  /** 이 단계에 들어올 때 화면을 바꿀 일 (예: 접힌 항목 펼치기) */
  onEnter?: () => void;
  /** 강조 구멍 모서리 둥글기(px) — 없으면 16. 0이면 네모 */
  radius?: number;
  /** 모바일(768px 미만)에서만 쓸 모서리 둥글기 — 없으면 radius를 그대로 쓴다 */
  mobileRadius?: number;
  /** 모바일에서만 쓸 강조 여백 — 없으면 pad를 그대로 쓴다 */
  mobilePad?: number;
  /** 모바일에서만 좌우 여백을 따로 줄 때 — 없으면 mobilePad(→ pad)와 같다 */
  mobilePadX?: number;
  /** 모바일에서만 강조 영역을 이 요소 아래 끝까지로 줄인다 (긴 목록이 설명 창과 겹칠 때 앞부분만 보여주기) */
  mobileTo?: string[];
  /** 강조 구멍을 요소보다 얼마나 넓게 뚫을지(px) — 없으면 PAD. 0이면 요소에 딱 맞게 */
  pad?: number;
}

interface Props {
  /** 같은 화면의 설명을 다시 띄우지 않기 위한 저장 키 */
  storageKey: string;
  intro: { title: string; body: string };
  steps: CoachStep[];
  outro: { title: string; body: string };
  /** 다른 화면과 같은 항목 설명을 공유할 때의 저장 키 — 이미 봤으면 소개 카드 다음에 항목 설명을 건너뛰고 마무리로 간다 */
  sharedKey?: string;
}

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;
const TOOLTIP_W = 320;
export const COACH_RESTART_EVENT = "preview-coach-restart";
export const COACH_AVAILABLE_EVENT = "preview-coach-available";
// 같은 항목 설명을 여러 화면이 함께 쓰는 묶음 — 한 곳에서 보면 나머지에서는 소개 카드만 보여준다
export const SHARED_COACH = {
  // 선물 정보 1단계: 맞춤주문 · 상품 상세 바로 예약(1개) · 장바구니 주문 · 바로 예약(2개 이상)
  gift: "preview_coach_shared_gift",
  // 예약 확인: 맞춤주문 4단계 · 상품 상세 바로 예약(1개) 2단계
  consultConfirm: "preview_coach_shared_consult_confirm",
  // 예약 확인: 장바구니 주문 2단계 · 바로 예약(2개 이상) 2단계
  checkoutConfirm: "preview_coach_shared_checkout_confirm",
};

// 지금 화면에 코치마크가 있는지 — 이동 바의 '설명 다시 보기' 표시용 (이동 바가 늦게 마운트돼도 알 수 있게 모듈 변수로 둔다)
let mountedCoaches = 0;
export const hasCoach = () => mountedCoaches > 0;

function findVisible(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
    if (el) return el;
  }
  return null;
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

const isVisible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};

// 접힌 메뉴처럼 넘치는 부분을 잘라 숨기는 영역(overflow hidden 등) 밖으로 나가 실제로는 안 보이는지
function isClipped(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const pr = p.getBoundingClientRect();
    // 가운데가 잘리는 영역 밖이면 안 보이는 것으로 본다
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < pr.left || cx > pr.right || cy < pr.top || cy > pr.bottom) return true;
  }
  return false;
}

// 화면 위에 붙어 있는 영역(헤더·단계 표시줄 등)이 가리는 높이
function stickyTopInset(): number {
  let inset = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("header, .sticky, .fixed"))) {
    const style = getComputedStyle(el);
    if (style.position !== "sticky" && style.position !== "fixed") continue;
    const top = parseFloat(style.top);
    const h = el.getBoundingClientRect().height;
    if (Number.isNaN(top) || top > 120 || h === 0 || h > window.innerHeight / 3) continue;
    inset = Math.max(inset, top + h);
  }
  return inset;
}

// 화면에 붙어 있는(fixed·sticky) 요소 안에 있는지
function isPinned(el: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") return true;
  }
  return false;
}

// 단계가 가리키는 영역 — 기준 요소 + also 요소들을 하나의 사각형으로 합친다
function stepRect(step: CoachStep): Rect | null {
  const el = findVisible(step.selectors);
  if (!el) return null;
  const rects = [el.getBoundingClientRect()];
  for (const sel of step.also ?? []) {
    const found = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(isVisible).map((e) => e.getBoundingClientRect());
    if (found.length === 0) continue;
    const firstTop = Math.min(...found.map((r) => r.top));
    rects.push(...found.filter((r) => r.top < firstTop + 1));
  }
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  let bottom = Math.max(...rects.map((r) => r.bottom));
  if (step.mobileTo && window.innerWidth < 768) {
    const end = findVisible(step.mobileTo);
    if (end) bottom = Math.min(bottom, end.getBoundingClientRect().bottom);
  }
  const right = Math.max(...rects.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

// 코치마크 — 소개 → 버튼별 설명(스포트라이트) → 마무리, 끝나면 설명한 버튼에 반짝이는 점을 남긴다
export default function PreviewCoach({ storageKey, intro, steps: allSteps, outro, sharedKey }: Props) {
  // phase: null(닫힘) / 0 소개 / 1..n 단계 / n+1 마무리
  const [phase, setPhase] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dots, setDots] = useState<Rect[]>([]);
  const [dotsVisible, setDotsVisible] = useState(false);
  const rectRef = useRef<Rect | null>(null);
  // 어두운 막의 구멍(SVG mask) id — 특수문자 없이
  const maskId = `coach-mask-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // 단계를 옮기는 중(스크롤 중) — 강조·말풍선을 감춘다
  // 말풍선에 보이는 단계 — 옮기는 중에는 이전 단계 내용을 그대로 두고, 새 자리에 도착한 뒤에 바꾼다
  const [shownPhase, setShownPhase] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);
  // 매 프레임 위치를 재는 곳에서 바로 읽도록 ref에도 둔다 ('다음'을 누른 그 프레임부터 강조가 움직이지 않게)
  const settlingRef = useRef(false);
  const setMoving = (v: boolean) => { settlingRef.current = v; setSettling(v); };
  // 설명을 시작할 때 화면에 없는 optional 단계는 뺀다 (매 렌더마다 새 배열이 되지 않게 고정)
  const [skipped, setSkipped] = useState<number[]>([]);
  const steps = useMemo(() => allSteps.filter((_, i) => !skipped.includes(i)), [allSteps, skipped]);

  const stepIndex = phase !== null && phase >= 1 && phase <= steps.length ? phase - 1 : null;
  const total = steps.length;
  // 같은 항목 설명을 다른 화면에서 이미 봐서 이번엔 건너뛰었는지 — 마무리 카드에 안내 한 줄을 붙인다
  const [sharedSkipped, setSharedSkipped] = useState(false);
  // 설명 다시 보기로 시작했는지 — 이때는 공유 기록이 있어도 항목 설명을 건너뛰지 않는다
  const restarted = useRef(false);

  // 처음 들어오면 자동으로 시작, 이미 본 경우 반짝이는 점만
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(storageKey) === "1"; } catch { /* 저장소 막힘 */ }
    const forced = new URLSearchParams(window.location.search).get("coach");
    if (forced !== null) { const f = Math.min(Number(forced) || 0, allSteps.length + 1); setPhase(f); setShownPhase(f); }
    else if (seen) setDotsVisible(true);
    else { setPhase(0); setShownPhase(0); }

    // 설명 다시 보기는 공유 기록과 상관없이 항목 설명까지 모두 보여준다
    const restart = () => { restarted.current = true; setDotsVisible(false); setMoving(false); setSharedSkipped(false); setPhase(0); setShownPhase(0); };
    window.addEventListener(COACH_RESTART_EVENT, restart);
    mountedCoaches++;
    window.dispatchEvent(new Event(COACH_AVAILABLE_EVENT));
    return () => {
      window.removeEventListener(COACH_RESTART_EVENT, restart);
      mountedCoaches--;
      window.dispatchEvent(new Event(COACH_AVAILABLE_EVENT));
    };
  }, [storageKey, allSteps.length]);

  // 단계에 들어올 때 할 일 (항목 펼치기 등)
  useEffect(() => {
    if (stepIndex !== null) steps[stepIndex].onEnter?.();
  }, [stepIndex, steps]);

  // 단계를 옮길 때 — 강조와 말풍선을 잠깐 감추고, 스크롤이 멈춘 뒤 새 자리에서 다시 보여준다
  // (강조가 스크롤을 따라 미끄러지거나 순간이동하면 어지러워서 '스크롤 먼저, 강조는 나중'으로 나눈다)
  // 들어올 때 화면이 바뀌는 단계는 펼쳐지는 애니메이션이 끝난 뒤에 잰다
  useEffect(() => {
    if (stepIndex === null) return;
    setMoving(true);
    let raf = 0;
    let lastY = window.scrollY;
    let stillSince = 0;
    const startedAt = performance.now();
    const waitStill = (now: number) => {
      if (window.scrollY !== lastY) { lastY = window.scrollY; stillSince = now; }
      // 최소 180ms는 감춰 두고(이전 강조가 사라지는 시간), 스크롤이 120ms 동안 멈춰 있으면 보여준다
      if (now - startedAt > 160 && now - (stillSince || startedAt) > 120) {
        // 새 자리를 먼저 잡고 같은 순간에 보이기 시작한다 (한 프레임이라도 이전 자리에서 보이지 않게)
        const next = stepRect(steps[stepIndex]);
        rectRef.current = next;
        setRect(next);
        setMoving(false);
        setShownPhase(stepIndex + 1);
        return;
      }
      raf = requestAnimationFrame(waitStill);
    };
    const timer = setTimeout(() => {
      scrollToStep(stepIndex);
      stillSince = performance.now();
      raf = requestAnimationFrame(waitStill);
      // 이전 강조가 다 사라진(150ms) 뒤에 스크롤한다
    }, steps[stepIndex].onEnter ? 350 : 160);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [stepIndex, steps]);

  const scrollToStep = (index: number) => {
    const el = findVisible(steps[index].selectors);
    const r = stepRect(steps[index]);
    if (!el || !r) return;
    // 화면에 붙어 있는 버튼(fixed·sticky)은 스크롤해도 위치가 그대로라 건너뛴다
    if (isPinned(el)) return;
    const vh = window.innerHeight;
    const inset = stickyTopInset() + 16;
    if (r.top < inset || r.top + r.height > vh - 220) {
      // 아래에 말풍선 자리(230px)를 남기고 위아래 가운데쯤, 공간이 모자라면 상단 고정 영역 바로 아래로
      const targetTop = Math.max(inset, (vh - 230 - r.height) / 2);
      window.scrollBy({ top: r.top - targetTop, behavior: "smooth" });
    }
  };

  // 스포트라이트 위치를 매 프레임 따라간다 (스크롤·리사이즈·애니메이션 대응)
  useEffect(() => {
    if (stepIndex === null && !dotsVisible) return;
    let raf = 0;
    const tick = () => {
      // 단계를 옮기는 중에는 강조 자리를 그대로 둔다 (감춰지는 동안 새 자리로 튀지 않게, 다시 보일 때 새 자리에서 시작)
      if (stepIndex !== null) {
        if (settlingRef.current) { raf = requestAnimationFrame(tick); return; }
        const next = stepRect(steps[stepIndex]);
        if (!sameRect(next, rectRef.current)) {
          rectRef.current = next;
          setRect(next);
        }
      } else {
        // 스크롤로 헤더·단계 표시줄 밑으로 들어간 점은 숨긴다 (헤더 안 버튼의 점은 그대로)
        const inset = stickyTopInset();
        const next = steps
          .map((s) => {
            const dotEl = s.dot ? findVisible(s.dot) : null;
            const target = dotEl ?? findVisible(s.selectors);
            let r: Rect | null;
            if (dotEl) {
              // 글자 같은 작은 요소는 겹치지 않게 오른쪽 위 바깥에 찍는다
              const b = dotEl.getBoundingClientRect();
              r = { top: b.top - 8, left: b.left + 10, width: b.width, height: b.height };
            } else r = stepRect(s);
            if (r && target && !isPinned(target) && r.top - 4 < inset) return null;
            // 접힌 메뉴 안(넘치는 부분을 잘라 숨기는 영역 밖)에 있는 요소의 점은 숨긴다
            if (target && isClipped(target)) return null;
            return r;
          })
          .filter((r): r is Rect => !!r)
          .map((r) => ({ top: r.top, left: r.left, width: r.width, height: r.height }));
        setDots((prev) => (prev.length === next.length && prev.every((p, i) => sameRect(p, next[i])) ? prev : next));
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [stepIndex, dotsVisible, steps]);

  // 반짝이는 점은 설명한 버튼 중 하나를 누르면 사라진다
  useEffect(() => {
    if (!dotsVisible) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (steps.some((s) => s.selectors.some((sel) => Array.from(document.querySelectorAll(sel)).some((el) => el.contains(target))))) {
        setDotsVisible(false);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dotsVisible, steps]);

  const finish = () => {
    try {
      sessionStorage.setItem(storageKey, "1");
      if (sharedKey) sessionStorage.setItem(sharedKey, "1");
    } catch { /* 저장소 막힘 */ }
    setMoving(false);
    setPhase(null);
    rectRef.current = null;
    setRect(null);
    setDotsVisible(true);
  };

  // Esc 키로도 설명을 끈다
  useEffect(() => {
    if (phase === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (next: number) => {
    if (next < 0) return;
    if (phase === 0 && next === 1) {
      const skip = allSteps.flatMap((st, i) => (st.optional && !findVisible(st.selectors) ? [i] : []));
      setSkipped(skip);
      const remaining = allSteps.length - skip.length;
      if (remaining === 0) return finish();
      // 다른 화면에서 같은 항목 설명을 이미 봤으면 바로 마무리로 (설명 다시 보기로 처음부터 볼 때는 제외)
      let sharedSeen = false;
      try { sharedSeen = !!sharedKey && sessionStorage.getItem(sharedKey) === "1"; } catch { /* 저장소 막힘 */ }
      if (sharedSeen && !restarted.current) {
        setSharedSkipped(true);
        setMoving(false);
        setShownPhase(remaining + 1);
        setPhase(remaining + 1);
        return;
      }
    }
    if (next > total + 1) return finish();
    // 강조 단계로 갈 때는 이전 강조를 제자리에서 감춘 뒤 옮긴다 (소개·마무리 카드는 바로 바꾼다)
    if (next >= 1 && next <= total) setMoving(true);
    else { setMoving(false); setShownPhase(next); }
    setPhase(next);
  };

  if (phase === null) {
    if (!dotsVisible) return null;
    return (
      <div className="pointer-events-none fixed inset-0 z-[45]" aria-hidden>
        {dots.map((d, i) => (
          <span key={i} className="absolute" style={{ top: d.top - 4, left: Math.min(d.left + d.width - 8, window.innerWidth - 22) }}>
            <span className="absolute inline-flex w-3.5 h-3.5 rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
          </span>
        ))}
      </div>
    );
  }

  const isCard = phase === 0 || phase === total + 1;
  // 옮기는 중에는 이전 단계 내용을 보여준다 (사라지는 동안 글자가 먼저 바뀌지 않게)
  const contentPhase = settling && shownPhase !== null && shownPhase >= 1 && shownPhase <= total ? shownPhase : phase;
  const card = contentPhase === 0 ? intro : contentPhase === total + 1 ? outro : steps[contentPhase - 1];
  // 강조 구멍 모양 — 옮기는 중(구멍이 닫히는 동안)에는 이전 단계 모양을 유지하고, 다 닫힌 뒤 새 단계 모양으로 열린다
  const holeStep = contentPhase !== null && contentPhase >= 1 && contentPhase <= total ? steps[contentPhase - 1] : undefined;
  const isMobileView = typeof window !== "undefined" && window.innerWidth < 768;
  const holePad = (isMobileView ? holeStep?.mobilePad : undefined) ?? holeStep?.pad ?? PAD;
  const holePadX = (isMobileView ? holeStep?.mobilePadX : undefined) ?? holePad;
  const holeRadius = (isMobileView ? holeStep?.mobileRadius : undefined) ?? holeStep?.radius ?? 16;

  // 말풍선 위치 — 요소 아래 공간이 넉넉하면 아래, 아니면 위
  let tooltipStyle: React.CSSProperties = {};
  if (!isCard && rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const width = Math.min(TOOLTIP_W, vw - 32);
    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 16), vw - width - 16);
    const vh = window.innerHeight;
    // 말풍선은 강조 구멍 바깥에서 12px 띄운다 — 구멍 여백(holePad)이 단계마다 달라서 기본 PAD가 아니라 그 값을 쓴다
    if (rect.top + rect.height + holePad + 230 < vh) tooltipStyle = { width, left, top: rect.top + rect.height + holePad + 12 };
    else if (rect.top - holePad > 230) tooltipStyle = { width, left, bottom: vh - rect.top + holePad + 12 };
    // 위아래 모두 자리가 없으면(큰 영역) 옆에 자리가 있을 때 오른쪽에, 없으면 화면 아래에 붙인다
    else if (vw - (rect.left + rect.width) > width + holePadX + 32)
      tooltipStyle = { width, left: rect.left + rect.width + holePadX + 16, top: Math.min(Math.max(rect.top, 96), vh - 280) };
    else tooltipStyle = { width, left, bottom: 16 };
  }

  const nav = (
    <div className="flex items-center justify-between mt-4">
      {phase === 0 ? (
        <button onClick={finish} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">건너뛰기</button>
      ) : (
        <button onClick={() => go(phase - 1)} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">이전</button>
      )}
      {!isCard && (
        <div className="flex items-center gap-1">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === contentPhase - 1 ? "w-4 bg-gold-500" : "w-1.5 bg-gray-200"}`} />
          ))}
        </div>
      )}
      <button
        onClick={() => go(phase + 1)}
        className="text-[13px] font-semibold px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
      >
        {phase === 0 ? "시작하기" : phase === total + 1 ? "둘러보기" : "다음"}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={card.title}>
      {/* 클릭 막기 + 어둡게 — 어두운 막 한 장에 강조 자리만 구멍을 낸다.
          단계를 옮길 때는 구멍만 서서히 닫혔다 새 자리에서 열려서, 바깥 어두운 정도는 처음부터 끝까지 그대로다
          (막과 강조를 따로 겹쳐 서로 흐려지게 하면 바뀌는 순간 화면이 밝아졌다 진해지는 것처럼 보인다) */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {!isCard && (
              <rect
                x={(rect?.left ?? 0) - holePadX}
                y={(rect?.top ?? 0) - holePad}
                width={(rect?.width ?? 0) + holePadX * 2}
                height={(rect?.height ?? 0) + holePad * 2}
                rx={holeRadius}
                fill="black"
                style={{ opacity: settling || !rect ? 0 : 1, transition: `opacity ${settling ? 150 : 200}ms ease-out` }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask={`url(#${maskId})`} />
      </svg>

      {isCard ? (
        // key로 카드와 말풍선을 다른 요소로 둔다 — 같은 div를 재사용하면 시작하기를 누를 때 카드가 보이던 상태(불투명)에서 말풍선이 사라지는 애니메이션이 돌아 잠깐 비친다
        <div key="card" className="absolute inset-0 flex items-center justify-center px-5">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            {/* 설명 끄기 — 건너뛰기와 같이 본 것으로 기록하고 반짝이는 점만 남긴다 */}
            <button
              type="button"
              onClick={finish}
              aria-label="설명 닫기"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-gold-500 mb-2">Preview</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 pr-6 whitespace-pre-line">{card.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{card.body}</p>
            {sharedSkipped && contentPhase === total + 1 && (
              <p className="mt-3 text-[13px] text-gray-400 leading-relaxed">
                항목 설명은 앞에서 본 것과 같아 넘어갔어요.
                <br />
                아래 &lsquo;설명 다시 보기&rsquo;로 언제든 다시 볼 수 있어요.
              </p>
            )}
            {nav}
          </div>
        </div>
      ) : (
        <div
          key="tooltip"
          className={`absolute bg-white rounded-2xl p-5 shadow-2xl transition-opacity ease-out ${settling ? "opacity-0 duration-150 pointer-events-none" : "opacity-100 duration-200"}`}
          style={tooltipStyle}
        >
          {/* 설명 끄기 — 건너뛰기와 같이 본 것으로 기록하고 반짝이는 점만 남긴다 */}
          <button
            type="button"
            onClick={finish}
            aria-label="설명 닫기"
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="text-[11px] font-semibold text-gold-500 mb-1">{contentPhase} / {total}</p>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-1.5 pr-6">{card.title}</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">{card.body}</p>
          {nav}
        </div>
      )}
    </div>
  );
}
