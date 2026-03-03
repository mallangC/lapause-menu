"use client";

import { useState } from "react";
import { Product, ProductInput } from "@/types";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";

interface DashboardClientProps {
  initialProducts: Product[];
}

export default function DashboardClient({ initialProducts }: DashboardClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleAdd = async (data: ProductInput) => {
    setError(null);
    const { data: newProduct, error: err } = await supabase
      .from("product_menus")
      .insert(data)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return;
    }
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

    if (err) {
      setError(err.message);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? (updated as Product) : p))
    );
    setEditingProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setError(null);
    const { error: err } = await supabase.from("product_menus").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen bg-beige-100">
      <header className="border-b border-beige-200 bg-beige-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-medium text-gold-500">
            Lapause Fleur — 관리자
          </h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-beige-400 hover:text-gold-500 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* 추가 폼 */}
        {showForm && (
          <div className="mb-6 bg-beige-50 border border-beige-200 rounded-xl p-6">
            <h3 className="font-medium text-foreground mb-4">새 상품 추가</h3>
            <ProductForm
              onSubmit={handleAdd}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* 수정 폼 */}
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
            onEdit={(product) => {
              setEditingProduct(product);
              setShowForm(false);
            }}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
