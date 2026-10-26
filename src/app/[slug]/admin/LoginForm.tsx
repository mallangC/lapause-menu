"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloAideFooter from "@/components/FloAideFooter";

interface Props {
  slug: string;
}

export default function LoginForm({ slug }: Props) {
  const searchParams = useSearchParams();
  const suspendReason = searchParams.get("suspended")
    ? (searchParams.get("reason") ?? "정책 위반")
    : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(suspendReason
    ? `${suspendReason}으로 계정이 정지되었습니다. 문의: floaide.team@gmail.com`
    : null
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setGoogleLoading(false);
  };

  const handleKakaoLogin = async () => {
    setKakaoLoading(true);
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setKakaoLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push(`/${slug}/admin/dashboard`);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 소셜 로그인 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.29h6.47c-.28 1.5-1.13 2.77-2.41 3.62v3.01h3.86c2.26-2.09 3.6-5.17 3.6-8.65z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.86-3.01c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.26 21.3 7.28 24 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.26A7.44 7.44 0 0 1 4.85 12c0-.78.14-1.54.38-2.26v-3.1H1.27A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.27 5.36l4-3.1z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.28 0 3.26 2.7 1.27 6.64l4 3.1C6.22 6.87 8.87 4.75 12 4.75z" />
          </svg>
          {googleLoading ? "연결 중..." : "Google로 계속하기"}
        </button>
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={kakaoLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-black bg-[#FEE500] hover:bg-[#f5dc00] disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000000">
            <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.87 5.37 4.69 6.8-.15.53-.96 3.32-.99 3.54 0 0-.02.17.09.24.11.07.24.02.24.02.32-.04 3.7-2.42 4.27-2.83.55.08 1.12.12 1.7.12 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
          </svg>
          {kakaoLoading ? "연결 중..." : "카카오로 계속하기"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* 이메일 로그인 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          placeholder="이메일"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          placeholder="비밀번호"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="flex items-center justify-center gap-3 pt-1">
        <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">
          비밀번호 찾기
        </Link>
        <span className="text-gray-200 text-xs">·</span>
        <Link href="/signup" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">
          회원가입
        </Link>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">이용약관</Link>
        <span className="text-gray-200 text-xs">·</span>
        <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">개인정보처리방침</Link>
      </div>

      <FloAideFooter />
    </div>
  );
}
