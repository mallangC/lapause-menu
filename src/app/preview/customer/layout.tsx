import PreviewBar from "../PreviewBar";

export default function CustomerPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 화면을 끝까지 당겼을 때 보이는 바깥 영역은 흰 헤더·푸터와 이어지도록 흰색 (실제 매장 페이지와 같게) */}
      <style>{`html{background-color:#fff}`}</style>
      {children}
      <PreviewBar homeHref="/preview/customer" homeLabel="손님 홈" />
    </>
  );
}
