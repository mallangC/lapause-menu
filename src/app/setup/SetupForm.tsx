"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function SetupForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

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

    router.push(`/${slug}/admin/dashboard`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 로고 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">로고 이미지</label>
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
        <label className="block text-sm font-medium text-foreground mb-1">
          회사 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
          placeholder="라포즈 플러르"
        />
      </div>

      {/* URL 슬러그 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          URL 슬러그 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-beige-400 shrink-0">사이트주소/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 border border-beige-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gold-400"
            placeholder="lapause-fleur"
          />
        </div>
        <p className="text-xs text-beige-400 mt-1">영문 소문자, 숫자, 하이픈(-)만 사용 가능</p>
      </div>

      <button
        type="submit"
        disabled={loading || uploading}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "저장 중..." : "시작하기"}
      </button>
    </form>
  );
}
