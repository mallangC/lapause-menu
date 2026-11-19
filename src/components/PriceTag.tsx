import { discountRate, isDiscounted } from "@/lib/discount";

// 가격 표시 — 할인 중이면 정가(취소선) · 할인율 · 할인가, 아니면 가격만
// size: 글자 크기 묶음 (카드 sm / 상세 lg 등) · stack: 정가를 위 줄에 따로
export default function PriceTag({
  price,
  original,
  size = "sm",
  stack = false,
  align = "start",
  className = "",
  empty = "가격 문의",
}: {
  price: number | null | undefined;
  original?: number | null;
  size?: "xs" | "sm" | "md" | "lg";
  stack?: boolean;
  /** stack일 때 정렬 (카드 오른쪽 가격은 end) */
  align?: "start" | "end";
  className?: string;
  /** 가격이 0·없을 때 */
  empty?: string;
}) {
  const main = { xs: "text-[13px]", sm: "text-sm", md: "text-base", lg: "text-2xl" }[size];
  const sub = { xs: "text-[11px]", sm: "text-xs", md: "text-sm", lg: "text-base" }[size];
  if (!price) return <span className={`font-semibold text-gray-900 ${main} ${className}`}>{empty}</span>;
  if (!isDiscounted(price, original)) return <span className={`font-semibold text-gray-900 ${main} ${className}`}>{price.toLocaleString()}원</span>;
  const rate = discountRate(price, original);
  const was = <span className={`text-gray-400 line-through font-normal ${sub}`}>{original.toLocaleString()}원</span>;
  return (
    <span className={`inline-flex ${stack ? `flex-col ${align === "end" ? "items-end" : "items-start"}` : "flex-wrap items-baseline gap-x-1.5"} ${className}`}>
      {stack && was}
      <span className="inline-flex items-baseline gap-1.5">
        <span className={`font-bold text-red-500 ${main}`}>{rate}%</span>
        <span className={`font-semibold text-gray-900 ${main}`}>{price.toLocaleString()}원</span>
        {!stack && was}
      </span>
    </span>
  );
}
