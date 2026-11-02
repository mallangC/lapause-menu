"use client";

import { useEffect, useState } from "react";
import type { Product, ProductInput, ProductStatus } from "@/types";
import PreviewProductTable from "./PreviewProductTable";
import PreviewProductForm from "./PreviewProductForm";
import { PD_FORM_EVENT } from "../ProductsCoach";

interface Props {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onNotice: (message: string) => void;
}

// 미리보기 상품 관리 — 실제 DashboardClient의 상품 관리 영역 복사본. 추가·수정·노출·삭제는 화면 목록에만 반영된다 (DB 없음)
export default function PreviewProductsTab({ products, setProducts, onNotice }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    document.body.style.overflow = (showForm || !!editingProduct) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showForm, editingProduct]);

  // 코치마크가 상품 추가 창을 열고 닫는다 (detail: true / false)
  useEffect(() => {
    const onForm = (e: Event) => {
      const open = (e as CustomEvent<boolean>).detail;
      setEditingProduct(null);
      setShowForm(open);
    };
    window.addEventListener(PD_FORM_EVENT, onForm);
    return () => window.removeEventListener(PD_FORM_EVENT, onForm);
  }, []);

  const handleAdd = async (data: ProductInput) => {
    const added: Product = { ...data, id: `added-${Date.now()}`, company_id: "preview", created_at: new Date().toISOString() };
    setProducts((prev) => [...prev, added]);
    setShowForm(false);
    onNotice("상품이 목록에 추가됐어요.\n미리보기라 실제로 저장되지는 않아요.");
  };

  const handleEdit = async (data: ProductInput) => {
    if (!editingProduct) return;
    setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...data } : p)));
    setEditingProduct(null);
  };

  const handleStatusChange = (id: string, status: ProductStatus) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const handleDelete = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      {/* 상품 추가/수정 모달 */}
      {(showForm || editingProduct) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingProduct(null); } }}
        >
          <div className="bg-gray-100 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" data-coach="pd-form">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 bg-white">
              <h3 className="font-medium text-gray-900">{editingProduct ? "상품 수정" : "새 상품 추가"}</h3>
              <button
                onClick={() => { setShowForm(false); setEditingProduct(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            {editingProduct
              ? <PreviewProductForm key={editingProduct.id} initialData={editingProduct} onSubmit={handleEdit} onCancel={() => setEditingProduct(null)} />
              : <PreviewProductForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
            }
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-gray-900">상품 목록</h2>
          <button
            onClick={() => setShowForm(true)}
            data-coach="pd-add"
            className="bg-gold-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gold-600 transition-colors whitespace-nowrap"
          >
            + 상품 추가
          </button>
        </div>
        <div className="bg-white -mx-4 md:mx-0 py-4 px-4 md:rounded-2xl md:px-5">
          <PreviewProductTable
            products={products}
            onEdit={(product) => { setEditingProduct(product); setShowForm(false); }}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </>
  );
}
