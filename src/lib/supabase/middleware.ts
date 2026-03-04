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
    const isOnDashboard = pathname.includes("/admin/dashboard");

    if (isOnDashboard && !user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${slug}/admin`;
      return NextResponse.redirect(redirectUrl);
    }
    if (!isOnDashboard && user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${slug}/admin/dashboard`;
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}
