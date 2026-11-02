// 맞춤주문 로딩 화면 — 서버에서 매장 데이터를 준비하는 동안 바로 보여줘서 버튼을 누르고 멈춘 것처럼 보이지 않게 한다
// (헤더·단계 표시줄·1단계 아코디언 자리를 실제 화면과 같은 크기로 잡아 둔다)
export default function ConsultLoading() {
  return (
    <div className="min-h-screen bg-gray-100" aria-busy="true" aria-label="불러오는 중">
      {/* 헤더 */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 h-14 md:h-20 flex items-center justify-between">
          <div className="w-6 h-6 rounded bg-gray-100" />
          <div className="w-28 md:w-40 h-5 md:h-7 rounded-full bg-gray-100 animate-pulse" />
          <div className="w-6 h-6 rounded bg-gray-100" />
        </div>
      </div>

      {/* 단계 표시줄 */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="h-px bg-gray-200 w-8" />}
              <div className={`w-6 h-6 rounded-full ${i === 0 ? "bg-gold-500/60" : "bg-gray-100"}`} />
            </div>
          ))}
        </div>
      </div>

      {/* 1단계 자리 */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-2.5">
        <div className="bg-white -mx-4 md:mx-0 md:rounded-xl px-5 py-4 flex flex-col items-center gap-2">
          <div className="w-56 h-3.5 rounded-full bg-gray-100 animate-pulse" />
          <div className="w-44 h-3.5 rounded-full bg-gray-100 animate-pulse" />
        </div>
        <div className="bg-white -mx-4 md:mx-0 md:rounded-xl overflow-hidden divide-y divide-gray-200">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 py-4 bg-gray-50 flex items-center justify-between">
              <div className="w-24 h-4 rounded-full bg-gray-200/70 animate-pulse" />
              <div className="w-4 h-4 rounded bg-gray-200/70" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
