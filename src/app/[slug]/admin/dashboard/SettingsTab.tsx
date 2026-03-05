"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";

interface Props {
  companyId: string;
  initialBg: string;
  initialAccent: string;
  onThemeChange: (bg: string, accent: string) => void;
  onSignOut: () => void;
}

export default function SettingsTab({ companyId, initialBg, initialAccent, onThemeChange, onSignOut }: Props) {
  const [bg, setBg] = useState(initialBg);
  const [accent, setAccent] = useState(initialAccent);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const previewVars = generateThemeVars(bg, accent);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: err } = await supabase
      .from("companies")
      .update({ theme_bg: bg, theme_accent: accent })
      .eq("id", companyId);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      onThemeChange(bg, accent);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setBg(DEFAULT_THEME_BG);
    setAccent(DEFAULT_THEME_ACCENT);
  };

  return (
    <div className="max-w-md space-y-8">
      <h2 className="text-xl font-medium text-gray-900">설정</h2>

      {/* 색상 설정 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">사이트 색상</h3>

        <div className="space-y-4">
          {/* 배경색 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">배경색</p>
              <p className="text-xs text-gray-400 mt-0.5">페이지 전체 배경 계열</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">{bg}</span>
              <label className="relative cursor-pointer">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm overflow-hidden"
                  style={{ backgroundColor: bg }}
                />
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* 포인트색 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">포인트색</p>
              <p className="text-xs text-gray-400 mt-0.5">버튼, 강조 요소 색상</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">{accent}</span>
              <label className="relative cursor-pointer">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm overflow-hidden"
                  style={{ backgroundColor: accent }}
                />
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 미리보기 */}
        <div
          className="mt-5 rounded-xl p-4 border"
          style={{
            ...previewVars as React.CSSProperties,
            backgroundColor: previewVars["--color-beige-100"],
            borderColor: previewVars["--color-beige-300"],
          }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: previewVars["--color-beige-400"] }}>
            미리보기
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: previewVars["--color-gold-500"] }}
            >
              버튼 예시
            </button>
            <span
              className="px-3 py-1.5 rounded-lg text-xs border"
              style={{
                borderColor: previewVars["--color-beige-300"],
                backgroundColor: previewVars["--color-beige-50"],
                color: "#2c2416",
              }}
            >
              태그 예시
            </span>
            <span className="text-xs font-semibold tracking-wider" style={{ color: previewVars["--color-gold-500"] }}>
              포인트 텍스트
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">저장됐습니다.</div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gold-500 hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            기본값으로
          </button>
        </div>
      </div>

      {/* 계정 */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">계정</h3>
        <button
          onClick={onSignOut}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
