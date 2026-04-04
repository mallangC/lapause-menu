"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import DaumPostcodeEmbed from "react-daum-postcode";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, parsePhone } from "@/lib/format";

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
  const [phone, setPhone] = useState(formatPhone(initialPhone ?? ""));
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [showAddressDetail, setShowAddressDetail] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("notification_email, bank_name, bank_account, bank_holder, address, consult_enabled")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data?.notification_email) setNotificationEmail(data.notification_email);
        if (data?.phone) setPhone(formatPhone(data.phone));
        if (data?.address) setAddress(data.address);
        if (data?.bank_name) setBankName(data.bank_name);
        if (data?.bank_account) setBankAccount(data.bank_account);
        if (data?.bank_holder) setBankHolder(data.bank_holder);
        setConsultEnabled(data?.consult_enabled ?? false);
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
        phone: parsePhone(phone) || null,
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        bank_holder: bankHolder || null,
        address: address ? (addressDetail ? `${address} ${addressDetail}` : address) : null,
      })
      .eq("id", companyId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSave(name, logoUrl, locationUrl || null, kakaoChannelUrl || null, instagramUrl || null, youtubeUrl || null);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-medium text-gray-900 mb-6">매장 정보</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* 예약 알림 정보 */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-700">예약 알림 정보</h3>
            {consultEnabled && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">맞춤 주문 활성화 중 — 수정 불가</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">맞춤 주문 기능 활성화 및 카카오 알림톡 발송에 사용되는 정보입니다. <br/>5개 항목을 모두 입력해야 맞춤 주문을 활성화할 수 있습니다.</p>
          <div className={`space-y-3 ${consultEnabled ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">매장 전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                따로 매장 전화번호가 없다면 핸드폰번호를 다시 입력해주세요.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">매장 주소</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    readOnly
                    onClick={() => setShowPostcode(true)}
                    placeholder="주소 검색을 눌러주세요"
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPostcode(true)}
                    className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-gray-500 bg-white transition-colors whitespace-nowrap"
                  >
                    찾기
                  </button>
                </div>
                {showAddressDetail && (
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세주소 (동/호수 등)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                  />
                )}
                {showPostcode && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">주소 검색</span>
                      <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                    </div>
                    <DaumPostcodeEmbed
                      onComplete={(data) => {
                        setAddress(data.roadAddress || data.jibunAddress);
                        setAddressDetail("");
                        setShowPostcode(false);
                        setShowAddressDetail(true);
                      }}
                      style={{ height: 400 }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">은행</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 국민은행"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="예: 000-0000-0000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예금주</label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            계좌번호를 잘못 적어서 생기는 불이익은 책임지지 않습니다.
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

        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-0 pt-4 pb-1 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
          {success && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              저장되었습니다.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
