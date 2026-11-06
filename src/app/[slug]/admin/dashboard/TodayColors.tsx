"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import { FLOWER_COLOR_MAP } from "@/lib/constants";
import { TODAY_COLOR_OPTIONS, colorBusinessDate, isTodayColorsDecided } from "@/lib/todayColors";
import type { CompanySettings } from "./companySettings";

// 오늘 들어온 꽃 색상 — 대시보드 맨 위 카드 + 그날 첫 접속 때 뜨는 팝업
// 저장하면 손님 첫 화면·주문 화면에 바로 쓰이도록 메뉴 캐시도 비운다

/** 저장 — 빈 목록이면 '오늘은 색 안내 없이' */
async function saveTodayColors(companyId: string, colors: string[]) {
  const patch = { today_colors: colors, today_colors_date: colorBusinessDate() };
  const { error } = await createClient().from("company_settings").update(patch).eq("company_id", companyId);
  if (error) return { ok: false as const, error: error.message };
  notifyMenuChanged();
  return { ok: true as const, patch };
}

/** 색 칩 여러 개 고르기 — 3열 격자 (9색이 3줄로 딱 맞는다) */
function ColorChips({ value, onChange, size = "md" }: { value: string[]; onChange: (v: string[]) => void; size?: "md" | "lg" }) {
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div className="grid grid-cols-3 gap-2">
      {TODAY_COLOR_OPTIONS.map((c) => {
        const on = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            aria-pressed={on}
            className={`flex items-center justify-center gap-1.5 rounded-full border transition-colors ${
              size === "lg" ? "px-3.5 py-2 text-[15px]" : "px-3 py-1.5 text-sm"
            } ${on ? "border-gold-500 bg-gold-500/10 text-gold-600 font-medium" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
          >
            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ background: FLOWER_COLOR_MAP[c] }} />
            {c}
          </button>
        );
      })}
    </div>
  );
}

/** 대시보드 맨 위 카드 — 낮에 꽃이 더 들어왔을 때도 여기서 바꾼다. 저장 버튼 없이 누르면 바로 저장 */
export function TodayColorsCard({ companyId, settings, onSaved, inGrid = false }: { companyId: string; settings: CompanySettings; onSaved: (patch: CompanySettings) => void; /** 대시보드 카드 격자 안에 놓일 때 (격자가 이미 모바일 좌우 여백을 처리) */ inGrid?: boolean }) {
  const decided = isTodayColorsDecided(settings);
  const saved: string[] = decided ? settings.today_colors ?? [] : [];
  const [picked, setPicked] = useState<string[]>(saved);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 다른 곳(팝업)에서 저장하면 카드 선택도 맞춘다
  const [syncedFrom, setSyncedFrom] = useState(`${settings.today_colors_date}|${saved.join(",")}`);
  const key = `${settings.today_colors_date}|${saved.join(",")}`;
  if (key !== syncedFrom) {
    setSyncedFrom(key);
    setPicked(saved);
  }

  // 칩을 누르면 바로 저장 — 여러 색을 연달아 누를 수 있게 잠깐(0.6초) 모았다가 한 번에 저장한다
  const change = (next: string[]) => {
    setPicked(next);
    setError(null);
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await saveTodayColors(companyId, next);
      setSaving(false);
      if (!r.ok) {
        setError("저장하지 못했어요. 다시 눌러주세요.");
        return;
      }
      onSaved(r.patch);
    }, 600);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const [m, d] = colorBusinessDate().slice(5).split("-").map(Number);
  const status = saving
    ? "저장 중..."
    : !decided
    ? "아직 오늘 꽃 색상을 알려주지 않았어요"
    : saved.length === 0
    ? "오늘은 색 안내 없이 받고 있어요"
    : `${m}월 ${d}일 업데이트 · 손님 화면에 보여요`;

  return (
    <div id="today-colors" className={`bg-white py-4 px-4 md:rounded-2xl md:px-5 ${inGrid ? "" : "-mx-4 md:mx-0"} ${decided ? "" : "ring-1 ring-inset ring-amber-300 bg-amber-50/40"}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">오늘 들어온 꽃 색상</h3>
        <p className={`text-xs mt-0.5 ${decided || saving ? "text-gray-400" : "text-amber-700 font-medium"}`}>{status}</p>
      </div>
      <ColorChips value={picked} onChange={change} />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** 그날 첫 접속 팝업 — 오늘 아직 안 정했을 때만, 접속(브라우저 탭)마다 한 번 */
export function TodayColorsPrompt({ companyId, settings, onSaved }: { companyId: string; settings: CompanySettings; onSaved: (patch: CompanySettings) => void }) {
  const dismissKey = `today_colors_later_${companyId}_${colorBusinessDate()}`;
  // 처음엔 닫힌 상태로 그리고, 화면에 뜬 뒤 이번 접속에서 '나중에'를 눌렀는지 확인해 연다 (서버 화면과 어긋나지 않게)
  const [closed, setClosed] = useState(true);
  useEffect(() => {
    try {
      setClosed(sessionStorage.getItem(dismissKey) === "1");
    } catch {
      setClosed(false);
    }
  }, [dismissKey]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (closed || isTodayColorsDecided(settings)) return null;

  // 나중에 — 이번 접속에서만 닫는다 (다음 로그인·새 접속 때 다시 뜬다)
  const later = () => {
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch { /* 무시 */ }
    setClosed(true);
  };

  const save = async (colors: string[]) => {
    setBusy(true);
    setError(null);
    const r = await saveTodayColors(companyId, colors);
    setBusy(false);
    if (!r.ok) {
      setError("저장하지 못했어요. 다시 시도해주세요.");
      return;
    }
    onSaved(r.patch);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-[420px] px-5 py-6 md:px-6 md:py-7">
        <p className="text-lg font-semibold text-gray-900">🌷 오늘 들어온 꽃 색상을 알려주세요</p>
        <p className="text-sm text-gray-500 mt-1 mb-5 break-keep">손님 첫 화면과 주문 화면에 바로 보여요.<br />가까운 날짜 주문은 사장님이 선택한 색으로 준비돼요.</p>
        <ColorChips value={picked} onChange={setPicked} size="lg" />
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        <button
          type="button"
          disabled={picked.length === 0 || busy}
          onClick={() => save(picked)}
          className="mt-6 w-full py-3.5 rounded-2xl bg-gold-500 text-white font-medium text-base hover:bg-gold-600 disabled:opacity-40 transition-colors"
        >
          {busy ? "저장 중..." : picked.length === 0 ? "색을 골라주세요" : "저장하기"}
        </button>
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-400">
          <button type="button" onClick={later} className="hover:text-gray-600">나중에 할게요</button>
          <span className="w-px h-3 bg-gray-200" />
          <button type="button" disabled={busy} onClick={() => save([])} className="hover:text-gray-600">오늘은 색 안내 없이 할게요</button>
        </div>
      </div>
    </div>
  );
}
