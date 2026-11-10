// 금액을 정하기 전에 — '이 금액 이상이면 원하는 꽃 색을 지정할 수 있어요' 한 줄 안내
// 첫 화면 대화의 예산 칸, 맞춤주문 2단계 '희망 예산'이 함께 쓴다. 금액이 최소 금액을 넘으면 확인 표시로 바뀐다.
// 최소 금액이 없으면(0) 누구나 고를 수 있어 그리지 않는다.

export default function ColorMinPriceHint({ minPrice, amount, className = "" }: { minPrice: number; amount: number; className?: string }) {
  if (!minPrice || minPrice <= 0) return null;
  const ok = amount >= minPrice;
  return (
    <p className={`flex items-center gap-1.5 text-[13px] break-keep ${ok ? "text-gold-600 font-medium" : "text-gray-500"} ${className}`}>
      {ok ? (
        <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <span className="shrink-0">🎨</span>
      )}
      {ok ? "원하는 꽃 색을 선택할 수 있어요" : `${minPrice.toLocaleString("ko-KR")}원 이상은 꽃 색을 지정할 수 있어요`}
    </p>
  );
}
