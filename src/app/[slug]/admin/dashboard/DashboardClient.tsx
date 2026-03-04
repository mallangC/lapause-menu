"use client";

import { useState } from "react";
import { Product, ProductInput } from "@/types";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";
import CompanyInfoTab from "./CompanyInfoTab";

type Tab = "products" | "company" | "settings";

interface Props {
  slug: string;
  companyId: string;
  companyName: string;
  logoImage: string | null;
  initialProducts: Product[];
}

export default function DashboardClient({ slug, companyId, companyName, logoImage, initialProducts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

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
    { key: "company", label: "회사 정보" },
    { key: "settings", label: "설정" },
  ];

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col">
      {/* 헤더 */}
      <header className="border-b border-beige-200 bg-beige-50 shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gold-500">{companyName} — 관리자</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-beige-400 hover:text-gold-500 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl w-full mx-auto px-4 py-6 gap-6">
        {/* 좌측 탭 메뉴 */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <button
                  onClick={() => {
                    setActiveTab(tab.key);
                    setShowForm(false);
                    setEditingProduct(null);
                    setError(null);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-gold-400 text-white font-medium"
                      : "text-foreground hover:bg-beige-200"
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 우측 콘텐츠 */}
        <main className="flex-1 min-w-0">
          {/* 상품 관리 탭 */}
          {activeTab === "products" && (
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-foreground">
                  상품 목록 ({products.length}개)
                </h2>
                {!showForm && !editingProduct && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors"
                  >
                    + 상품 추가
                  </button>
                )}
              </div>

              {showForm && (
                <div className="mb-6 bg-beige-50 border border-beige-200 rounded-xl p-6">
                  <h3 className="font-medium text-foreground mb-4">새 상품 추가</h3>
                  <ProductForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
                </div>
              )}

              {editingProduct && (
                <div className="mb-6 bg-beige-50 border border-beige-200 rounded-xl p-6">
                  <h3 className="font-medium text-foreground mb-4">상품 수정</h3>
                  <ProductForm
                    initialData={editingProduct}
                    onSubmit={handleEdit}
                    onCancel={() => setEditingProduct(null)}
                  />
                </div>
              )}

              <div className="bg-beige-50 border border-beige-200 rounded-xl p-6">
                <ProductTable
                  products={products}
                  onEdit={(product) => { setEditingProduct(product); setShowForm(false); }}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          )}

          {/* 회사 정보 탭 */}
          {activeTab === "company" && (
            <div className="bg-beige-50 border border-beige-200 rounded-xl p-6">
              <CompanyInfoTab
                companyId={companyId}
                initialName={companyName}
                initialLogo={logoImage}
                slug={slug}
              />
            </div>
          )}

          {/* 설정 탭 */}
          {activeTab === "settings" && (
            <div className="bg-beige-50 border border-beige-200 rounded-xl p-6">
              <h2 className="text-xl font-medium text-foreground mb-6">설정</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-beige-400 mb-3">계정 관리</p>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
