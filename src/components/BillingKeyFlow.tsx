"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  companyId: string;
  customerName: string;
  subscriptionPlan: "monthly" | "annual";
  onSuccess: () => void;
  onError?: (msg: string) => void;
  buttonLabel?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  disabled?: boolean;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function shuffle(arr: (number | null)[]): (number | null)[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function VirtualNumpad({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [keys, setKeys] = useState<(number | null)[]>(() =>
    shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, null, null])
  );

  const reshuffle = useCallback(() => {
    setKeys(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, null, null]));
  }, []);

  const handleKey = (n: number | null) => {
    if (n === null) return;
    if (value.length < 4) onChange(value + String(n));
  };

  const handleDelete = () => onChange(value.slice(0, -1));

  return (
    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl select-none">
      {/* 입력 표시 */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-md border flex items-center justify-center text-sm font-bold transition-colors ${
                i < value.length
                  ? "border-gold-400 bg-gold-50 text-gold-600"
                  : "border-gray-200 bg-white text-transparent"
              }`}
            >
              ●
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={reshuffle}
            className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            섞기
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClose}
            className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 키패드 그리드 */}
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((n, i) => (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleKey(n)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
              n === null
                ? "bg-transparent cursor-default"
                : "bg-white border border-gray-200 text-gray-800 hover:bg-gold-50 hover:border-gold-300 active:bg-gold-100"
            }`}
          >
            {n !== null ? n : ""}
          </button>
        ))}
        {/* 마지막 행: 빈칸 + 지우기 */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleDelete}
          className="h-10 col-span-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:bg-red-100 transition-colors flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (value.length === 4) onClose(); }}
          disabled={value.length !== 4}
          className="h-10 col-span-2 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700 active:bg-gray-900 transition-colors disabled:opacity-30"
        >
          확인
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-400 bg-white";

const BILLING_AUTH_PENDING_KEY = "flo_aide_billing_auth_pending";

export default function BillingKeyFlow({
  companyId,
  subscriptionPlan,
  onSuccess,
  onError,
  buttonLabel = "결제 수단 등록",
  buttonClassName,
  buttonStyle,
  disabled = false,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 토스 SDK 빌링 인증창에서 리다이렉트로 돌아왔을 때 authKey를 billingKey로 교환
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    if (!authKey || !customerKey) return;

    // 돌아온 URL의 쿼리는 한 번만 처리하고 바로 정리
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);

    const pendingRaw = sessionStorage.getItem(BILLING_AUTH_PENDING_KEY);
    sessionStorage.removeItem(BILLING_AUTH_PENDING_KEY);
    if (!pendingRaw) return;

    const pending = JSON.parse(pendingRaw) as { companyId: string; subscriptionPlan: "monthly" | "annual" };
    if (pending.companyId !== customerKey) return;

    setAuthLoading(true);
    fetch("/api/billing/confirm-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: pending.companyId,
        subscriptionPlan: pending.subscriptionPlan,
        authKey,
        customerKey,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "카드 등록에 실패했습니다.");
        onSuccess();
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
        setError(msg);
        onError?.(msg);
      })
      .finally(() => setAuthLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBillingAuth = async () => {
    setError(null);
    setAuthLoading(true);
    try {
      sessionStorage.setItem(
        BILLING_AUTH_PENDING_KEY,
        JSON.stringify({ companyId, subscriptionPlan })
      );
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: companyId });
      // 탭 상태(activeTab)는 URL이 아니라 클라이언트 state라서, 돌아왔을 때 plan 탭이 다시 열리도록 명시적으로 지정
      const returnUrl = `${window.location.origin}${window.location.pathname}?tab=plan`;
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: returnUrl,
        failUrl: returnUrl,
      });
    } catch (err) {
      sessionStorage.removeItem(BILLING_AUTH_PENDING_KEY);
      const msg = err instanceof Error ? err.message : "카드 등록 중 오류가 발생했습니다.";
      setError(msg);
      onError?.(msg);
      setAuthLoading(false);
    }
  };

  const [cardParts, setCardParts] = useState(["", "", "", ""]);
  const [showNumpad, setShowNumpad] = useState(false);
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");

  const cardRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const expiryMonthRef = useRef<HTMLInputElement>(null);
  const expiryYearRef = useRef<HTMLInputElement>(null);
  const identityRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const openModal = () => {
    setCardParts(["", "", "", ""]);
    setShowNumpad(false);
    setExpiryMonth("");
    setExpiryYear("");
    setIdentity("");
    setPassword("");
    setError(null);
    setShowModal(true);
  };

  const handleCardPart = (i: number, val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    const next = [...cardParts];
    next[i] = digits;
    setCardParts(next);
    if (digits.length === 4 && i < 2) cardRefs[i + 1].current?.focus();
    if (digits.length === 4 && i === 2) setShowNumpad(true);
  };

  const handleLastPart = (val: string) => {
    const next = [...cardParts];
    next[3] = val;
    setCardParts(next);
    if (val.length === 4) {
      setShowNumpad(false);
      expiryMonthRef.current?.focus();
    }
  };

  const handleExpiryMonth = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    setExpiryMonth(digits);
    if (digits.length === 2) expiryYearRef.current?.focus();
  };

  const handleExpiryYear = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 2);
    setExpiryYear(digits);
    if (digits.length === 2) passwordRef.current?.focus();
  };

  const handleIdentity = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setIdentity(digits);
  };

  const handleSubmit = async () => {
    const cardNumber = cardParts.join("");
    if (cardNumber.length !== 16) return setError("카드번호 16자리를 입력해주세요.");
    if (expiryMonth.length !== 2 || expiryYear.length !== 2) return setError("유효기간을 입력해주세요.");
    if (identity.length < 6) return setError("생년월일(6자리) 또는 사업자번호(10자리)를 입력해주세요.");
    if (password.length !== 2) return setError("카드 비밀번호 앞 2자리를 입력해주세요.");

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/issue-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          subscriptionPlan,
          cardNumber,
          cardExpirationMonth: expiryMonth,
          cardExpirationYear: expiryYear,
          customerIdentityNumber: identity,
          cardPassword: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "카드 등록에 실패했습니다.");

      setShowModal(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        disabled={disabled}
        className={buttonClassName ?? "w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"}
        style={buttonStyle ?? (!buttonClassName ? { background: "#2c2416" } : undefined)}
      >
        {buttonLabel}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setShowModal(false); }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b8934a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <h3 className="text-sm font-semibold text-gray-900">카드 등록</h3>
              </div>
              <p className="text-xs text-gray-400">정기결제에 사용할 카드 정보를 입력해주세요</p>
            </div>

            {/* 폼 */}
            <div className="px-6 py-5 space-y-4">
              {/* 카드번호 */}
              <Field label="카드번호">
                <div className="flex items-center gap-1.5">
                  {/* 앞 3그룹: 키보드 입력 */}
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      ref={cardRefs[i]}
                      type={i >= 2 ? "password" : "text"}
                      inputMode="numeric"
                      maxLength={4}
                      value={cardParts[i]}
                      onChange={(e) => handleCardPart(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && cardParts[i] === "" && i > 0) cardRefs[i - 1].current?.focus();
                      }}
                      placeholder="0000"
                      className="flex-1 min-w-0 text-center py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-400 tracking-widest bg-white"
                    />
                  ))}
                  {/* 마지막 그룹: 가상 키패드 */}
                  <button
                    type="button"
                    onClick={() => setShowNumpad(true)}
                    className={`flex-1 min-w-0 text-center py-2.5 border rounded-lg text-sm tracking-widest transition-colors ${
                      showNumpad
                        ? "border-gold-400 bg-gold-50"
                        : cardParts[3].length > 0
                        ? "border-gray-200 bg-white text-gray-800"
                        : "border-gray-200 bg-white text-gray-300"
                    }`}
                  >
                    {cardParts[3].length > 0 ? "●".repeat(cardParts[3].length) : "0000"}
                  </button>
                </div>

                {/* 가상 키패드 */}
                {showNumpad && (
                  <VirtualNumpad
                    value={cardParts[3]}
                    onChange={handleLastPart}
                    onClose={() => setShowNumpad(false)}
                  />
                )}
              </Field>

              {/* 유효기간 + 비밀번호 */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="유효기간" hint="MM / YY">
                  <div className="flex items-center gap-1">
                    <input
                      ref={expiryMonthRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={expiryMonth}
                      onChange={(e) => handleExpiryMonth(e.target.value)}
                      placeholder="MM"
                      className="w-full text-center py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-400 bg-white"
                    />
                    <span className="text-gray-300 text-sm shrink-0">/</span>
                    <input
                      ref={expiryYearRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={expiryYear}
                      onChange={(e) => handleExpiryYear(e.target.value)}
                      placeholder="YY"
                      className="w-full text-center py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-400 bg-white"
                    />
                  </div>
                </Field>

                <Field label="비밀번호" hint="앞 2자리">
                  <input
                    ref={passwordRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={2}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="••"
                    className={inputCls + " text-center tracking-[0.5em]"}
                  />
                </Field>
              </div>

              {/* 생년월일 */}
              <Field label="생년월일" hint="법인·개인사업자는 사업자번호 10자리">
                <input
                  ref={identityRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={identity}
                  onChange={(e) => handleIdentity(e.target.value)}
                  placeholder="예) 901225"
                  className={inputCls}
                />
              </Field>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#2c2416" }}
              >
                {loading ? "등록 중..." : "카드 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
