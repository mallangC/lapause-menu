"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface Props {
  companyId: string;
  initialName: string;
  initialLogo: string | null;
  slug: string;
  initialNaverTalkUrl: string | null;
  initialKakaoChannelUrl: string | null;
}

export default function CompanyInfoTab({ companyId, initialName, initialLogo, slug, initialNaverTalkUrl, initialKakaoChannelUrl }: Props) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [naverTalkUrl, setNaverTalkUrl] = useState(initialNaverTalkUrl ?? "");
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState(initialKakaoChannelUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        name,
        logo_image: logoUrl,
        naver_talk_url: naverTalkUrl || null,
        kakao_channel_url: kakaoChannelUrl || null,
      })
      .eq("id", companyId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-medium text-gray-900 mb-6">회사 정보</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">저장되었습니다.</div>
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

        {/* 회사 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            회사 이름 <span className="text-red-500">*</span>
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

        {/* 네이버 톡톡 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">네이버 예약 URL</label>
          <input
            type="url"
            value={naverTalkUrl}
            onChange={(e) => setNaverTalkUrl(e.target.value)}
            placeholder="https://naver.me/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* 카카오 채널 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카카오 채널 URL</label>
          <input
            type="url"
            value={kakaoChannelUrl}
            onChange={(e) => setKakaoChannelUrl(e.target.value)}
            placeholder="https://pf.kakao.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
