"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product, ProductInput, ProductStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { generateThemeVars } from "@/lib/theme";
import ProductForm from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";
import CompanyInfoTab from "./CompanyInfoTab";
import SettingsTab from "./SettingsTab";
import HomeTab from "./HomeTab";

type Tab = "products" | "company" | "home" | "settings";

interface Props {
  slug: string;
  companyId: string;
  companyName: string;
  logoImage: string | null;
  themeBg: string;
  themeAccent: string;
  initialProducts: Product[];
  homeFeaturedImage: string | null;
  homeAllImage: string | null;
  homeSeasonImage: string | null;
  naverTalkUrl: string | null;
  kakaoChannelUrl: string | null;
}

export default function DashboardClient({ slug, companyId, companyName, logoImage, themeBg, themeAccent, initialProducts, homeFeaturedImage, homeAllImage, homeSeasonImage, naverTalkUrl, kakaoChannelUrl }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeVars, setThemeVars] = useState(generateThemeVars(themeBg, themeAccent));
  const supabase = createClient();

  useEffect(() => {
    document.body.style.overflow = (showForm || !!editingProduct) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, editingProduct]);

  const handleAdd = async (data: ProductInput) => {
    setError(null);
    const { data: newProduct, error: err } = await supabase
      .from("product_menus")
      .insert({ ...data, company_id: companyId })
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setProducts((prev) => [...prev, newProduct as Product]);
    setShowForm(false);
  };

  const handleEdit = async (data: ProductInput) => {
    if (!editingProduct) return;
    setError(null);
    const { data: updated, error: err } = await supabase
      .from("product_menus")
      .update(data)
      .eq("id", editingProduct.id)
      .select()
      .single();
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? (updated as Product) : p)));
    setEditingProduct(null);
  };

  const handleStatusChange = async (id: string, status: ProductStatus) => {
    const { error: err } = await supabase.from("product_menus").update({ status }).eq("id", id);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setError(null);
    const { error: err } = await supabase.from("product_menus").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "products", label: "상품 관리" },
    { key: "home", label: "홈 화면" },
    { key: "company", label: "회사 정보" },
    { key: "settings", label: "설정" },
  ];

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col" style={themeVars as React.CSSProperties}>
      <header className="border-b border-gray-200 bg-white shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${slug}`} className="text-lg font-medium text-gray-900 hover:text-gray-600 transition-colors">
            {companyName} — 관리자
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      {/* 모바일 탭 내비게이션 */}
      <div className="md:hidden border-b border-gray-100 bg-white">
        <div className="flex justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-gold-500 text-gold-500" : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl w-full mx-auto px-4 py-6 gap-6">
        {/* 데스크탑 사이드 탭 */}
        <nav className="hidden md:block w-44 shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  onClick={() => { setActiveTab(tab.key); setShowForm(false); setEditingProduct(null); setError(null); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key ? "bg-gold-500 text-white font-medium" : "text-gray-700 hover:bg-gold-500/50"
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
            <li>
              <Link
                href="/notice"
                target="_blank"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                사용법
                <span className="text-sm font-semibold">→</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* 상품 추가/수정 모달 */}
        {(showForm || editingProduct) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingProduct(null); } }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">{editingProduct ? "상품 수정" : "새 상품 추가"}</h3>
                <button
                  onClick={() => { setShowForm(false); setEditingProduct(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                {editingProduct
                  ? <ProductForm initialData={editingProduct} onSubmit={handleEdit} onCancel={() => setEditingProduct(null)} />
                  : <ProductForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
                }
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {activeTab === "products" && (
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900">상품 목록 ({products.length}개)</h2>
                <button onClick={() => setShowForm(true)} className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors">
                  + 상품 추가
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <ProductTable
                  products={products}
                  onEdit={(product) => { setEditingProduct(product); setShowForm(false); }}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>
          )}

          {activeTab === "company" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <CompanyInfoTab companyId={companyId} initialName={companyName} initialLogo={logoImage} slug={slug} initialNaverTalkUrl={naverTalkUrl} initialKakaoChannelUrl={kakaoChannelUrl} />
            </div>
          )}

          {activeTab === "home" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <HomeTab
                companyId={companyId}
                initialFeaturedImage={homeFeaturedImage}
                initialAllImage={homeAllImage}
                initialSeasonImage={homeSeasonImage}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <SettingsTab
                companyId={companyId}
                initialBg={themeBg}
                initialAccent={themeAccent}
                onThemeChange={(bg, accent) => setThemeVars(generateThemeVars(bg, accent))}
                onSignOut={handleSignOut}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
