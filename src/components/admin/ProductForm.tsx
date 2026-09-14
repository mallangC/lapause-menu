"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Product, ProductInput } from "@/types";
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP, SEASONS, STORAGE_BUCKET, MOODS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

function SelectDropdown({ value, options, onChange, placeholder }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors bg-white ${open ? "border-gray-400" : "border-gray-200 hover:border-gray-300"}`}
      >
        <span className={value ? "text-gray-800" : "text-gray-300"}>{value || placeholder || "선택"}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                value === opt ? "bg-beige-50 text-gold-600 font-medium" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt}
              {value === opt && (
                <svg className="w-4 h-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectDropdown({ value, options, onToggle, placeholder, colorMap, error }: {
  value: string[];
  options: string[];
  onToggle: (opt: string) => void;
  placeholder?: string;
  colorMap?: Record<string, string>;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors bg-white ${
          error ? "border-red-400" : open ? "border-gray-400" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className={`truncate text-left ${value.length ? "text-gray-800" : "text-gray-300"}`}>
          {value.length ? value.join(", ") : (placeholder || "선택")}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {options.map((opt) => {
            const selected = value.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                  selected ? "bg-beige-50 text-gold-600 font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  {colorMap && (
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: colorMap[opt] ?? "#a8a29e" }} />
                  )}
                  {opt}
                </span>
                {selected && (
                  <svg className="w-4 h-4 text-gold-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
  companyId: string;
}

const DEFAULT_INPUT: ProductInput = {
  name: "",
  price: 0,
  image_url: null,
  product_type: "꽃다발",
  flower_colors: [],
  wrapping_color: "밝은 계열",
  seasons: [],
  mood: null,
  is_popular: false,
  is_recommended: false,
  status: "active",
  bag_included: false,
  message_card_unavailable: false,
};

export default function ProductForm({ initialData, onSubmit, onCancel, companyId }: ProductFormProps) {
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
          bag_included: initialData.bag_included ?? false,
          message_card_unavailable: initialData.message_card_unavailable ?? false,
        }
      : DEFAULT_INPUT
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<{ category_type: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const colorFieldRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("company_categories")
      .select("category_type, name")
      .eq("company_id", companyId)
      .eq("hidden", false)
      .then(({ data }) => { if (data) setCustomCategories(data); });
  }, [companyId]);

  const allProductTypes = [
    ...PRODUCT_TYPES,
    ...customCategories.filter((c) => c.category_type === "product_type").map((c) => c.name),
  ];
  const allSeasons = [
    ...SEASONS,
    ...customCategories.filter((c) => c.category_type === "season").map((c) => c.name),
  ];

  const toggleFlowerColor = (color: string) => {
    setData((prev) => ({
      ...prev,
      flower_colors: prev.flower_colors.includes(color)
        ? prev.flower_colors.filter((c) => c !== color)
        : [...prev.flower_colors, color],
    }));
  };

  const compressImage = (file: File, maxPx = 1200, quality = 0.9): Promise<Blob> => {
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
          "image/webp",
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

    const path = `${Date.now()}.webp`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, uploadTarget, { upsert: false, contentType: "image/webp" });

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
    if (data.flower_colors.length === 0) missing.push("색상");
    if (missing.length > 0) {
      setFieldErrors(missing);
      const firstRef = !data.name ? nameFieldRef : colorFieldRef;
      firstRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white placeholder:text-gray-300";
  const sectionHeaderCls = "px-5 pt-4 pb-3 border-b border-gray-100";
  const sectionLabelCls = "text-xs font-medium text-gray-400 uppercase tracking-wider";
  const fieldLabelCls = "block text-xs text-gray-500 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">

      {/* 섹션: 기본 정보 */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>기본 정보</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-3">
            <div ref={nameFieldRef}>
              <label className={fieldErrors.includes("상품명") ? "block text-xs text-red-500 mb-1" : fieldLabelCls}>
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => {
                  setData({ ...data, name: e.target.value });
                  if (fieldErrors.includes("상품명")) setFieldErrors((prev) => prev.filter((f) => f !== "상품명"));
                }}
                className={fieldErrors.includes("상품명") ? `${inputCls} border-red-400 focus:border-red-500` : inputCls}
              />
            </div>
            <div>
              <label className={fieldLabelCls}>상품 가격</label>
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
                  className={inputCls}
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div>
            <label className={fieldLabelCls}>이미지</label>

            {data.image_url ? (
              <div className="relative w-24 h-24">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                  <Image
                    src={data.image_url}
                    alt="상품 이미지"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-gray-900 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors text-gray-400 hover:text-gray-600"
              >
                {uploading ? (
                  <span className="text-xs">업로드 중...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-xs">추가</span>
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
              <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      {/* 섹션: 분류 */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>분류</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={fieldLabelCls}>
              상품 유형 <span className="text-red-500">*</span>
            </label>
            <SelectDropdown
              value={data.product_type}
              options={allProductTypes}
              onChange={(v) => setData({ ...data, product_type: v })}
              placeholder="유형 선택"
            />
          </div>

          <div ref={colorFieldRef}>
            <label className={fieldErrors.includes("색상") ? "block text-xs text-red-500 mb-1" : fieldLabelCls}>
              색상 <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(다중 선택 가능)</span>
            </label>
            <MultiSelectDropdown
              value={data.flower_colors}
              options={[...FLOWER_COLORS]}
              onToggle={(color) => {
                toggleFlowerColor(color);
                if (fieldErrors.includes("색상")) setFieldErrors((prev) => prev.filter((f) => f !== "색상"));
              }}
              placeholder="색상 선택"
              colorMap={FLOWER_COLOR_MAP}
              error={fieldErrors.includes("색상")}
            />
          </div>

          <div>
            <label className={fieldLabelCls}>포장지 색상</label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {WRAPPING_COLORS.map((wc) => (
                <button
                  key={wc}
                  type="button"
                  onClick={() => setData({ ...data, wrapping_color: data.wrapping_color === wc ? null : wc })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    data.wrapping_color === wc
                      ? "bg-gold-500 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-500"
                  }`}
                >
                  {wc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={fieldLabelCls}>분위기</label>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setData({ ...data, mood: data.mood === m ? null : m })}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
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
            <label className={fieldLabelCls}>시즌</label>
            <div className="grid grid-cols-3 gap-2">
              {allSeasons.map((s) => {
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
        </div>
      </div>

      {/* 섹션: 뱃지 & 옵션 */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>뱃지 & 옵션</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={fieldLabelCls}>뱃지</label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { key: "none", label: "없음" },
                { key: "popular", label: "인기 상품" },
                { key: "recommended", label: "추천 상품" },
              ].map(({ key, label }) => {
                const active = key === "popular" ? data.is_popular : key === "recommended" ? data.is_recommended : (!data.is_popular && !data.is_recommended);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setData({ ...data, is_popular: key === "popular", is_recommended: key === "recommended" })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-gold-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={fieldLabelCls}>맞춤 주문 옵션</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setData({ ...data, bag_included: !data.bag_included })}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                  data.bag_included
                    ? "border-gold-400 bg-gold-50 text-gold-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <span>쇼핑백 포함 (추가 선택 불가)</span>
                <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold shrink-0 ${
                  data.bag_included ? "bg-gold-400 border-gold-400 text-white" : "border-gray-300"
                }`}>
                  {data.bag_included ? "✓" : ""}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setData({ ...data, message_card_unavailable: !data.message_card_unavailable })}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                  data.message_card_unavailable
                    ? "border-gold-400 bg-gold-50 text-gold-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <span>메시지카드 추가 불가</span>
                <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold shrink-0 ${
                  data.message_card_unavailable ? "bg-gold-400 border-gold-400 text-white" : "border-gray-300"
                }`}>
                  {data.message_card_unavailable ? "✓" : ""}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className={fieldLabelCls}>상태</label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { key: "active", label: "활성" },
                { key: "inactive", label: "비활성" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setData({ ...data, status: key as ProductInput["status"] })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    data.status === key ? "bg-gold-500 text-white shadow-sm" : "text-gray-400 hover:text-gray-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-white px-5 py-4 space-y-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-400 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "저장 중..." : initialData ? "수정 완료" : "상품 추가"}
          </button>
        </div>
      </div>
    </form>
  );
}
