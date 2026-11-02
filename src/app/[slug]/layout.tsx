import { getMenuData } from "@/lib/menuCache";
import { generateThemeVars, DEFAULT_THEME_BG, DEFAULT_THEME_ACCENT } from "@/lib/theme";
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

  // 디자인 포인트색(버튼·강조 색)은 손님이 보는 모든 화면에 적용 — 맞춤주문·주문서·로딩·결제 링크까지
  // (배경색은 메뉴판 홈·상품 상세·장바구니 화면만 각자 적용한다)
  // 화면을 끝까지 당겼을 때(오버스크롤) 보이는 바깥 영역은 흰 헤더·푸터와 이어지도록 흰색(html 배경)
  const accentVars = menu
    ? Object.entries(
        generateThemeVars(
          (menu.settings.theme_bg as string | null) ?? DEFAULT_THEME_BG,
          (menu.settings.theme_accent as string | null) ?? DEFAULT_THEME_ACCENT
        )
      ).filter(([k]) => k.startsWith("--color-gold-"))
    : [];
  const theme = (
    <style>{`:root{${accentVars.map(([k, v]) => `${k}:${v}`).join(";")}}html{background-color:#fff}`}</style>
  );

  if (!isDemo) return <>{theme}{tracker}{children}</>;

  return (
    <>
      {theme}
      {tracker}
      <div className="sticky top-0 z-[60] bg-red-600 text-white text-center text-xs font-semibold py-1.5 px-2 leading-snug tracking-wide">
        DEMO 모드 — 실제 결제가 이루어지지 않습니다
      </div>
      {children}
    </>
  );
}
