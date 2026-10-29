"use client";

import { useEffect, useState } from "react";
import { describeDiscount, describePromoTerms, PLAN_CHARGE_AMOUNT, quoteCharge, type PromoCode } from "@/lib/billingPrice";

interface PromoCodeRow extends PromoCode {
  description: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  active: boolean;
  operator_only: boolean;
  created_at: string;
  in_use_count: number;
}

const inputCls = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-400 placeholder-gray-300";

const formatDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percent" as "percent" | "amount",
  discountValue: "",
  appliesTo: "all" as "all" | "monthly" | "annual",
  durationCycles: "",
  maxRedemptions: "",
  expiresAt: "",
  operatorOnly: false,
};

export default function PromoCodesTab() {
  const [codes, setCodes] = useState<PromoCodeRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/operator/promo-codes")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
        setCodes(data as PromoCodeRow[]);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "불러오기 실패"));
  }, []);

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // 입력 중인 코드로 실제 결제 금액 미리보기
  const previewValue = Number(form.discountValue);
  const preview: PromoCode | null = Number.isInteger(previewValue) && previewValue > 0
    ? { id: "preview", code: form.code, discount_type: form.discountType, discount_value: previewValue, applies_to: form.appliesTo, duration_cycles: null }
    : null;

  const handleCreate = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/operator/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // 마감일은 그날 KST 자정 직전까지 등록 가능
          expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59+09:00` : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "생성 중 오류가 발생했습니다.");
      } else {
        setCodes((prev) => [data as PromoCodeRow, ...(prev ?? [])]);
        setForm(EMPTY_FORM);
        setShowForm(false);
      }
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: PromoCodeRow) => {
    setTogglingId(row.id);
    try {
      const res = await fetch("/api/operator/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, active: !row.active }),
      });
      if (res.ok) setCodes((prev) => (prev ?? []).map((c) => (c.id === row.id ? { ...c, active: !row.active } : c)));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          사장님이 요금제 화면에서 코드를 등록하면 이후 결제부터 할인됩니다. 사용 중지해도 이미 등록한 매장의 할인은 유지됩니다.
        </p>
        <button
          onClick={() => { setShowForm(true); setFormError(null); }}
          className="text-sm px-4 py-2 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          + 할인 코드 만들기
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">코드</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">할인</th>
                <th className="text-left px-5 py-3 font-medium whitespace-nowrap">적용 범위</th>
                <th className="text-right px-5 py-3 font-medium whitespace-nowrap">결제 금액 (월간 / 연간)</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">등록 / 한도</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">적용 중</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">등록 마감</th>
                <th className="text-center px-5 py-3 font-medium whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadError && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-red-400 text-sm">{loadError}</td></tr>
              )}
              {!loadError && codes === null && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-300 text-sm">불러오는 중…</td></tr>
              )}
              {codes?.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-300 text-sm">만든 할인 코드가 없습니다.</td></tr>
              )}
              {codes?.map((c) => {
                const expired = !!c.expires_at && new Date(c.expires_at) < new Date();
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-semibold text-gray-900">
                        {c.code}
                        {c.operator_only && <span className="ml-1.5 font-sans text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">운영자 전용</span>}
                      </div>
                      {c.description && <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-700">{describeDiscount(c)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">{describePromoTerms(c)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs text-gray-700">
                      ₩{quoteCharge("monthly", c, null).amount.toLocaleString()} / ₩{quoteCharge("annual", c, null).amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-700 whitespace-nowrap">
                      {c.redeemed_count} / {c.max_redemptions ?? "∞"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-gray-700">{c.in_use_count}</td>
                    <td className="px-5 py-3.5 text-center text-xs whitespace-nowrap">
                      {c.expires_at ? <span className={expired ? "text-red-400" : "text-gray-500"}>{formatDate(c.expires_at)}</span> : <span className="text-gray-300">없음</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(c)}
                        disabled={togglingId === c.id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          c.active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                        title={c.active ? "클릭하면 새 등록을 막습니다" : "클릭하면 다시 등록할 수 있습니다"}
                      >
                        {c.active ? "사용 중" : "중지됨"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 생성 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900">할인 코드 만들기</h3>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-500">코드</span>
                <input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="비워두면 자동 생성 (예: K7Q2MX)"
                  maxLength={30}
                  className={`${inputCls} mt-1 font-mono uppercase`}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500">메모 (선택, 사장님에게 안 보임)</span>
                <input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="예) 오픈 기념" className={`${inputCls} mt-1`} />
              </label>

              <div>
                <span className="text-xs font-medium text-gray-500">할인 방식</span>
                <div className="flex gap-2 mt-1">
                  <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm shrink-0">
                    {(["percent", "amount"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set("discountType", t)}
                        className={`px-3 py-2 transition-colors ${form.discountType === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {t === "percent" ? "비율(%)" : "금액(원)"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.discountValue}
                    onChange={(e) => set("discountValue", e.target.value.replace(/\D/g, ""))}
                    placeholder={form.discountType === "percent" ? "30" : "5000"}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500">적용 플랜</span>
                <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm mt-1 w-fit">
                  {(["all", "monthly", "annual"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("appliesTo", t)}
                      className={`px-3 py-2 transition-colors ${form.appliesTo === t ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {t === "all" ? "월간·연간" : t === "monthly" ? "월간만" : "연간만"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-500">할인 횟수</span>
                  <input type="text" inputMode="numeric" value={form.durationCycles} onChange={(e) => set("durationCycles", e.target.value.replace(/\D/g, ""))} placeholder="비우면 평생" className={`${inputCls} mt-1`} />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-500">사용 가능 매장 수</span>
                  <input type="text" inputMode="numeric" value={form.maxRedemptions} onChange={(e) => set("maxRedemptions", e.target.value.replace(/\D/g, ""))} placeholder="비우면 무제한" className={`${inputCls} mt-1`} />
                </label>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.operatorOnly}
                  onChange={(e) => set("operatorOnly", e.target.checked)}
                  className="mt-0.5 shrink-0"
                />
                <span>
                  <span className="text-xs font-medium text-gray-700">운영자 전용</span>
                  <span className="block text-[11px] text-gray-400">사장님이 코드를 입력해 등록할 수 없고, 매장 관리에서 운영자가 직접 적용합니다. 코드가 유출돼도 쓸 수 없어요.</span>
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500">등록 마감일 (선택)</span>
                <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={`${inputCls} mt-1`} />
                <span className="text-[11px] text-gray-400">마감 후에는 새로 등록할 수 없고, 이미 등록한 매장의 할인은 유지됩니다.</span>
              </label>
            </div>

            {preview && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                <p className="font-medium text-gray-700">결제 금액 미리보기</p>
                {(["monthly", "annual"] as const).map((cycle) => {
                  const q = quoteCharge(cycle, preview, null);
                  return (
                    <p key={cycle}>
                      {cycle === "monthly" ? "월간" : "연간"}: ₩{PLAN_CHARGE_AMOUNT[cycle].toLocaleString()} →{" "}
                      <span className="font-semibold text-gray-900">₩{q.amount.toLocaleString()}</span>
                      {q.discountAmount === 0 && <span className="text-gray-400"> (할인 대상 아님)</span>}
                      {q.amount === 0 && <span className="text-gray-400"> (결제 없이 무료)</span>}
                    </p>
                  );
                })}
              </div>
            )}

            {formError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.discountValue}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "만드는 중…" : "만들기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
