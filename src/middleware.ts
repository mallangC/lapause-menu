import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 파일(_next/static, _next/image, favicon 등)과
     * API 라우트를 제외한 모든 경로에서 세션 갱신 처리
     */
    "/((?!_next/static|_next/image|favicon.ico|fonts/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
