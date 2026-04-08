"use client";

import { useRouter } from "next/navigation";
import BillingKeyFlow from "@/components/BillingKeyFlow";

interface Props {
  companyId: string;
  slug: string;
  customerName: string;
}

const CHECK_ICON = (
  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PlanSelectClient({ companyId, slug, customerName }: Props) {
  const router = useRouter();
  const handleSuccess = () => router.push(`/${slug}/admin/dashboard`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* Starter */}
      <div className="bg-white border border-beige-200 rounded-2xl p-7 flex flex-col">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">Starter</p>
        <div className="mb-1">
          <span className="text-[2.2rem] font-semibold text-gray-900 leading-none">₩4,900</span>
          <span className="text-sm text-gray-400 ml-1.5">/ 월</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">전자 메뉴판으로 간편하게 시작</p>
        <p className="text-xs font-semibold text-gold-500 mb-6">첫 30일 Pro 무료 체험 포함</p>

        <ul className="space-y-3 mb-8 flex-1">
          {[
            "전자 메뉴판 운영",
            "나만의 가게 링크 (flo-aide.com/내가게)",
            "모바일 최적화 상품 페이지",
            "로고·테마 커스터마이징",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span style={{ color: "#9ca3af" }}>{CHECK_ICON}</span>
              <span style={{ color: "#374151" }}>{text}</span>
            </li>
          ))}
        </ul>

        <BillingKeyFlow
          companyId={companyId}
          customerName={customerName}
          subscriptionPlan="starter"
          onSuccess={handleSuccess}
          buttonLabel="30일 무료 체험 시작"
          buttonClassName="w-full py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:border-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        />
        <p className="text-[10px] text-gray-400 text-center mt-2">체험 후 월 ₩4,900 자동 결제</p>
      </div>

      {/* Pro */}
      <div className="bg-white border-2 border-gold-400 rounded-2xl p-7 flex flex-col relative">
        <div className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-gold-400/15 text-gold-600">
          추천
        </div>
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gold-500 mb-4">Pro</p>
        <div className="mb-1">
          <span className="text-[2.2rem] font-semibold text-gray-900 leading-none">₩9,900</span>
          <span className="text-sm text-gray-400 ml-1.5">/ 월</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">맞춤 주문과 예약까지 한번에</p>
        <p className="text-xs font-semibold text-gold-500 mb-6">첫 30일 무료 체험</p>

        <ul className="space-y-3 mb-8 flex-1">
          {[
            { text: "Starter 플랜 모든 기능 포함", gold: false },
            { text: "맞춤 주문 & 예약 관리", gold: false },
            { text: "매출·예약 통계", gold: false },
            { text: "카카오 예약 알림 자동 발송", gold: false },
            { text: "결제 수수료 0% (카드 수수료 별도)", gold: true },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span style={{ color: item.gold ? "#b8934a" : "#9ca3af" }}>{CHECK_ICON}</span>
              <span style={{ color: item.gold ? "#9a7a3a" : "#374151" }}>{item.text}</span>
            </li>
          ))}
        </ul>

        <BillingKeyFlow
          companyId={companyId}
          customerName={customerName}
          subscriptionPlan="pro"
          onSuccess={handleSuccess}
          buttonLabel="30일 무료 체험 시작"
        />
        <p className="text-[10px] text-gray-400 text-center mt-2">체험 후 월 ₩9,900 자동 결제</p>
      </div>
    </div>
  );
}
