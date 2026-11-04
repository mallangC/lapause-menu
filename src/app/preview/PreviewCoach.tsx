"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface CoachStep {
  /** 강조할 요소 — 앞에서부터 화면에 보이는 첫 요소를 쓴다 (PC·모바일에서 위치가 다른 버튼 대응) */
  selectors: string[];
  /** 함께 감쌀 요소 — 여러 개가 걸리면 첫 줄(맨 위와 같은 높이)만 합친다 */
  also?: string[];
  title: string;
  body: string;
  /** 설명이 끝난 뒤 반짝이는 점을 찍을 요소 — 없으면 강조한 영역의 오른쪽 위 */
  dot?: string[];
  /** 설명이 끝난 뒤 이 단계에는 반짝이는 점을 찍지 않는다 (누를 곳이 아닌 안내용 영역) */
  noDot?: boolean;
  /** dot 요소의 오른쪽 위 '안쪽' 모서리에 점을 찍는다 (사진처럼 큰 요소) — 없으면 바깥쪽에 찍는다 */
  dotInside?: boolean;
  /** 반짝이는 점 위치를 [오른쪽, 아래] px만큼 옮긴다 — 글자를 가릴 때 살짝 비켜 놓기 */
  dotShift?: [number, number];
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
  /** 모바일에서 설명 창을 화면 아래에 고정하고, 강조 영역은 헤더 바로 아래로 올린다.
   *  강조 영역이 설명 창 위까지 다 들어가지 않으면 설명 창 위 끝에서 잘라 앞부분만 보여준다 */
  mobileSheet?: boolean;
  /** 모바일에서 이 단계에 들어갈 때 강조 영역 위 끝을 상단 고정 영역(헤더·단계 표시 바) 바로 아래에 딱 붙게 스크롤한다 */
  mobileScrollFlush?: boolean;
  /** 위쪽 여백만 따로 줄 때 — 없으면 pad와 같다 */
  padTop?: number;
  /** 모바일에서만 위쪽 여백을 따로 줄 때 — 없으면 mobilePad → padTop → pad 순 */
  mobilePadTop?: number;
  /** 모바일에서만 아래쪽 여백을 따로 줄 때 — 없으면 mobilePad → pad 순 */
  mobilePadBottom?: number;
  /** 모바일에서만 강조할 요소 — 있으면 모바일에서는 selectors·also 대신 이걸 쓴다 (모바일 배치가 PC와 달라 강조 범위를 바꿀 때) */
  mobileSelectors?: string[];
  /** 모바일에서만 강조 영역 아래 끝을 이 요소 아래 끝에 맞춘다 (긴 목록은 앞부분까지만, 제목만 잡은 경우 아래 내용까지 늘리기) */
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
  /** 설명을 마치거나 닫았을 때 할 일 (예: 맨 위로 스크롤) */
  onFinish?: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6;
// 말풍선 너비 — 소개 카드(max-w-sm, 384px)와 같은 크기로 고정
const TOOLTIP_W = 384;
// 말풍선 높이 어림값 — 위아래 자리가 있는지 판단할 때 쓴다 (글자를 소개 카드와 같은 크기로 키워 높아졌다)
const TOOLTIP_H = 280;
// PC(768px 이상)는 설명 창·글자·버튼을 같은 비율(약 1.15배)로 키운다 — 너비 384 → 440, 높이 어림 280 → 320
const TOOLTIP_W_PC = 440;
const TOOLTIP_H_PC = 320;
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
  const useMobile = !!step.mobileSelectors && window.innerWidth < 768;
  const el = findVisible(useMobile ? step.mobileSelectors! : step.selectors);
  if (!el) return null;
  const rects = [el.getBoundingClientRect()];
  for (const sel of useMobile ? [] : step.also ?? []) {
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
    // 강조 영역 아래 끝을 이 요소 아래 끝에 맞춘다 (줄이거나 늘리거나)
    if (end) bottom = end.getBoundingClientRect().bottom;
  }
  const right = Math.max(...rects.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

// 코치마크 — 소개 → 버튼별 설명(스포트라이트) → 마무리, 끝나면 설명한 버튼에 반짝이는 점을 남긴다
export default function PreviewCoach({ storageKey, intro, steps: allSteps, outro, sharedKey, onFinish }: Props) {
  // phase: null(닫힘) / 0 소개 / 1..n 단계 / n+1 마무리
  const [phase, setPhase] = useState<number | null>(null);
  // 아이폰 사파리(리퀴드 글라스)는 화면 고정 요소를 아래 주소창 위까지만 그리고, 주소창 뒤로는 페이지 본문이 비친다.
  // 그래서 화면 고정 막과 별개로 '페이지 본문 위치'에 어두운 막을 하나 더 깔아, 화면 아래 끝 바로 밑(주소창 뒤)을 덮는다.
  // 스크롤할 때마다 위치를 화면 아래 끝에 맞추고, 페이지 끝을 넘지 않게 높이를 잘라 스크롤 길이가 늘지 않게 한다.
  const [belowDim, setBelowDim] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (phase === null) { setBelowDim(null); return; }
    let raf = 0;
    const tick = () => {
      const top = window.scrollY + window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const height = Math.max(0, Math.min(400, docH - top));
      setBelowDim((prev) => (prev && prev.top === top && prev.height === height ? prev : { top, height }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [phase]);
  const [rect, setRect] = useState<Rect | null>(null);
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
    // 모바일 — 강조 영역 위 끝을 상단 고정 영역 바로 아래에 딱 붙인다 (아래에 설명 창 자리를 최대한 남기기)
    if (steps[index].mobileScrollFlush && window.innerWidth < 768) {
      const flush = stickyTopInset() + (steps[index].mobilePadTop ?? steps[index].mobilePad ?? steps[index].pad ?? PAD);
      if (Math.abs(r.top - flush) > 2) window.scrollBy({ top: r.top - flush, behavior: "smooth" });
      return;
    }
    // 모바일 아래 고정 설명 창 단계 — 강조 영역 위 끝을 헤더 바로 아래로
    if (steps[index].mobileSheet && window.innerWidth < 768) {
      if (Math.abs(r.top - inset) > 4) window.scrollBy({ top: r.top - inset, behavior: "smooth" });
      return;
    }
    if (r.top < inset || r.top + r.height > vh - 220) {
      // 아래에 말풍선 자리(230px)를 남기고 위아래 가운데쯤, 공간이 모자라면 상단 고정 영역 바로 아래로
      const targetTop = Math.max(inset, (vh - 230 - r.height) / 2);
      window.scrollBy({ top: r.top - targetTop, behavior: "smooth" });
    }
  };

  // 스포트라이트 위치를 매 프레임 따라간다 (스크롤·리사이즈·애니메이션 대응)
  useEffect(() => {
    if (stepIndex === null) return;
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
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [stepIndex, steps]);

  // 반짝이는 점은 설명한 버튼을 눌러도 사라지지 않고 계속 남는다 (어디를 눌러볼지 계속 안내)
  // 점은 대상 요소 안에 직접 붙인다(포털) — 화면 위에 따로 띄워 매 프레임 위치를 옮기면 아이폰 튕김 스크롤에서 한 박자 늦게 따라와 떨린다.
  // 요소 안에 있으면 스크롤·sticky를 브라우저가 함께 처리해 같은 박자로 움직인다. 대상이 바뀌는(탭 이동 등) 경우만 가끔 다시 찾는다
  // host: 대상 요소 끝에 붙인 빈 그릇 — React가 관리하는 요소(글자만 든 버튼 등)에 바로 포털하면 오류가 나서, 직접 만든 그릇에 그린다
  const [dotTargets, setDotTargets] = useState<{ el: HTMLElement; host: HTMLElement; top: number; right: number }[]>([]);
  useEffect(() => {
    if (!dotsVisible || phase !== null) { setDotTargets([]); return; }
    const touched: { el: HTMLElement; prev: string }[] = [];
    const hosts = new Map<HTMLElement, HTMLElement>();
    const hostOf = (el: HTMLElement) => {
      let host = hosts.get(el);
      if (!host) {
        host = document.createElement("span");
        host.setAttribute("aria-hidden", "true");
        hosts.set(el, host);
      }
      // 버튼 글자가 바뀌면(예: '담겼습니다 ✓') React가 내용을 새로 써서 그릇이 빠질 수 있다 — 빠졌으면 다시 붙인다
      if (host.parentElement !== el) el.appendChild(host);
      return host;
    };
    const find = () => {
      const vw = window.innerWidth;
      const next = steps.flatMap((s) => {
        if (s.noDot) return [];
        const dotEl = s.dot ? findVisible(s.dot) : null;
        let el = dotEl ?? findVisible(s.selectors);
        if (!el || isClipped(el)) return [];
        // 표 줄(tr)·입력칸처럼 안에 점을 넣을 수 없는 요소는 마지막 칸·감싼 요소에 붙인다
        if (el.tagName === "TR" && el.lastElementChild) el = el.lastElementChild as HTMLElement;
        if (["INPUT", "IMG", "SELECT", "TEXTAREA"].includes(el.tagName) && el.parentElement) el = el.parentElement;
        const cs = getComputedStyle(el);
        const clips = cs.overflowX !== "visible" || cs.overflowY !== "visible";
        // 기본: 오른쪽 위 모서리에 살짝 걸치게 / 작은 글자(dot 지정): 바깥쪽 / 사진(dotInside)·넘침을 잘라내는 요소: 안쪽
        let top = -4, right = -6;
        if (dotEl && s.dotInside) { top = 6; right = 6; }
        else if (dotEl) { top = -12; right = -16; }
        if (clips && !(dotEl && s.dotInside)) { top = 4; right = 4; }
        if (s.dotShift) { right -= s.dotShift[0]; top += s.dotShift[1]; }
        // 화면 오른쪽 밖으로 나가지 않게
        const er = el.getBoundingClientRect();
        if (er.right - right + 14 > vw - 6) right = Math.max(right, er.right + 14 - (vw - 6));
        // 넘치는 부분을 잘라내는 바깥 상자(가로 스크롤 탭 줄 등) 안에 있으면, 점이 그 상자 밖으로 삐져나가 잘리지 않게 안쪽으로 당긴다
        let anc = el.parentElement;
        while (anc && anc !== document.body) {
          const acs = getComputedStyle(anc);
          if (acs.overflowX !== "visible" || acs.overflowY !== "visible") {
            const cr = anc.getBoundingClientRect();
            top = Math.max(top, cr.top - er.top + 2);
            right = Math.max(right, er.right - cr.right + 2);
            break;
          }
          anc = anc.parentElement;
        }
        return [{ el, host: hostOf(el), top, right }];
      });
      // 점을 넣을 요소는 위치 기준(relative)이 있어야 한다 — 없으면 잠깐 붙여 두고 끝나면 되돌린다
      for (const t of next) {
        if (getComputedStyle(t.el).position === "static" && !touched.some((x) => x.el === t.el)) {
          touched.push({ el: t.el, prev: t.el.style.position });
          t.el.style.position = "relative";
        }
      }
      setDotTargets((prev) =>
        prev.length === next.length && prev.every((p, i) => p.host === next[i].host && p.top === next[i].top && p.right === next[i].right) ? prev : next,
      );
    };
    find();
    const timer = setInterval(find, 500);
    return () => {
      clearInterval(timer);
      for (const host of hosts.values()) host.remove();
      for (const t of touched) t.el.style.position = t.prev;
    };
  }, [dotsVisible, phase, steps]);

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
    onFinish?.();
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

  // 설명 창 실제 높이 — 모바일 아래 고정 단계에서 강조 영역을 설명 창 위 끝에서 자를 때 쓴다
  const [tooltipEl, setTooltipEl] = useState<HTMLDivElement | null>(null);
  const [tooltipH, setTooltipH] = useState(0);
  useEffect(() => {
    if (!tooltipEl) return;
    const ro = new ResizeObserver(() => setTooltipH(tooltipEl.offsetHeight));
    ro.observe(tooltipEl);
    setTooltipH(tooltipEl.offsetHeight);
    return () => ro.disconnect();
  }, [tooltipEl]);

  if (phase === null) {
    if (!dotsVisible) return null;
    return (
      <>
        {dotTargets.map((t, i) =>
          createPortal(
            <span aria-hidden className="pointer-events-none absolute z-[1] w-3.5 h-3.5" style={{ top: t.top, right: t.right }}>
              <span className="absolute inline-flex w-3.5 h-3.5 rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
            </span>,
            t.host,
            `dot-${i}`,
          ),
        )}
      </>
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
  const holePadTop =
    (isMobileView ? holeStep?.mobilePadTop ?? holeStep?.mobilePad : undefined) ?? holeStep?.padTop ?? holePad;
  const holePadBottom = (isMobileView ? holeStep?.mobilePadBottom : undefined) ?? holePad;
  // 모바일 아래 고정 설명 창 — 설명 창은 화면 아래 16px에, 강조 영역은 설명 창 위 12px에서 잘라 보여준다
  const sheet = isMobileView && !!holeStep?.mobileSheet;
  const SHEET_BOTTOM = 16;
  const holeRect =
    sheet && rect && tooltipH > 0
      ? (() => {
          const maxBottom = window.innerHeight - SHEET_BOTTOM - tooltipH - 12 - holePad;
          return rect.top + rect.height > maxBottom ? { ...rect, height: Math.max(0, maxBottom - rect.top) } : rect;
        })()
      : rect;
  const holeRadius = (isMobileView ? holeStep?.mobileRadius : undefined) ?? holeStep?.radius ?? 16;

  // 말풍선 위치 — 요소 아래 공간이 넉넉하면 아래, 아니면 위
  let tooltipStyle: React.CSSProperties = {};
  if (!isCard && rect && typeof window !== "undefined" && sheet) {
    // 모바일 아래 고정 — 화면 폭에 맞춰 아래에 붙인다
    tooltipStyle = { left: 16, width: window.innerWidth - 32, bottom: SHEET_BOTTOM };
  } else if (!isCard && rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const pc = vw >= 768;
    const tipH = pc ? TOOLTIP_H_PC : TOOLTIP_H;
    const width = Math.min(pc ? TOOLTIP_W_PC : TOOLTIP_W, vw - 32);
    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 16), vw - width - 16);
    const vh = window.innerHeight;
    // 말풍선은 강조 구멍 바깥에서 12px 띄운다 — 구멍 여백(holePad)이 단계마다 달라서 기본 PAD가 아니라 그 값을 쓴다
    if (rect.top + rect.height + holePad + tipH < vh) tooltipStyle = { width, left, top: rect.top + rect.height + holePad + 12 };
    else if (rect.top - holePad > tipH) tooltipStyle = { width, left, bottom: vh - rect.top + holePad + 12 };
    // 위아래 모두 자리가 없으면(큰 영역) 옆에 자리가 있을 때 오른쪽에, 없으면 화면 아래에 붙인다
    else if (vw - (rect.left + rect.width) > width + holePadX + 32)
      tooltipStyle = { width, left: rect.left + rect.width + holePadX + 16, top: Math.min(Math.max(rect.top, 96), vh - tipH - 40) };
    else tooltipStyle = { width, left, bottom: 16 };
  }

  const nav = (
    // 3칸 격자 — 가운데 단계 점이 양쪽 버튼 크기와 상관없이 말풍선 정중앙에 오게 (좌: 이전/건너뛰기, 우: 다음)
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-4">
      {phase === 0 ? (
        <button onClick={finish} className="justify-self-start text-sm md:text-base text-gray-400 hover:text-gray-600 transition-colors">건너뛰기</button>
      ) : (
        <button onClick={() => go(phase - 1)} className="justify-self-start text-sm md:text-base text-gray-400 hover:text-gray-600 transition-colors">이전</button>
      )}
      {!isCard ? (
        <div className="flex items-center gap-1">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 md:h-2 rounded-full transition-all ${i === contentPhase - 1 ? "w-4 md:w-5 bg-gold-500" : "w-1.5 md:w-2 bg-gray-200"}`} />
          ))}
        </div>
      ) : (
        <span />
      )}
      <button
        onClick={() => go(phase + 1)}
        // 버튼 크게 — 소개 카드·단계 말풍선 모두 같은 크기
        className="justify-self-end min-w-[104px] md:min-w-[120px] text-[15px] md:text-[17px] font-semibold px-5 md:px-6 py-3 md:py-3.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
      >
        {/* 단계 설명이 없는 화면은 소개 카드만 보여주고 바로 둘러보게 한다 */}
        {phase === 0 ? (allSteps.length === 0 ? "둘러보기" : "시작하기") : phase === total + 1 ? "둘러보기" : "다음"}
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
                x={(holeRect?.left ?? 0) - holePadX}
                y={(holeRect?.top ?? 0) - holePadTop}
                width={(holeRect?.width ?? 0) + holePadX * 2}
                height={(holeRect?.height ?? 0) + holePadTop + holePadBottom}
                rx={holeRadius}
                fill="black"
                style={{ opacity: settling || !rect ? 0 : 1, transition: `opacity ${settling ? 150 : 200}ms ease-out` }}
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask={`url(#${maskId})`} />
      </svg>
      {belowDim && belowDim.height > 0 && createPortal(
        <div
          aria-hidden
          className="pointer-events-none"
          style={{ position: "absolute", left: 0, right: 0, top: belowDim.top, height: belowDim.height, zIndex: 70, background: "rgba(0,0,0,0.6)" }}
        />,
        document.body,
      )}

      {isCard ? (
        // key로 카드와 말풍선을 다른 요소로 둔다 — 같은 div를 재사용하면 시작하기를 누를 때 카드가 보이던 상태(불투명)에서 말풍선이 사라지는 애니메이션이 돌아 잠깐 비친다
        <div key="card" className="absolute inset-0 flex items-center justify-center px-5">
          <div className="relative w-full max-w-sm md:max-w-[440px] bg-white rounded-3xl p-6 md:p-7">
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
            <p className="text-[11px] md:text-[13px] tracking-[0.2em] uppercase font-semibold text-gold-500 mb-2">Preview</p>
            <h2 className="text-lg md:text-[21px] font-semibold text-gray-900 mb-2 md:mb-2.5 pr-6 whitespace-pre-line">{card.title}</h2>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed whitespace-pre-line">{card.body}</p>
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
          ref={setTooltipEl}
          // 소개 카드와 같은 모양·여백 (rounded-3xl, p-6)
          className={`absolute bg-white rounded-3xl p-6 md:p-7 transition-opacity ease-out ${settling ? "opacity-0 duration-150 pointer-events-none" : "opacity-100 duration-200"}`}
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
          {/* 글자 크기는 소개 카드와 같게 — 제목 text-lg, 본문 text-sm */}
          <p className="text-[11px] md:text-[13px] tracking-[0.2em] font-semibold text-gold-500 mb-2">{contentPhase} / {total}</p>
          <h2 className="text-lg md:text-[21px] font-semibold text-gray-900 mb-2 md:mb-2.5 pr-6 whitespace-pre-line">{card.title}</h2>
          <p className="text-sm md:text-base text-gray-500 leading-relaxed whitespace-pre-line">{card.body}</p>
          {nav}
        </div>
      )}
    </div>
  );
}
