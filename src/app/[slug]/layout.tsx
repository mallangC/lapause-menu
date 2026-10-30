import { getMenuData } from "@/lib/menuCache";
import TrafficTracker from "@/components/main/TrafficTracker";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function SlugLayout({ params, children }: Props) {
  const { slug } = await params;
  // 메뉴판 page와 같은 캐시 데이터를 공유한다 (같은 요청 안에서는 한 번만 조회)
  const menu = await getMenuData(slug);

  const isDemo = menu?.company.is_demo ?? false;

  // 유입 출처 기억 + 방문 수 기록 (관리자·결제 링크 페이지는 컴포넌트 안에서 제외)
  const tracker = menu ? <TrafficTracker slug={slug} /> : null;

  if (!isDemo) return <>{tracker}{children}</>;

  return (
    <>
      {tracker}
      <div className="sticky top-0 z-[60] bg-red-600 text-white text-center text-xs font-semibold py-1.5 px-2 leading-snug tracking-wide">
        DEMO 모드 — 실제 결제가 이루어지지 않습니다
      </div>
      {children}
    </>
  );
}
