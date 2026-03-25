"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

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
  onSave: (name: string, logo: string | null, locationUrl: string | null, kakaoChannelUrl: string | null, instagramUrl: string | null, youtubeUrl: string | null) => void;
}

export default function CompanyInfoTab({ companyId, initialName, initialLogo, slug, initialNaverTalkUrl, initialKakaoChannelUrl, initialInstagramUrl, initialYoutubeUrl, initialPhone, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [locationUrl, setNaverTalkUrl] = useState(initialNaverTalkUrl ?? "");
  const [kakaoChannelUrl, setKakaoChannelUrl] = useState(initialKakaoChannelUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("notification_email")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data?.notification_email) setNotificationEmail(data.notification_email);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

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
        location_url: locationUrl || null,
        kakao_channel_url: kakaoChannelUrl || null,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        notification_email: notificationEmail || null,
        phone: phone || null,
      })
      .eq("id", companyId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      onSave(name, logoUrl, locationUrl || null, kakaoChannelUrl || null, instagramUrl || null, youtubeUrl || null);
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

        {/* 매장 전화번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">매장 전화번호</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="01012345678"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            매장 전화번호를 입력하지 않으면 고객에게 알림을 보낼 때 <span className="text-gray-500">내 정보</span>의 전화번호가 대신 사용됩니다.
          </p>
        </div>

        {/* 매장 위치 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">매장 위치 URL</label>
          <p className="text-xs text-gray-400 mb-1.5">네이버 지도, 카카오맵 등 지도 링크를 입력하세요.</p>
          <input
            type="url"
            value={locationUrl}
            onChange={(e) => setNaverTalkUrl(e.target.value)}
            placeholder="https://naver.me/... 또는 https://place.map.kakao.com/..."
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

        {/* 인스타그램 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">인스타그램 URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* 유튜브 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/@..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            URL을 입력한 항목만 홈 화면에 버튼으로 노출됩니다.
          </p>
        </div>

        {/* 예약 알림 이메일 */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예약 알림 이메일</label>
          <input
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="예약 접수 시 알림을 받을 이메일"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
          <p className="text-xs text-gray-400 mt-2">
            기본적으로 로그인 계정 이메일로 발송됩니다. 다른 이메일로 받고 싶을 때만 입력하세요.
          </p>
        </div> */}

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
