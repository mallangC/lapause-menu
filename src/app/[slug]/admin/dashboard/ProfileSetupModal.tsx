"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  initialName: string;
  initialPhone: string;
  onComplete: () => void;
}

export default function ProfileSetupModal({ userId, initialName, initialPhone, onComplete }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^010\d{8}$/.test(phone)) {
      setError("010으로 시작하는 11자리 숫자를 입력해주세요.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ name, phone_number: phone })
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-1">프로필 설정</h2>
        <p className="text-sm text-gray-500 mb-6">서비스 이용을 위해 이름과 연락처를 입력해주세요.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              휴대폰 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "");
                if (d.length <= 11) setPhone(d);
              }}
              placeholder="01012345678"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name || !phone}
            className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "저장 중..." : "저장하고 시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
