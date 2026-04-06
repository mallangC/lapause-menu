"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloAideFooter from "@/components/FloAideFooter";

export default function RootLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

    // 이메일 인증 여부 확인
    if (!authData.user.email_confirmed_at) {
      await supabase.auth.signOut();
      setError("이메일 인증이 완료되지 않았습니다. 메일함에서 인증 링크를 확인해주세요.");
      setLoading(false);
      return;
    }

    // operator role 체크
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .single();

    if (profile?.role === "operator") {
      router.push("/admin/dashboard");
      return;
    }

    // 로그인한 사용자의 회사 slug 조회
    const { data: company } = await supabase
      .from("companies")
      .select("slug, plan")
      .eq("owner_id", authData.user.id)
      .single();

    if (!company) {
      router.push("/setup");
      return;
    }

    if (!company.plan || company.plan === "none") {
      router.push("/plan");
      return;
    }

    router.push(`/${company.slug}/admin/dashboard`);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 구글 로그인 — 임시 숨김 */}
      {/* <button type="button" onClick={handleGoogleLogin} ...>Google로 계속하기</button> */}

      {/* 회원가입 버튼 — 임시 숨김 */}
      {/* <Link href="/signup">이메일로 회원가입</Link> */}

      {/* 이메일 로그인 */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="text-center">
        <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">
          비밀번호를 잊으셨나요?
        </Link>
      </div>

      <div className="flex items-center justify-center gap-3 pt-1">
        <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">이용약관</Link>
        <span className="text-gray-200 text-xs">·</span>
        <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">개인정보처리방침</Link>
      </div>

      <FloAideFooter />
    </div>
  );
}
