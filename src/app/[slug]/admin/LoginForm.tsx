"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloAideFooter from "@/components/FloAideFooter";

interface Props {
  slug: string;
}

export default function LoginForm({ slug }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    router.push(`/${slug}/admin/dashboard`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          placeholder="admin@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors mt-2"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>

      <div className="flex items-center justify-center gap-3 pt-2">
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
    </form>
  );
}
