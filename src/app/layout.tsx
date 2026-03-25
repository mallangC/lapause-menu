import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
