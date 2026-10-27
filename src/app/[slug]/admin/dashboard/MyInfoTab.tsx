"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setOAuthIntent } from "@/lib/oauthIntent";
import type { UserIdentity } from "@supabase/supabase-js";

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "kakao", label: "카카오" },
] as const;

interface Props {
  slug: string;
  email: string;
  isOAuth: boolean;
  profileName: string;
  profilePhone: string;
  initialTwoFactorEnabled: boolean;
}

export default function MyInfoTab({ slug, email, isOAuth, profileName, profilePhone, initialTwoFactorEnabled }: Props) {
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUserIdentities();
      setIdentities(data?.identities ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLinkIdentity = async (provider: "google" | "kakao") => {
    setLinkingProvider(provider);
    setLinkError(null);
    setOAuthIntent({ mode: "link", provider, from: `/${slug}/admin` });
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLinkError("연결에 실패했습니다. 다시 시도해주세요.");
      setLinkingProvider(null);
    }
  };

  const handleUnlinkIdentity = async (identity: UserIdentity) => {
    if (identities.length <= 1) {
      setLinkError("최소 하나의 로그인 방법은 남아있어야 합니다.");
      return;
    }
    setLinkingProvider(identity.provider);
    setLinkError(null);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) {
      setLinkError("연결 해제에 실패했습니다. 다시 시도해주세요.");
    } else {
      setIdentities((prev) => prev.filter((i) => i.identity_id !== identity.identity_id));
    }
    setLinkingProvider(null);
  };

  const handleToggleTwoFactor = async () => {
    const next = !twoFactorEnabled;
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    const res = await fetch("/api/auth/2fa/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (res.ok) {
      setTwoFactorEnabled(next);
    } else {
      setTwoFactorError("변경에 실패했습니다. 다시 시도해주세요.");
    }
    setTwoFactorLoading(false);
  };

  const pwConditions = [
    { label: "8자 이상", ok: pwNew.length >= 8 },
    { label: "대문자 포함", ok: /[A-Z]/.test(pwNew) },
    { label: "숫자 포함", ok: /[0-9]/.test(pwNew) },
    { label: "특수문자 포함", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwNew) },
  ];

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (pwNew !== pwConfirm) { setPwError("비밀번호가 일치하지 않습니다."); return; }
    if (pwNew.length < 8) { setPwError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (!/[A-Z]/.test(pwNew)) { setPwError("대문자를 포함해야 합니다."); return; }
    if (!/[0-9]/.test(pwNew)) { setPwError("숫자를 포함해야 합니다."); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwNew)) { setPwError("특수문자를 포함해야 합니다."); return; }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) {
      setPwError("변경에 실패했습니다. 다시 시도해주세요.");
    } else {
      setPwSuccess(true);
      setPwNew("");
      setPwConfirm("");
      await supabase.auth.signOut();
      router.push(`/${slug}/admin`);
    }
    setPwLoading(false);
  };

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-medium text-gray-900 mb-6">내 정보</h2>

      <div className="space-y-5">
        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <div className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
            {email}
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <div className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
            {profileName || <span className="text-gray-300">미입력</span>}
          </div>
        </div>

        {/* 전화번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
          <div className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
            {profilePhone || <span className="text-gray-300">미입력</span>}
          </div>
        </div>
      </div>

      {/* 소셜 계정 연결 */}
      <div className="mt-8 pt-8 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-900 mb-1">소셜 계정 연결</h3>
        <p className="text-xs text-gray-400 mb-4">연결하면 해당 계정으로도 로그인할 수 있습니다.</p>
        {linkError && (
          <p className="text-xs text-red-500 mb-3">{linkError}</p>
        )}
        <div className="space-y-2">
          {SOCIAL_PROVIDERS.map(({ id, label }) => {
            const identity = identities.find((i) => i.provider === id);
            const busy = linkingProvider === id;
            return (
              <div key={id} className="flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">{label}</span>
                {identity ? (
                  <button
                    type="button"
                    onClick={() => handleUnlinkIdentity(identity)}
                    disabled={busy}
                    className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors underline underline-offset-2"
                  >
                    {busy ? "처리 중..." : "연결됨 · 해제"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkIdentity(id)}
                    disabled={busy}
                    className="text-xs text-gold-600 hover:text-gold-700 disabled:opacity-50 transition-colors underline underline-offset-2"
                  >
                    {busy ? "연결 중..." : "연결하기"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 비밀번호 변경 — OAuth 로그인은 숨김 */}
      {!isOAuth && <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">비밀번호 변경</h3>
          {!showPwForm && (
            <button
              type="button"
              onClick={() => setShowPwForm(true)}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              변경하기
            </button>
          )}
        </div>

        {showPwForm && (
          <form onSubmit={handlePwSubmit} className="space-y-3">
            {pwError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">변경되었습니다. 다시 로그인해주세요.</div>
            )}
            <div>
              <input
                type="password"
                required
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="새 비밀번호"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
              {pwNew && (
                <ul className="mt-1.5 space-y-0.5">
                  {pwConditions.map(({ label, ok }) => (
                    <li key={label} className={`text-xs flex items-center gap-1 ${ok ? "text-green-600" : "text-gray-400"}`}>
                      <span>{ok ? "✓" : "·"}</span>{label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <input
                type="password"
                required
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="새 비밀번호 확인"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none transition-colors ${pwConfirm && pwNew !== pwConfirm ? "border-red-300 focus:border-red-400" : "border-gray-300 focus:border-gray-500"}`}
              />
              {pwConfirm && pwNew !== pwConfirm && (
                <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pwLoading}
                className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
              >
                {pwLoading ? "변경 중..." : "비밀번호 변경"}
              </button>
              <button
                type="button"
                onClick={() => { setShowPwForm(false); setPwNew(""); setPwConfirm(""); setPwError(null); }}
                className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>}

      {/* 로그인 2단계 인증 */}
      <div className="mt-8 pt-8 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">로그인 2단계 인증</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              켜두면 새 기기에서 로그인할 때마다 {email}로 받은 인증번호를 추가로 입력해야 합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleTwoFactor}
            disabled={twoFactorLoading}
            className={`shrink-0 w-12 h-6 rounded-full transition-colors relative disabled:opacity-50 ${
              twoFactorEnabled ? "bg-gold-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                twoFactorEnabled ? "left-6" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {twoFactorError && <p className="text-xs text-red-500 mt-2">{twoFactorError}</p>}
        {twoFactorEnabled && (
          <p className="text-xs text-gold-600 mt-2">사용 중 — 인증을 완료한 기기는 선택에 따라 최대 30일간 다시 묻지 않습니다.</p>
        )}
      </div>
    </div>
  );
}
