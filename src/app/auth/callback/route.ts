import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OAUTH_INTENT_COOKIE, parseOAuthIntent, type OAuthProvider } from "@/lib/oauthIntent";

// 방금 생성된 identity로 볼 시간 범위 — 콜백은 소셜 인증 직후 몇 초 안에 실행되므로 짧게 잡는다.
// (너무 길면 내 정보에서 직접 연결한 직후 그 소셜로 다시 로그인하는 정상 사용자까지 막힌다)
const FRESH_IDENTITY_MS = 2 * 60 * 1000;

/**
 * 로그인 버튼으로 소셜 로그인했는데 같은 이메일의 기존 계정이 있으면, 그 계정의 로그인 방법을 반환한다.
 * - 기존 계정에 자동 연결된 경우: 방금 붙은 소셜 identity를 다시 떼어낸다 (내 정보에서 직접 연결하도록)
 * - 별도 계정이 새로 생긴 경우(이메일 미인증 소셜 등): 매장이 없는 계정일 때만 막는다
 */
async function findExistingAccount(
  supabase: SupabaseClient,
  user: User,
  provider: OAuthProvider
): Promise<string | null> {
  const identities = user.identities ?? [];
  const current = identities.find((i) => i.provider === provider);
  const others = identities
    .filter((i) => i.provider !== provider)
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());

  if (current && others.length > 0) {
    const isFresh = Date.now() - new Date(current.created_at ?? 0).getTime() < FRESH_IDENTITY_MS;
    if (!isFresh) return null;
    const { error } = await supabase.auth.unlinkIdentity(current);
    if (error) console.error("[auth/callback] 자동 연결된 identity 해제 실패:", error.message);
    return others[0].provider;
  }

  if (!user.email) return null;

  const { data: company } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
  if (company) return null;

  const { data: otherProvider } = await createAdminClient().rpc("find_other_account_provider", {
    p_email: user.email,
    p_user_id: user.id,
  });
  return (otherProvider as string | null) ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "signup" | "recovery"

  const cookieStore = await cookies();
  const intent = parseOAuthIntent(cookieStore.get(OAUTH_INTENT_COOKIE)?.value);
  if (intent) cookieStore.delete(OAUTH_INTENT_COOKIE);

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
        // 같은 이메일로 가입된 계정이 있으면 소셜 로그인으로 바로 들어가지 못하게 막고 안내 모달로 보낸다
        // (내 정보 > 소셜 계정 연결에서 들어온 경우(mode=link)는 정상 연결이므로 통과)
        if (intent?.mode === "login") {
          const existing = await findExistingAccount(supabase, user, intent.provider);
          if (existing) {
            await supabase.auth.signOut();
            const params = new URLSearchParams({ account_exists: existing, attempted: intent.provider });
            return NextResponse.redirect(`${origin}${intent.from}?${params}`);
          }
        }

        // 카카오 이메일 필수 동의 전 가입자는 profiles.email이 비어 있으므로, 이메일을 받아온 시점에 채워둔다
        if (user.email) {
          await supabase
            .from("profiles")
            .update({ email: user.email })
            .eq("user_id", user.id)
            .or("email.is.null,email.eq.");
        }

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

      // 매장이 아직 없는 신규 가입자 — 구독 결제 페이지로(결제 완료 후 매장 정보 입력)
      return NextResponse.redirect(`${origin}/plan`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=invalid_link`);
}
