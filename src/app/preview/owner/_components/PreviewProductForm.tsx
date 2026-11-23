"use client";

import { useState, useRef, useEffect } from "react";
import { Product, ProductInput } from "@/types";
import { DEFAULT_INSTANT_MENU_NAME } from "@/lib/afterHours";
import ProductOptionsEditor from "@/components/admin/ProductOptionsEditor";
import { normalizeOptions, type ProductOptionGroup } from "@/lib/productOptions";
import ProductImagesEditor, { imageItemFromUrl, type ProductImageItem } from "@/components/admin/ProductImagesEditor";

type PreviewProductInput = ProductInput;
import { PRODUCT_TYPES, FLOWER_COLORS, WRAPPING_COLORS, FLOWER_COLOR_MAP, SEASONS, MOODS } from "@/lib/constants";

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
                    <span className={`w-3.5 h-3.5 rounded-full shrink-0 border ${colorMap[opt] === "#ffffff" ? "border-gray-300 shadow-sm" : "border-black/10"}`} style={{ backgroundColor: colorMap[opt] ?? "#a8a29e" }} />
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
  /** 복제 — initialData 를 채운 채로 새 상품으로 */
  duplicate?: boolean;
}

const DEFAULT_INPUT: PreviewProductInput = {
  name: "",
  description: "",
  price: 0,
  image_url: null,
  extra_images: [],
  product_type: "꽃다발",
  flower_colors: [],
  wrapping_color: "밝은 계열",
  seasons: [],
  instant: false,
  mood: null,
  is_popular: false,
  is_recommended: false,
  status: "active",
  stock_enabled: false,
  stock: null,
  bag_included: false,
  message_card_unavailable: false,
  preservative_unavailable: false,
};

// 미리보기 상품 추가·수정 — 실제 ProductForm 복사본. 사진은 업로드 대신 화면에서만 보여주고, 저장은 화면 목록에만 반영된다
export default function PreviewProductForm({ initialData, onSubmit, onCancel, duplicate = false }: ProductFormProps) {
  const [data, setData] = useState<PreviewProductInput>(
    initialData
      ? {
          name: duplicate ? `${initialData.name} (복사)` : initialData.name,
          description: initialData.description ?? "",
          price: initialData.price,
          image_url: initialData.image_url,
          extra_images: initialData.extra_images ?? [],
          product_type: initialData.product_type,
          flower_colors: initialData.flower_colors,
          wrapping_color: initialData.wrapping_color,
          seasons: initialData.seasons,
          instant: initialData.instant ?? false,
          mood: initialData.mood ?? null,
          is_popular: initialData.is_popular,
          is_recommended: initialData.is_recommended,
          status: initialData.status ?? "active",
          stock_enabled: initialData.stock_enabled ?? false,
          stock: initialData.stock ?? null,
          bag_included: initialData.bag_included ?? false,
          message_card_unavailable: initialData.message_card_unavailable ?? false,
          preservative_unavailable: initialData.preservative_unavailable ?? false,
        }
      : DEFAULT_INPUT
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  // 상품 옵션 (실제와 같게 — 화면 안에서만)
  const [options, setOptions] = useState<ProductOptionGroup[]>(() => normalizeOptions(initialData?.options));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  // 미리보기 — 매장이 직접 추가한 분류 없음 (기본 분류만)
  const customCategories: { category_type: string; name: string }[] = [];
  // 상품 사진 (최대 5장, 첫 번째가 대표) — 미리보기라 올리지 않고 화면에서만
  const [images, setImages] = useState<ProductImageItem[]>(() =>
    [initialData?.image_url, ...(initialData?.extra_images ?? [])].filter((u): u is string => !!u).map(imageItemFromUrl),
  );
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const colorFieldRef = useRef<HTMLDivElement>(null);

  const allProductTypes = [...new Set([
    // 지웠다가 같은 이름으로 다시 추가한 경우가 있어 이름이 겹치면 하나만
    ...PRODUCT_TYPES,
    ...customCategories.filter((c) => c.category_type === "product_type").map((c) => c.name),
  ])];
  const allSeasons = [...new Set([
    ...SEASONS,
    ...customCategories.filter((c) => c.category_type === "season").map((c) => c.name),
  ])];

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
      await onSubmit({ ...data, description: data.description?.trim() || null, image_url: images[0]?.preview ?? null, extra_images: images.slice(1).map((i) => i.preview), options: normalizeOptions(options) });
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
          {/* 이미지 업로드 */}
          <div>
            <label className={fieldLabelCls}>사진</label>

            <ProductImagesEditor items={images} onChange={setImages} compress={(f) => compressImage(f)} disabled={loading || uploading} />

            {uploadError && (
              <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>
            )}
          </div>
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
              <label className={fieldLabelCls}>상품 설명</label>
              <textarea
                value={data.description ?? ""}
                onChange={(e) => setData({ ...data, description: e.target.value.slice(0, 300) })}
                rows={3}
                maxLength={300}
                placeholder="예) 계절 꽃으로 풍성하게 만든 꽃다발이에요. 생일·기념일 선물로 좋아요."
                className={`${inputCls} resize-none`}
              />
              <p className="mt-0.5 text-right text-[11px] text-gray-400">{(data.description ?? "").length}/300</p>
            </div>
          </div>
        </div>
      </div>

      {/* 섹션: 판매 — 판매 방식·가격·재고·상태를 한곳에 (실제와 같게) */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>판매</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-3">
            {/* 판매 방식 — 주문 받고 만드는 상품 / 이미 만들어 둔 상품(현장 판매 메뉴). 시즌도 고르면 두 메뉴에 모두 나온다 */}
            <div>
              <label className={fieldLabelCls}>판매 방식</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: false, label: "주문 제작" },
                  { v: true, label: DEFAULT_INSTANT_MENU_NAME },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setData({ ...data, instant: o.v })}
                    className={`py-1.5 rounded-lg border text-sm font-medium transition-all truncate px-1 ${
                      !!data.instant === o.v
                        ? "border-gold-500 bg-gold-500 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
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
                  className={`${inputCls} text-right`}
                />
                <span className="text-sm text-gray-500 shrink-0">원</span>
              </div>
            </div>
          </div>
          {/* 재고 — 수량을 적으면 재고 관리(판매될 때마다 1개씩 줄고 0개면 품절), 비우면 제한 없음 */}
          <div>
            <label className={fieldLabelCls}>재고</label>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={data.stock_enabled ? String(data.stock ?? 0) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setData(raw === "" ? { ...data, stock_enabled: false, stock: null } : { ...data, stock_enabled: true, stock: Math.min(99999, Number(raw)) });
                }}
                placeholder="제한 없음"
                aria-label="재고 수량"
                className={`${inputCls} text-right`}
              />
              <span className="text-sm text-gray-500 shrink-0">개</span>
            </div>
          </div>
          <div>
            <label className={fieldLabelCls}>상태</label>
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {[
                { key: "active", label: "활성화" },
                { key: "inactive", label: "비활성화" },
                { key: "soldout", label: "품절" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setData({ ...data, status: key as PreviewProductInput["status"] })}
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

      {/* 섹션: 분류 */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>분류</p>
        </div>
        {/* 상품 유형 ~ 시즌 — 코치마크가 이 묶음을 설명한다 */}
        <div data-coach="pd-classify" className="px-5 py-4 space-y-4">
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

          <div ref={colorFieldRef} data-coach="pd-color">
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

          <div data-coach="pd-wrap">
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

          <div data-coach="pd-mood">
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

          {/* 시즌 */}
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
                    // 분위기 버튼과 같은 색 (선택: 진한 금색 / 기본: 흰 바탕 회색 글자)
                    className={`py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      selected
                        ? "border-gold-500 bg-gold-500 text-white"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
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

      {/* 섹션: 상품 옵션 — 손님이 고르는 추가 선택 (금액은 0원 이상) */}
      <div className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>상품 옵션</p>
        </div>
        <div className="px-5 py-4">
          <ProductOptionsEditor groups={options} onChange={setOptions} inputCls={inputCls} />
        </div>
      </div>

      {/* 섹션: 뱃지 & 옵션 */}
      <div data-coach="pd-options" className="bg-white">
        <div className={sectionHeaderCls}>
          <p className={sectionLabelCls}>기타 설정 (뱃지 · 추가 옵션)</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* 뱃지 — 코치마크가 이 줄만 설명한다 */}
          <div data-coach="pd-badge">
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
            <label className={fieldLabelCls}>추가 옵션 설정</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setData({ ...data, bag_included: !data.bag_included })}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                  data.bag_included
                    ? "border-gold-400 bg-gold-500/10 text-gold-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <span>쇼핑백 포함 (추가 불가)</span>
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
                    ? "border-gold-400 bg-gold-500/10 text-gold-600"
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
              <button
                type="button"
                onClick={() => setData({ ...data, preservative_unavailable: !data.preservative_unavailable })}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                  data.preservative_unavailable
                    ? "border-gold-400 bg-gold-500/10 text-gold-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <span>생화 수명연장제 추가 불가</span>
                <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold shrink-0 ${
                  data.preservative_unavailable ? "bg-gold-400 border-gold-400 text-white" : "border-gray-300"
                }`}>
                  {data.preservative_unavailable ? "✓" : ""}
                </span>
              </button>
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
            {loading ? "저장 중..." : initialData && !duplicate ? "수정 완료" : "상품 추가"}
          </button>
        </div>
      </div>
    </form>
  );
}
