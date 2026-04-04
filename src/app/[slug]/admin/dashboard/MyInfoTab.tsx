"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  slug: string;
  email: string;
  isOAuth: boolean;
  profileName: string;
  profilePhone: string;
}

export default function MyInfoTab({ slug, email, isOAuth, profileName, profilePhone }: Props) {
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

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
    </div>
  );
}
