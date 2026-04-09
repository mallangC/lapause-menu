import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "recovery"

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "recovery") {
        // 비밀번호 재설정
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      // 이메일 인증 완료 → 해당 사용자의 slug로 대시보드 이동
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: company } = await supabase
          .from("companies")
          .select("slug, subscription:company_subscriptions(plan)")
          .eq("owner_id", user.id)
          .maybeSingle();

        const plan = (company?.subscription as { plan?: string } | null)?.plan ?? "none";
        if (company?.slug) {
          if (!plan || plan === "none") {
            return NextResponse.redirect(`${origin}/plan`);
          }
          return NextResponse.redirect(`${origin}/${company.slug}/admin/dashboard`);
        }
      }

      return NextResponse.redirect(`${origin}/setup`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=invalid_link`);
}
