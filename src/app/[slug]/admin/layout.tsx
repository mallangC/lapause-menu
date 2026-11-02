// 매장 관리자 화면 — 화면을 끝까지 당겼을 때(오버스크롤) 보이는 바깥 영역 색
// 아래: 관리자 화면 바탕과 같은 옅은 회색 (html 배경)
// 위: 흰 헤더와 이어지게 흰색 — 바깥 영역은 한 가지 색만 칠해지므로, 페이지 맨 위 바깥에 흰 블록을 하나 둬서
//     위로 당겼을 때 그 블록이 보이게 한다 (평소에는 화면 밖이라 보이지 않고 스크롤 길이에도 영향 없음)
// (매장 공통 레이아웃의 html{흰색}·매장 포인트색 지정보다 뒤에 와서 이 값이 적용된다 — 관리자 화면은 기본 금색,
//  대시보드는 자기 화면에서 매장 색을 따로 적용)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`:root{--color-gold-400:#c9a96e;--color-gold-500:#b8934a;--color-gold-600:#9a7a3a}html{background-color:#f3f4f6}body::before{content:"";position:absolute;left:0;right:0;top:-100vh;height:100vh;background-color:#fff;pointer-events:none}`}</style>
      {children}
    </>
  );
}
