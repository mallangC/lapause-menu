"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Product, ProductInput } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP, SEASONS, STORAGE_BUCKET, BADGE_COLORS, MOODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface FormSelectProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function FormSelect({ value, options, onChange, placeholder }: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-gray-400 transition-colors focus:outline-none"
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected?.label ?? placeholder ?? "선택"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                opt.value === value
                  ? "bg-gold-500/10 text-gold-600 font-medium"
                  : "text-gray-700 hover:bg-beige-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  mood: null,
  is_popular: false,
  is_recommended: false,
  status: "active",
};

export default function ProductForm({ initialData, onSubmit }: ProductFormProps) {
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
          mood: initialData.mood ?? null,
          is_popular: initialData.is_popular,
          is_recommended: initialData.is_recommended,
          status: initialData.status ?? "active",
        }
      : DEFAULT_INPUT
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
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
    const missing: string[] = [];
    if (!data.name) missing.push("상품명");
    if (!data.image_url) missing.push("이미지");
    if (data.flower_colors.length === 0) missing.push("꽃 색상");
    if (missing.length > 0) {
      setFieldErrors(missing);
      return;
    }
    setFieldErrors([]);
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상품 가격
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={data.price === 0 ? "" : data.price.toLocaleString()}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (/^\d*$/.test(raw)) setData({ ...data, price: Number(raw) || 0 });
              }}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-500"
            />
            <span className="text-sm text-gray-500 shrink-0">원</span>
          </div>
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          이미지 <span className="text-red-500">*</span>
        </label>

        {data.image_url ? (
          <div className="relative w-64 h-64 rounded-lg overflow-hidden border border-gray-300">
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
            className="w-64 h-64 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors text-gray-400 hover:text-gray-600"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상품 유형 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRODUCT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setData({ ...data, product_type: t })}
              className={`py-1.5 rounded-lg border text-sm transition-colors ${
                data.product_type === t
                  ? "border-gold-400 bg-gold-400 text-white font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">뱃지</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setData({ ...data, is_popular: !data.is_popular, is_recommended: false })}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              data.is_popular ? "text-white shadow-sm scale-[1.02]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
            style={data.is_popular ? { backgroundColor: BADGE_COLORS.popular.bg, borderColor: BADGE_COLORS.popular.bg } : undefined}
          >
            인기 상품
          </button>
          <button
            type="button"
            onClick={() => setData({ ...data, is_recommended: !data.is_recommended, is_popular: false })}
            className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
              data.is_recommended ? "text-white shadow-sm scale-[1.02]" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
            style={data.is_recommended ? { backgroundColor: BADGE_COLORS.recommended.bg, borderColor: BADGE_COLORS.recommended.bg } : undefined}
          >
            추천 상품
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          꽃 색상 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FLOWER_COLORS.map((color) => {
            const selected = data.flower_colors.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleFlowerColor(color)}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border-2 text-sm transition-all ${
                  selected
                    ? "border-gold-500 bg-gold-500 text-white font-medium"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          포장지 색상 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {WRAPPING_COLORS.map((wc) => (
            <button
              key={wc}
              type="button"
              onClick={() => setData({ ...data, wrapping_color: wc })}
              className={`py-1.5 rounded-lg border text-sm transition-colors ${
                data.wrapping_color === wc
                  ? "border-gold-400 bg-gold-400 text-white font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-500"
              }`}
            >
              {wc}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">분위기</label>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setData({ ...data, mood: data.mood === m ? null : m })}
              className={`px-3 py-1.5 rounded-xl text-sm border-2 font-medium transition-all ${
                data.mood === m
                  ? "border-gold-500 bg-gold-500 text-white"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">시즌</label>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map((s) => {
            const selected = data.seasons[0] === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setData({ ...data, seasons: selected ? [] : [s] })}
                className={`py-1.5 rounded-lg border text-sm transition-colors ${
                  selected
                    ? "border-gold-400 bg-gold-400 text-white font-medium"
                    : "border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-500"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
        <FormSelect
          value={data.status}
          options={[
            { value: "active", label: "활성" },
            { value: "inactive", label: "비활성" },
            { value: "soldout", label: "품절" },
          ]}
          onChange={(v) => setData({ ...data, status: v as ProductInput["status"] })}
        />
      </div>

      <div className="pt-6 border-t border-gray-300 space-y-3">
        {fieldErrors.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs font-medium text-red-600 mb-1">아래 항목을 입력해주세요.</p>
            <ul className="list-disc list-inside space-y-0.5">
              {fieldErrors.map((f) => (
                <li key={f} className="text-xs text-red-500">{f}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full bg-gold-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : initialData ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}
