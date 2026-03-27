"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type SlugStatus = "idle" | "checking" | "available" | "taken";

export default function SetupForm() {
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("companies").select("id").eq("slug", slug).single();
      setSlugStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const handleNameChange = (value: string) => {
    setName(value);
    // 이름 입력 시 slug 자동 생성 (영문/숫자/하이픈)
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, "")
        .replace(/[\s]+/g, "-")
        .replace(/-+/g, "-")
        .trim()
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const path = `logos/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("product_menu")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError("로고 업로드 실패: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product_menu")
      .getPublicUrl(path);

    setLogoUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!slug) {
      setError("URL 슬러그를 입력해 주세요.");
      return;
    }

    if (slugStatus === "taken") {
      setError("이미 사용 중인 URL입니다. 다른 슬러그를 입력해 주세요.");
      return;
    }

    if (!/^010\d{8}$/.test(ownerPhone)) {
      setError("010으로 시작하는 11자리 숫자를 입력해주세요.");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { error: insertError } = await supabase
      .from("companies")
      .insert({ name, slug, logo_image: logoUrl, owner_id: user.id });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "이미 사용 중인 URL입니다. 다른 슬러그를 입력해 주세요."
          : insertError.message
      );
      setLoading(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ name: ownerName, phone_number: ownerPhone })
      .eq("user_id", user.id);

    router.push(`/${slug}/admin/dashboard`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 담당자 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            담당자 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="홍길동"
            className="w-full border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            휴대폰 번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={ownerPhone}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              if (d.length <= 11) setOwnerPhone(d);
            }}
            placeholder="01012345678"
            className="w-full border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
          />
        </div>
      </div>

      {/* 로고 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">로고 이미지</label>
        {logoUrl ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-beige-300">
            <Image src={logoUrl} alt="로고" fill className="object-contain p-2" />
            <button
              type="button"
              onClick={() => { setLogoUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-beige-300 flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 transition-colors text-beige-400 hover:text-gold-400"
          >
            {uploading ? <span className="text-xs">업로드 중...</span> : (
              <><span className="text-2xl">+</span><span className="text-xs mt-1">로고</span></>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      </div>

      {/* 회사 이름 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">
          회사 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
          placeholder="플로에이드"
        />
      </div>

      {/* URL 슬러그 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">
          가게 주소 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500 shrink-0">사이트주소/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
            placeholder="flo-aide"
          />
        </div>
        <div className="mt-1 h-4">
          {slugStatus === "checking" && <p className="text-xs text-gray-400">확인 중...</p>}
          {slugStatus === "available" && <p className="text-xs text-emerald-600">사용 가능한 URL입니다.</p>}
          {slugStatus === "taken" && <p className="text-xs text-red-500">이미 사용 중인 URL입니다.</p>}
          {slugStatus === "idle" && <p className="text-xs text-gray-400">영문 소문자, 숫자, 하이픈(-)만 사용 가능</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || uploading || slugStatus === "taken" || slugStatus === "checking"}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "저장 중..." : "시작하기"}
      </button>
    </form>
  );
}
