import { Product } from "@/types";

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-beige-400">
        <p>등록된 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-beige-200 text-left">
            <th className="pb-2 pr-4 font-medium text-beige-400">상품명</th>
            <th className="pb-2 pr-4 font-medium text-beige-400">유형</th>
            <th className="pb-2 pr-4 font-medium text-beige-400">가격</th>
            <th className="pb-2 pr-4 font-medium text-beige-400">포장</th>
            <th className="pb-2 pr-4 font-medium text-beige-400">뱃지</th>
            <th className="pb-2 font-medium text-beige-400">관리</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-beige-100 hover:bg-beige-50 transition-colors"
            >
              <td className="py-3 pr-4 font-medium">{product.name}</td>
              <td className="py-3 pr-4 text-gold-500">{product.product_type}</td>
              <td className="py-3 pr-4">{product.price.toLocaleString()}원</td>
              <td className="py-3 pr-4 text-beige-400">{product.wrapping_color}</td>
              <td className="py-3 pr-4">
                <div className="flex gap-1">
                  {product.is_popular && (
                    <span className="bg-gold-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                      인기
                    </span>
                  )}
                  {product.is_recommended && (
                    <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      추천
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="text-gold-500 hover:text-gold-600 text-xs underline"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-red-400 hover:text-red-600 text-xs underline"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
