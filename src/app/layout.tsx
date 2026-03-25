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
  title: "Flo.Aide",
  description: "Flo.Aide - 꽃집 전자 메뉴 및 상담 예약 서비스",
  metadataBase: new URL("https://www.flo-aide.com"),
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
