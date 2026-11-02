import { Product } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  consultEnabled?: boolean;
  slug?: string;
}

export default function ProductGrid({ products, consultEnabled, slug }: ProductGridProps) {
  if (products.length === 0) {
    return (
      // 남은 높이 한가운데에 안내 문구 (부모 상품 목록 영역이 화면 바닥까지 채운다)
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-beige-400">
        <p className="text-lg">해당 조건의 상품이 없습니다.</p>
        <p className="text-sm mt-1">필터를 변경해 보세요.</p>
      </div>
    );
  }

  // 칸 사이 선과 빈 칸(마지막 줄이 덜 찬 경우)은 디자인에서 정한 배경색
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-beige-100">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} consultEnabled={consultEnabled} slug={slug} />
      ))}
    </div>
  );
}
