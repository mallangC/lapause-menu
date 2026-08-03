import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/:slug/admin",
    "/:slug/admin/:path*",
    "/admin",
    "/admin/:path*",
    "/plan/:path*",
    "/setup/:path*",
    "/refund/:path*",
    "/auth/:path*",
  ],
};
