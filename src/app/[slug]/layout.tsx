import { getMenuData } from "@/lib/menuCache";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function SlugLayout({ params, children }: Props) {
  const { slug } = await params;
  // 메뉴판 page와 같은 캐시 데이터를 공유한다 (같은 요청 안에서는 한 번만 조회)
  const menu = await getMenuData(slug);

  const isDemo = menu?.company.is_demo ?? false;

  if (!isDemo) return <>{children}</>;

  return (
    <>
      <div className="sticky top-0 z-[60] bg-red-600 text-white text-center text-xs font-semibold py-1.5 px-2 leading-snug tracking-wide">
        DEMO 모드 — 실제 결제가 이루어지지 않습니다
      </div>
      {children}
    </>
  );
}
