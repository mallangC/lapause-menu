"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloAideFooter from "@/components/FloAideFooter";

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) return setError("비밀번호가 일치하지 않습니다.");
    if (password.length < 6) return setError("비밀번호는 6자 이상이어야 합니다.");

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });

    if (authError) {
      setError(authError.message ?? "회원가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    router.push(`/signup/verify?email=${encodeURIComponent(email)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors mt-2"
      >
        {loading ? "가입 중..." : "가입하기"}
      </button>

      <p className="text-center text-xs text-gray-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-gray-600 hover:text-gray-900 underline underline-offset-2">
          로그인
        </Link>
      </p>

      <div className="flex items-center justify-center gap-3">
        <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">이용약관</Link>
        <span className="text-gray-200 text-xs">·</span>
        <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">개인정보처리방침</Link>
      </div>

      <FloAideFooter />
    </form>
  );
}
