"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/constants";

type ImageKey = "home_featured_image" | "home_all_image" | "home_season_image" | "home_consult_image";

interface ImageCardProps {
  companyId: string;
  imageKey: ImageKey;
  label: string;
  current: string | null;
  onChange: (key: ImageKey, url: string | null) => void;
}

function ImageCard({ companyId, imageKey, label, current, onChange }: ImageCardProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (file: File) => {
    setUploading(true);
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; });
    const scale = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));

    const path = `home/${companyId}/${imageKey}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { upsert: false, contentType: "image/jpeg" });

    if (uploadError) { setUploading(false); return; }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("company_settings")
      .update({ [imageKey]: urlData.publicUrl })
      .eq("company_id", companyId);

    if (!updateError) onChange(imageKey, urlData.publicUrl);
    setUploading(false);
  };

  const handleRemove = async () => {
    const { error } = await supabase
      .from("company_settings")
      .update({ [imageKey]: null })
      .eq("company_id", companyId);
    if (!error) onChange(imageKey, null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {current ? (
        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden border border-gray-300">
          <Image src={current} alt={label} fill className="object-cover" />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-4/3 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors text-gray-400 hover:text-gray-600"
        >
          {uploading ? <span className="text-xs">업로드 중...</span> : <span className="text-sm">+ 이미지 추가</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
      {current && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full text-xs py-1.5 border border-gray-300 rounded-lg text-gray-500 hover:border-gray-500 transition-colors"
        >
          {uploading ? "업로드 중..." : "이미지 교체"}
        </button>
      )}
    </div>
  );
}

interface Props {
  companyId: string;
  initialFeaturedImage: string | null;
  initialAllImage: string | null;
  initialSeasonImage: string | null;
  initialConsultImage: string | null;
  consultEnabled: boolean;
}

export default function HomeTab({ companyId, initialFeaturedImage, initialAllImage, initialSeasonImage, initialConsultImage, consultEnabled }: Props) {
  const [images, setImages] = useState<Record<ImageKey, string | null>>({
    home_featured_image: initialFeaturedImage,
    home_all_image: initialAllImage,
    home_season_image: initialSeasonImage,
    home_consult_image: initialConsultImage,
  });

  const handleChange = (key: ImageKey, url: string | null) => {
    setImages((prev) => ({ ...prev, [key]: url }));
  };

  const sections: { key: ImageKey; label: string }[] = [
    { key: "home_featured_image", label: "추천/인기 버튼" },
    { key: "home_all_image", label: "모든 상품 버튼" },
    { key: "home_season_image", label: "시즌 버튼" },
    ...(consultEnabled ? [{ key: "home_consult_image" as ImageKey, label: "맞춤 주문하기 버튼" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">홈 화면 이미지</h2>
        <p className="text-sm text-gray-400 mt-1">첫 화면 버튼에 표시될 이미지를 업로드하세요. 이미지가 없으면 텍스트만 표시됩니다.</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {sections.map(({ key, label }) => (
          <ImageCard
            key={key}
            companyId={companyId}
            imageKey={key}
            label={label}
            current={images[key]}
            onChange={handleChange}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 -mt-4">이미지를 업로드하면 별도 저장 없이 바로 반영됩니다.</p>
    </div>
  );
}
