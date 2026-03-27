import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["solapi"],
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
