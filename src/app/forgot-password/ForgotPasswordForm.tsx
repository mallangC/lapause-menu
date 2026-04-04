"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloAideFooter from "@/components/FloAideFooter";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("이메일 발송에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-gray-700 font-medium">이메일을 확인해주세요</p>
        <p className="text-xs text-gray-400">
          <span className="font-medium text-gray-600">{email}</span>으로<br />
          비밀번호 재설정 링크를 발송했습니다.
        </p>
        <Link href="/admin" className="block text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 mt-4">
          로그인으로 돌아가기
        </Link>
        <FloAideFooter />
      </div>
    );
  }

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
          placeholder="가입한 이메일 주소"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors mt-2"
      >
        {loading ? "발송 중..." : "재설정 링크 보내기"}
      </button>

      <p className="text-center text-xs text-gray-400">
        <Link href="/admin" className="text-gray-600 hover:text-gray-900 underline underline-offset-2">
          로그인으로 돌아가기
        </Link>
      </p>

      <FloAideFooter />
    </form>
  );
}
