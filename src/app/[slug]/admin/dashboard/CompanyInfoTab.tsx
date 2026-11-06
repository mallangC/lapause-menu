"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import SaveButton, { SaveButtonHandle } from "@/components/admin/SaveButton";
import { notifyMenuChanged } from "@/lib/menuCacheClient";

interface Props {
  companyId: string;
  initialName: string;
  initialLogo: string | null;
  slug: string;
  initialNaverTalkUrl: string | null;
  initialKakaoChannelUrl: string | null;
  initialInstagramUrl: string | null;
  initialYoutubeUrl: string | null;
  initialPhone: string | null;
  /** 주차 가능 여부 */
  initialParking: string | null;
  plan: "monthly" | "annual" | "none" | "free";
  /** 공유 매장 설정 갱신 (대시보드 '손님 문의 줄이기'가 바로 반영되게) */
  onSettingsSaved?: (patch: Record<string, unknown>) => void;
  onSave: (name: string, logo: string | null, locationUrl: string | null, kakaoChannelUrl: string | null, instagramUrl: string | null, youtubeUrl: string | null) => void;
}

export default function CompanyInfoTab({ companyId, initialName, initialLogo, slug, initialNaverTalkUrl, initialKakaoChannelUrl, initialInstagramUrl, initialYoutubeUrl, initialParking, onSettingsSaved, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [locationUrl, setNaverTalkUrl] = useState(initialNaverTalkUrl ?? "");
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState(initialKakaoChannelUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl ?? "");
  // 주차 가능 여부 — 매장 위치처럼 손님이 찾아올 때 보는 정보라 여기에 (언제든 바꿀 수 있다)
  const [parking, setParking] = useState(initialParking ?? "");
  const [uploading, setUploading] = useState(false);
  // 바로가기 버튼 i 팁 — 메뉴판에서 버튼이 보이는 위치 예시 이미지
  const [showLinksInfo, setShowLinksInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<SaveButtonHandle>(null);
  const supabase = createClient();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const path = `logos/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("product_menu")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError("로고 업로드 실패: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product_menu").getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    setError(null);

    const [{ error: updateError }, { error: settingsError }] = await Promise.all([
      supabase.from("companies").update({ name }).eq("id", companyId),
      supabase.from("company_settings").update({
        logo_image: logoUrl,
        location_url: locationUrl || null,
        kakao_channel_url: kakaoChannelUrl || null,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        parking: parking || null,
      }).eq("company_id", companyId),
    ]);

    const combinedError = updateError || settingsError;
    if (combinedError) {
      setError(combinedError.message);
      return false;
    }
    notifyMenuChanged();
    onSettingsSaved?.({ location_url: locationUrl || null, kakao_channel_url: kakaoChannelUrl || null, instagram_url: instagramUrl || null, youtube_url: youtubeUrl || null, parking: parking || null, logo_image: logoUrl });
    onSave(name, logoUrl, locationUrl || null, kakaoChannelUrl || null, instagramUrl || null, youtubeUrl || null);
  };

  return (
    <>
    {/* 바로가기 버튼 표시 위치 예시 이미지 모달 */}
    {showLinksInfo && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLinksInfo(false)}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm md:max-w-lg flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">바로가기 버튼 표시 위치</h3>
            <button type="button" onClick={() => setShowLinksInfo(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-5 overflow-y-auto">
            <img src="/shortcut-buttons-tip.png" alt="바로가기 버튼 표시 위치 예시" className="w-full rounded-xl border border-gray-100" />
          </div>
        </div>
      </div>
    )}
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-gray-900">매장 정보</h2>
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); saveBtnRef.current?.trigger(); }} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            {/* 로고 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">로고 이미지</label>
              {logoUrl ? (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-gray-300 bg-white">
                  <Image src={logoUrl} alt="로고" fill className="object-contain p-2" />
                  <button
                    type="button"
                    onClick={() => { setLogoUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors text-gray-400 hover:text-gray-600"
                >
                  {uploading ? (
                    <span className="text-xs">업로드 중...</span>
                  ) : (
                    <><span className="text-3xl">+</span><span className="text-xs mt-1">로고 추가</span></>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>

            {/* 매장 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매장 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* URL (읽기 전용) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메뉴 URL</label>
              <div className="flex items-center gap-1 px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-sm text-gray-400">
                <span>사이트주소/</span>
                <span className="text-gray-900 font-medium">{slug}</span>
              </div>
            </div>

            {/* 바로가기 버튼 (매장 위치 · 카카오 채널 · 인스타그램 · 유튜브) — 한 카드에 줄로 나눠 묶는다.
                아이콘은 손님 메뉴판 푸터 버튼과 같은 색이라, 입력하면 메뉴판의 어떤 버튼이 되는지 바로 보인다 */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-medium text-gray-700">바로가기 버튼</h3>
                  <button type="button" onClick={() => setShowLinksInfo(true)} aria-label="바로가기 버튼 표시 위치 보기">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">URL을 입력한 항목만 메뉴판 홈 아래에 버튼으로 보여요.</p>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {/* 매장 위치 */}
              <div className="px-4 py-3.5 bg-white space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#56C0E0" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
                  </span>
                  매장 위치
                </label>
                <input
                  type="url"
                  value={locationUrl}
                  onChange={(e) => setNaverTalkUrl(e.target.value)}
                  placeholder="네이버 지도·카카오맵 링크 (https://naver.me/...)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                />
              </div>
              {/* 카카오 채널 */}
              <div className="px-4 py-3.5 bg-white space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FEE500" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#191919"><path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z" /></svg>
                  </span>
                  카카오 채널
                </label>
                <input
                  type="url"
                  value={kakaoChannelUrl}
                  onChange={(e) => setKakaoChannelUrl(e.target.value)}
                  placeholder="https://pf.kakao.com/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                />
              </div>
              {/* 인스타그램 */}
              <div className="px-4 py-3.5 bg-white space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </span>
                  인스타그램
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                />
              </div>
              {/* 유튜브 */}
              <div className="px-4 py-3.5 bg-white space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FF0000" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </span>
                  유튜브
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                />
              </div>
              </div>
            </div>

            {/* 주차 가능 여부 */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">주차 가능 여부</h3>
                <p className="text-xs text-gray-400 mt-0.5">손님이 매장에 찾아올 때 자주 묻는 정보예요.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["주차 가능", "잠시 주차 가능", "주차 불가"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setParking(parking === opt ? "" : opt)}
                    className={`px-3.5 py-2 rounded-lg border text-sm transition-colors ${
                      parking === opt ? "border-gold-500 bg-gold-500/10 text-gold-600 font-medium" : "border-gray-300 text-gray-600 bg-white hover:border-gray-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-0 pt-4 pb-1 flex items-center gap-3">
              <SaveButton
                ref={saveBtnRef}
                onSave={handleSave}
                disabled={uploading}
                className="text-sm font-medium text-white bg-gold-500 hover:bg-gold-600"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
