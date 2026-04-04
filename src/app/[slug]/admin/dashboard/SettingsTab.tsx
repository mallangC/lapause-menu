"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
import { PRODUCT_TYPES, SEASONS } from "@/lib/constants";
import HomeTab from "./HomeTab";

interface Props {
  companyId: string;
  initialBg: string;
  initialAccent: string;
  initialHiddenProductTypes: string[];
  initialHiddenSeasons: string[];
  initialFeaturedImage: string | null;
  initialAllImage: string | null;
  initialSeasonImage: string | null;
  initialConsultImage: string | null;
  consultEnabled: boolean;
  onThemeChange: (bg: string, accent: string) => void;
  onMenuSave: (hiddenProductTypes: string[], hiddenSeasons: string[]) => void;
}

export default function SettingsTab({ companyId, initialBg, initialAccent, initialHiddenProductTypes, initialHiddenSeasons, initialFeaturedImage, initialAllImage, initialSeasonImage, initialConsultImage, consultEnabled, onThemeChange, onMenuSave }: Props) {
  const [bg, setBg] = useState(initialBg);
  const [accent, setAccent] = useState(initialAccent);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hiddenProductTypes, setHiddenProductTypes] = useState<string[]>(initialHiddenProductTypes);
  const [hiddenSeasons, setHiddenSeasons] = useState<string[]>(initialHiddenSeasons);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);

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
      setTimeout(() => setSuccess(false), 3000);
      onThemeChange(bg, accent);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setBg(DEFAULT_THEME_BG);
    setAccent(DEFAULT_THEME_ACCENT);
  };

  const toggleProductType = (type: string) => {
    setHiddenProductTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
    setMenuSaved(false);
  };

  const toggleSeason = (season: string) => {
    setHiddenSeasons((prev) => prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season]);
    setMenuSaved(false);
  };

  const handleMenuSave = async () => {
    setMenuSaving(true);
    await supabase
      .from("companies")
      .update({ hidden_product_types: hiddenProductTypes, hidden_seasons: hiddenSeasons })
      .eq("id", companyId);
    setMenuSaving(false);
    setMenuSaved(true);
    onMenuSave(hiddenProductTypes, hiddenSeasons);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-medium text-gray-900">디자인</h2>

      {/* 홈 화면 이미지 */}
      <div>
        <HomeTab
          companyId={companyId}
          initialFeaturedImage={initialFeaturedImage}
          initialAllImage={initialAllImage}
          initialSeasonImage={initialSeasonImage}
          initialConsultImage={initialConsultImage}
          consultEnabled={consultEnabled}
        />
      </div>

      {/* 메뉴 설정 */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">메뉴 설정</h3>
          <p className="text-xs text-gray-400">고객 화면의 필터에서 숨길 항목을 선택하세요.</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">상품 유형 숨김</p>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((type) => {
              const isHidden = hiddenProductTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleProductType(type)}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                    isHidden
                      ? "border-red-300 bg-red-50 text-red-500 font-medium"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {isHidden ? `${type} (숨김)` : type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">시즌 숨김</p>
          <div className="grid grid-cols-3 gap-2">
            {SEASONS.map((season) => {
              const isHidden = hiddenSeasons.includes(season);
              return (
                <button
                  key={season}
                  onClick={() => toggleSeason(season)}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                    isHidden
                      ? "border-red-300 bg-red-50 text-red-500 font-medium"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {isHidden ? `${season} (숨김)` : season}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleMenuSave}
          disabled={menuSaving}
          className="bg-gold-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50"
        >
          {menuSaving ? "저장 중..." : menuSaved ? "저장됨 ✓" : "저장"}
        </button>
      </div>

      {/* 사이트 색상 */}
      <div className="border-t border-gray-200 pt-6">
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

        <div className="mt-6 flex items-center gap-3">
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
          {success && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              저장됐습니다.
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
