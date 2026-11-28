"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { resizeToWebp } from "@/lib/imageThumb";
import { RESERVED_SLUGS } from "@/lib/constants";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "reserved";

interface Props {
  initialOwnerName?: string;
  initialOwnerPhone?: string;
  initialCompanyName?: string;
  initialSlug?: string;
  initialLogoUrl?: string | null;
}

export default function SetupForm({ initialOwnerName = "", initialOwnerPhone = "", initialCompanyName = "", initialSlug = "", initialLogoUrl = null }: Props) {
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [ownerPhone, setOwnerPhone] = useState(initialOwnerPhone);
  const [name, setName] = useState(initialCompanyName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>(initialSlug ? "available" : "idle");
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!slug) { setSlugStatus("idle"); return; }
    // 기존 slug와 동일하면 체크 불필요
    if (slug === initialSlug) { setSlugStatus("available"); return; }
    if (RESERVED_SLUGS.has(slug)) { setSlugStatus("reserved"); return; }
    setSlugStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("companies").select("id").eq("slug", slug).single();
      setSlugStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const formatPhone = (digits: string) => {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleNameChange = (value: string) => {
    setName(value);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // 로고는 작게 보이므로 긴 변 512px WebP로 줄여서 저장 (투명 배경 유지, 사진은 Supabase에서 바로 받는다)
    let upload: Blob = file;
    try {
      upload = await resizeToWebp(file, 512, 0.9);
    } catch {
      /* 줄이지 못하면 원본 그대로 */
    }
    const ext = upload === file ? file.name.split(".").pop() : "webp";
    const path = `logos/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product_menu")
      .upload(path, upload, { upsert: false, contentType: upload === file ? file.type : "image/webp" });

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

    if (slugStatus === "reserved") {
      setError("사이트에서 쓰는 주소라 사용할 수 없습니다. 다른 슬러그를 입력해 주세요.");
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

    // 매장 이름·주소·로고 저장 + 카드 없는 무료 체험 시작 — 체험 전에는 DB가 사장님 키로 매장 수정을 막아 서버에서 처리한다
    // (무료 체험은 한 번도 체험하지 않은 매장만 시작되고, 이미 체험·구독했으면 서버가 그냥 넘어간다)
    const companyRes = await fetch("/api/setup/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, logoUrl }),
    }).catch(() => null);
    const companyData = (await companyRes?.json().catch(() => null)) as { error?: string; wasPending?: boolean } | null;
    if (!companyRes?.ok) {
      setError(companyData?.error ?? "매장 정보를 저장하지 못했어요. 다시 시도해 주세요.");
      setLoading(false);
      return;
    }
    const wasPending = !!companyData?.wasPending;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, email: user.email, name: ownerName, phone_number: ownerPhone, role: "admin" }, { onConflict: "user_id" });

    if (profileError) {
      setError("프로필 저장에 실패했습니다: " + profileError.message);
      setLoading(false);
      return;
    }

    // 처음 설정이면 온보딩으로, 이미 설정돼 있던 매장이면 대시보드로
    router.push(wasPending ? `/${slug}/admin/onboarding` : `/${slug}/admin/dashboard`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
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
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="홍길동"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            휴대폰 번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formatPhone(ownerPhone)}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              if (d.length <= 11) setOwnerPhone(d);
            }}
            placeholder="010-0000-0000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      {/* 로고 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-2">로고 이미지</label>
        {logoUrl ? (
          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-300">
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
            className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-500"
          >
            {uploading ? <span className="text-xs">업로드 중...</span> : (
              <><span className="text-2xl">+</span><span className="text-xs mt-1">로고</span></>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
      </div>

      {/* 매장 이름 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">
          매장 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          placeholder="플로에이드"
        />
      </div>

      {/* URL 슬러그 */}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1">
          매장 주소 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500 shrink-0">사이트주소/</span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
            placeholder="flo-aide"
          />
        </div>
        <div className="mt-1 h-4">
          {slugStatus === "checking" && <p className="text-xs text-gray-400">확인 중...</p>}
          {slugStatus === "available" && <p className="text-xs text-emerald-600">사용 가능한 URL입니다.</p>}
          {slugStatus === "taken" && <p className="text-xs text-red-500">이미 사용 중인 URL입니다.</p>}
          {slugStatus === "reserved" && <p className="text-xs text-red-500">사이트에서 쓰는 주소라 사용할 수 없습니다.</p>}
          {slugStatus === "idle" && <p className="text-xs text-gray-400">영문 소문자, 숫자, 하이픈(-)만 사용 가능</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || uploading || slugStatus === "taken" || slugStatus === "reserved" || slugStatus === "checking"}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "저장 중..." : "시작하기"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </form>
  );
}
