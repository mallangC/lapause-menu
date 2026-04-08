import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flo.Aide | 플로에이드 - 꽃집 전자 메뉴 & 예약 서비스",
  description: "Flo.Aide(플로에이드) - 꽃집을 위한 전자 메뉴 및 상담 예약 서비스. 앱 설치 없이 링크 하나로 상품을 소개하고 예약을 받으세요.",
  keywords: ["Flo.Aide", "플로에이드", "Flo Aide", "꽃집 예약", "꽃집 메뉴", "꽃집 관리", "플라워샵 예약"],
  metadataBase: new URL("https://www.flo-aide.com"),
  openGraph: {
    title: "Flo.Aide | 플로에이드",
    description: "꽃집을 위한 전자 메뉴 및 상담 예약 서비스",
    url: "https://www.flo-aide.com",
    siteName: "Flo.Aide",
    locale: "ko_KR",
    type: "website",
  },
  verification: {
    other: {
      "naver-site-verification": "819c49a47101f2ab63b9d31bec18c768fb8b086e",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
