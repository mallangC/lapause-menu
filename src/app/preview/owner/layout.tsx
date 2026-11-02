import PreviewBar from "../PreviewBar";

export default function OwnerPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PreviewBar homeHref="/preview/owner" homeLabel="대시보드" />
    </>
  );
}
