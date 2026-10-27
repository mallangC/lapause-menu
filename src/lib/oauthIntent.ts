// 소셜 로그인/계정 연결 시작 시 "무엇을 하려던 건지"를 짧게 남겨두는 쿠키.
// Supabase는 같은 이메일의 소셜 계정을 기존 계정에 자동으로 합치기 때문에,
// /auth/callback에서 이 값을 보고 "로그인 버튼으로 들어왔는데 자동 연결된 경우"를 가려낸다.
export const OAUTH_INTENT_COOKIE = "fa_oauth_intent";

export type OAuthProvider = "google" | "kakao";

export interface OAuthIntent {
  mode: "login" | "link";
  provider: OAuthProvider;
  /** 차단 시 돌려보낼 로그인 페이지 경로 */
  from: string;
}

export function setOAuthIntent(intent: OAuthIntent) {
  document.cookie = `${OAUTH_INTENT_COOKIE}=${encodeURIComponent(JSON.stringify(intent))}; path=/; max-age=600; samesite=lax`;
}

export function parseOAuthIntent(raw: string | undefined): OAuthIntent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if ((v.mode !== "login" && v.mode !== "link") || (v.provider !== "google" && v.provider !== "kakao")) return null;
    // 오픈 리다이렉트 방지 — 사이트 내부 경로만 허용
    const from = typeof v.from === "string" && v.from.startsWith("/") && !v.from.startsWith("//") ? v.from : "/login";
    return { mode: v.mode, provider: v.provider, from };
  } catch {
    return null;
  }
}

export const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  google: "구글",
  kakao: "카카오",
};
