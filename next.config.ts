import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // 개발 서버를 같은 와이파이의 휴대폰에서 열어볼 때(http://맥IP:3000) 개발용 파일 요청이 막히지 않게 허용 — 개발 모드에서만 쓰인다
  allowedDevOrigins: ["192.168.*.*"],
  serverExternalPackages: ["solapi"],
  env: {
    NEXT_PUBLIC_PORTONE_STORE_ID: "store-7c632ee3-f3ec-47d9-9c8c-bb3f28b36924",
    NEXT_PUBLIC_PORTONE_CHANNEL_KEY: "channel-key-7c495eb2-40e6-4994-8896-ebe4d5d3fee7",
    NEXT_PUBLIC_SUPABASE_URL: "https://ziqatrvwyfvoscfmaaoi.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_di62Rtm8LjKeDaOYZpXolQ_kiOrKf8K",
    NEXT_PUBLIC_SITE_URL: "https://www.flo-aide.com",
  },
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
