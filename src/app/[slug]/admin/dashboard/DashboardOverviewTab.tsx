"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
  companyId: string;
  slug: string;
  plan: "starter" | "pro" | "free";
  onNavigate: (tab: string) => void;
}

interface Settings {
  consult_enabled: boolean;
  consult_apply_status: "pending" | "approved" | "rejected" | null;
  business_verified_at: string | null;
  bank_account_image_url: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  address: string | null;
  delivery_enabled: boolean;
  message_card_enabled: boolean;
  shopping_bag_enabled: boolean;
}

interface ReservationCounts {
  미확인: number;
  준비중: number;
  완료: number;
  취소: number;
  total: number;
}

const consultApplyLabels: Record<string, { label: string; color: string }> = {
  pending:  { label: "검토 중", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  approved: { label: "승인됨", color: "text-green-600 bg-green-50 border-green-200" },
  rejected: { label: "반려됨", color: "text-red-500 bg-red-50 border-red-200" },
};

function StatusBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${on ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
        {on ? "ON" : "OFF"}
      </span>
    </div>
  );
}

function CheckItem({ ok, label, tab, onNavigate }: { ok: boolean; label: string; tab: string; onNavigate: (t: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(tab)}
      className="flex items-center gap-2.5 w-full text-left hover:opacity-70 transition-opacity"
    >
      {ok ? (
        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      )}
      <span className={`text-sm ${ok ? "text-gray-500 line-through" : "text-gray-700"}`}>{label}</span>
      {!ok && (
        <svg className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

export default function DashboardOverviewTab({ companyId, slug, plan, onNavigate }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [companyPhone, setCompanyPhone] = useState<string | null>(null);
  const [reservationCounts, setReservationCounts] = useState<ReservationCounts>({ 미확인: 0, 준비중: 0, 완료: 0, 취소: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [{ data: s }, { data: company }, { data: reservations }] = await Promise.all([
      supabase
        .from("company_settings")
        .select("consult_enabled, consult_apply_status, business_verified_at, bank_account_image_url, bank_name, bank_account, bank_holder, address, delivery_enabled, message_card_enabled, shopping_bag_enabled")
        .eq("company_id", companyId)
        .single(),
      supabase
        .from("companies")
        .select("phone")
        .eq("id", companyId)
        .single(),
      supabase
        .from("reservations")
        .select("status")
        .eq("company_id", companyId)
        .gte("desired_date", today)
        .lte("desired_date", future30),
    ]);

    if (s) setSettings(s);
    if (company?.phone) setCompanyPhone(company.phone);
    if (reservations) {
      const counts = { 미확인: 0, 준비중: 0, 완료: 0, 취소: 0, total: reservations.length };
      for (const r of reservations) {
        if (r.status === "미확인") counts.미확인++;
        else if (r.status === "준비중") counts.준비중++;
        else if (r.status === "픽업/배송완료") counts.완료++;
        else if (r.status === "취소") counts.취소++;
      }
      setReservationCounts(counts);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="py-16 text-center text-sm text-gray-300">불러오는 중...</div>;

  const hasPhone = !!companyPhone;
  const hasAddress = !!settings?.address;
  const hasBank = !!settings?.bank_name && !!settings?.bank_account && !!settings?.bank_holder;
  const hasBankDoc = !!settings?.bank_account_image_url;
  const hasBusinessVerified = !!settings?.business_verified_at;

  const consultStatus = settings?.consult_apply_status ?? null;
  const consultEnabled = settings?.consult_enabled ?? false;
  const isPro = plan !== "starter";

  const applyBadge = consultStatus ? consultApplyLabels[consultStatus] : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-gray-900">대시보드</h2>

      {/* 메뉴 URL */}
      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">손님 메뉴 링크</p>
          <p className="text-sm text-gray-700 truncate font-mono">{menuUrl}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? "복사됨 ✓" : "URL 복사"}
          </button>
          <Link
            href={`/${slug}`}
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-gold-500 text-white text-xs hover:bg-gold-600 transition-colors"
          >
            미리보기
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 예약 현황 (오늘~30일) */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">예약 현황</h3>
              <p className="text-xs text-gray-400 mt-0.5">오늘부터 30일 이내</p>
            </div>
            <button
              onClick={() => onNavigate("reservations")}
              className="text-xs text-gray-400 hover:text-gold-500 transition-colors"
            >
              관리 →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "미확인", value: reservationCounts.미확인, color: "text-amber-500" },
              { label: "준비중", value: reservationCounts.준비중, color: "text-blue-500" },
              { label: "완료", value: reservationCounts.완료, color: "text-green-600" },
              { label: "취소", value: reservationCounts.취소, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl py-3">
                <p className={`text-lg font-semibold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 기능 ON/OFF */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700">기능 현황</h3>
            <button
              onClick={() => onNavigate("reservation")}
              className="text-xs text-gray-400 hover:text-gold-500 transition-colors"
            >
              설정 →
            </button>
          </div>
          <StatusBadge on={consultEnabled} label="맞춤 주문" />
          <StatusBadge on={settings?.delivery_enabled ?? false} label="배송" />
          <StatusBadge on={settings?.message_card_enabled ?? false} label="메시지 카드" />
          <StatusBadge on={settings?.shopping_bag_enabled ?? false} label="쇼핑백" />
        </div>

        {/* 맞춤 주문 신청 상태 (Pro 전용) */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">맞춤 주문 신청</h3>
              {!isPro && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pro 전용</span>
              )}
              {applyBadge && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${applyBadge.color}`}>
                  {applyBadge.label}
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate("company")}
              className="text-xs text-gray-400 hover:text-gold-500 transition-colors"
            >
              매장 정보 →
            </button>
          </div>

          {!isPro ? (
            <p className="text-xs text-gray-400">Pro 플랜으로 업그레이드하면 맞춤 주문 기능을 사용할 수 있습니다.</p>
          ) : consultStatus === "approved" ? (
            <p className="text-xs text-green-600">승인이 완료되었습니다. 맞춤 주문 탭에서 기능을 활성화할 수 있습니다.</p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-gray-400 mb-3">
                {consultStatus === "pending"
                  ? "운영자 검토 중입니다. 승인 후 맞춤 주문을 활성화할 수 있습니다."
                  : consultStatus === "rejected"
                  ? "반려되었습니다. 아래 항목을 확인하고 다시 신청해주세요."
                  : "아래 항목을 모두 완료한 뒤 맞춤 주문을 신청할 수 있습니다."}
              </p>
              <CheckItem ok={hasPhone} label="매장 전화번호 입력" tab="company" onNavigate={onNavigate} />
              <CheckItem ok={hasAddress} label="매장 주소 입력" tab="company" onNavigate={onNavigate} />
              <CheckItem ok={hasBank} label="계좌 정보 입력 (은행·계좌번호·예금주)" tab="company" onNavigate={onNavigate} />
              <CheckItem ok={hasBankDoc} label="통장사본 업로드" tab="company" onNavigate={onNavigate} />
              <CheckItem ok={hasBusinessVerified} label="사업자등록번호 인증" tab="company" onNavigate={onNavigate} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
