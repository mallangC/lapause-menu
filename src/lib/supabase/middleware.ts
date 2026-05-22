import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /:slug/admin 라우트 처리
  const slugMatch = pathname.match(/^\/([^/]+)\/admin(\/.*)?$/);
  if (slugMatch) {
    const slug = slugMatch[1];
    const isLoginPage = pathname === `/${slug}/admin`;

    if (!isLoginPage && !user) {
      // 미인증 사용자가 보호된 페이지 접근 → 로그인으로
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${slug}/admin`;
      return NextResponse.redirect(redirectUrl);
    }
    if (isLoginPage && user) {
      // 이미 로그인된 사용자가 로그인 페이지 접근 → 대시보드로
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${slug}/admin/dashboard`;
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}
