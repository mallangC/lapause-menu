"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  email: string;
}

export default function Verify2FAClient({ slug, email }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentOnce, setSentOnce] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    const res = await fetch("/api/auth/2fa/send-code", { method: "POST" });
    if (res.ok) {
      setSentOnce(true);
      setCooldown(30);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "인증번호 발송에 실패했습니다.");
    }
    setSending(false);
  };

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/2fa/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, remember }),
    });
    if (res.ok) {
      router.push(`/${slug}/admin/dashboard`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "인증에 실패했습니다.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-beige-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-beige-200 p-7 space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">로그인 2단계 인증</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{email}</span>로 받은 인증번호를 입력해주세요.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        {sentOnce && !error && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">인증번호를 발송했습니다. (유효시간 5분)</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="인증번호 6자리"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center text-lg tracking-[0.3em] bg-white focus:outline-none focus:border-gray-500"
          />

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-gold-500"
            />
            이 기기 30일간 기억하기
          </label>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gold-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "확인 중..." : "인증하기"}
          </button>
        </form>

        <button
          type="button"
          onClick={sendCode}
          disabled={sending || cooldown > 0}
          className="w-full text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors underline underline-offset-2"
        >
          {cooldown > 0 ? `인증번호 재발송 (${cooldown}초 후 가능)` : sending ? "발송 중..." : "인증번호 재발송"}
        </button>
      </div>
    </div>
  );
}
