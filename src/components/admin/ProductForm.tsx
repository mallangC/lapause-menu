"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Product, ProductInput } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP, SEASONS, STORAGE_BUCKET } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
}

const DEFAULT_INPUT: ProductInput = {
  name: "",
  price: 0,
  image_url: null,
  product_type: "다발",
  flower_colors: [],
  wrapping_color: "밝은 계열",
  seasons: [],
  is_popular: false,
  is_recommended: false,
};

export default function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [data, setData] = useState<ProductInput>(
    initialData
      ? {
          name: initialData.name,
          price: initialData.price,
          image_url: initialData.image_url,
          product_type: initialData.product_type,
          flower_colors: initialData.flower_colors,
          wrapping_color: initialData.wrapping_color,
          seasons: initialData.seasons,
          is_popular: initialData.is_popular,
          is_recommended: initialData.is_recommended,
        }
      : DEFAULT_INPUT
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const toggleFlowerColor = (color: string) => {
    setData((prev) => ({
      ...prev,
      flower_colors: prev.flower_colors.includes(color)
        ? prev.flower_colors.filter((c) => c !== color)
        : [...prev.flower_colors, color],
    }));
  };

  const toggleSeason = (season: string) => {
    setData((prev) => ({
      ...prev,
      seasons: prev.seasons.includes(season) ? [] : [season],
    }));
  };

  const compressImage = (file: File, maxPx = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = w > h ? maxPx / w : maxPx / h;
        const width = scale < 1 ? Math.round(w * scale) : w;
        const height = scale < 1 ? Math.round(h * scale) : h;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("압축 실패"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    let uploadTarget: Blob;
    try {
      uploadTarget = await compressImage(file);
    } catch {
      setUploadError("이미지 압축에 실패했습니다. 다른 파일을 선택해 주세요.");
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const path = `${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, uploadTarget, { upsert: false, contentType: "image/jpeg" });

    if (error) {
      setUploadError("업로드 실패: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    setData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleRemoveImage = () => {
    setData((prev) => ({ ...prev, image_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          상품명 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm bg-beige-50 focus:outline-none focus:border-gold-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          가격 (원) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min={0}
          value={data.price === 0 ? "" : data.price}
          onChange={(e) => setData({ ...data, price: Number(e.target.value) || 0 })}
          placeholder="0"
          className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm bg-beige-50 focus:outline-none focus:border-gold-400"
        />
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          이미지
        </label>

        {data.image_url ? (
          <div className="relative w-64 h-64 rounded-lg overflow-hidden border border-beige-300">
            <Image
              src={data.image_url}
              alt="상품 이미지"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-64 h-64 rounded-lg border-2 border-dashed border-beige-300 flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 transition-colors text-beige-400 hover:text-gold-400"
          >
            {uploading ? (
              <span className="text-xs">업로드 중...</span>
            ) : (
              <>
                <span className="text-2xl mb-1">+</span>
                <span className="text-xs">이미지 선택</span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadError && (
          <p className="mt-1 text-xs text-red-500">{uploadError}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          상품 유형 <span className="text-red-500">*</span>
        </label>
        <select
          value={data.product_type}
          onChange={(e) =>
            setData({ ...data, product_type: e.target.value as ProductInput["product_type"] })
          }
          className="w-full border border-beige-300 rounded-lg px-3 py-2 text-sm bg-beige-50 focus:outline-none focus:border-gold-400"
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          꽃 색상
        </label>
        <div className="flex flex-wrap gap-2">
          {FLOWER_COLORS.map((color) => {
            const selected = data.flower_colors.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleFlowerColor(color)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-sm transition-all ${
                  selected
                    ? "border-gold-500 bg-gold-500 text-white font-medium scale-105 shadow-sm"
                    : "border-beige-200 bg-beige-50 text-foreground hover:border-beige-300"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: FLOWER_COLOR_MAP[color] ?? "#a8a29e" }}
                />
                {color}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          포장지 색상 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {WRAPPING_COLORS.map((wc) => (
            <button
              key={wc}
              type="button"
              onClick={() => setData({ ...data, wrapping_color: wc })}
              className={`flex-1 py-2 rounded-lg border-2 text-sm transition-all ${
                data.wrapping_color === wc
                  ? "border-gold-500 bg-gold-500 text-white font-medium shadow-sm"
                  : "border-beige-200 bg-beige-50 text-foreground hover:border-beige-300"
              }`}
            >
              {wc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          시즌
        </label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => toggleSeason(season)}
              className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                data.seasons.includes(season)
                  ? "border-gold-500 bg-gold-500 text-white font-medium shadow-sm"
                  : "border-beige-200 bg-beige-50 text-foreground hover:border-beige-300"
              }`}
            >
              {season}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          뱃지
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setData({ ...data, is_popular: !data.is_popular, is_recommended: false })
            }
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              data.is_popular
                ? "border-red-300 bg-red-300 text-white shadow-sm scale-[1.02]"
                : "border-beige-200 bg-beige-50 text-foreground hover:border-beige-300"
            }`}
          >
            인기 상품
          </button>
          <button
            type="button"
            onClick={() =>
              setData({ ...data, is_recommended: !data.is_recommended, is_popular: false })
            }
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              data.is_recommended
                ? "border-green-600 bg-green-600 text-white shadow-sm scale-[1.02]"
                : "border-beige-200 bg-beige-50 text-foreground hover:border-beige-300"
            }`}
          >
            추천 상품
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 bg-gold-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : initialData ? "수정" : "추가"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-beige-300 text-foreground py-2 rounded-lg text-sm hover:bg-beige-200 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
