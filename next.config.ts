import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["solapi"],
  env: {
    NEXT_PUBLIC_PORTONE_STORE_ID: "store-7c632ee3-f3ec-47d9-9c8c-bb3f28b36924",
    NEXT_PUBLIC_PORTONE_CHANNEL_KEY: "channel-key-7c495eb2-40e6-4994-8896-ebe4d5d3fee7",
    NEXT_PUBLIC_SUPABASE_URL: "https://yywoqaydqjcgpwxyantp.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_e5Pbv68IVRK6G6NQtkPmvg_kFEMfU9h",
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
