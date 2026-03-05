"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Product } from "@/types";
import { BADGE_COLORS } from "@/lib/constants";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function ActionMenu({ product, onEdit, onDelete }: { product: Product; onEdit: (p: Product) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg leading-none"
      >
        ···
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: "absolute", top: pos.top, right: pos.right }}
          className="z-9999 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-20"
        >
          <button
            onClick={() => { onEdit(product); setOpen(false); }}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-center"
          >
            수정
          </button>
          <button
            onClick={() => { onDelete(product.id); setOpen(false); }}
            className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-center border-t border-gray-100"
          >
            삭제
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>등록된 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-center">
            <th className="pb-2 pr-4 font-medium text-gray-400">상품명</th>
            <th className="pb-2 pr-4 font-medium text-gray-400">유형</th>
            <th className="pb-2 pr-4 font-medium text-gray-400">가격</th>
            <th className="pb-2 pr-4 font-medium text-gray-400">포장</th>
            <th className="pb-2 pr-4 font-medium text-gray-400">뱃지</th>
            <th className="pb-2 font-medium text-gray-400">관리</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-center"
            >
              <td className="py-3 pr-4 font-medium">{product.name}</td>
              <td className="py-3 pr-4 text-gray-700">{product.product_type}</td>
              <td className="py-3 pr-4">{product.price.toLocaleString()}원</td>
              <td className="py-3 pr-4 text-gray-400">{product.wrapping_color}</td>
              <td className="py-3 pr-4">
                <div className="flex gap-1 justify-center">
                  {product.is_popular && (
                    <span className="text-white text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: BADGE_COLORS.popular.bg }}>
                      {BADGE_COLORS.popular.label}
                    </span>
                  )}
                  {product.is_recommended && (
                    <span className="text-white text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: BADGE_COLORS.recommended.bg }}>
                      {BADGE_COLORS.recommended.label}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3">
                <div className="flex justify-center">
                  <ActionMenu product={product} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
