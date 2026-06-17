"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProductForm from "@/components/admin/ProductForm";
import { ProductInput } from "@/types";

interface Props {
  slug: string;
  companyId: string;
  plan: string;
}

type StepId = "consult" | "product";

function getSteps(plan: string): StepId[] {
  if (plan === "pro") return ["consult", "product"];
  return ["product"];
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i <= current ? "bg-gold-500" : "bg-beige-300"
          }`}
        />
      ))}
    </div>
  );
}

function ConsultStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </div>

      <h2 className="text-lg font-medium text-gray-900 mb-2">맞춤 주문 신청하기</h2>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-sm">
        고객이 꽃다발·화환 등을 직접 예약·결제할 수 있는 맞춤 주문 기능을 활성화하려면 사전 심사가 필요해요.
      </p>

      <div className="w-full bg-beige-50 border border-beige-200 rounded-xl p-5 mb-6 text-left space-y-3">
        <p className="text-xs font-semibold text-gray-600 tracking-wide uppercase mb-1">신청에 필요한 서류</p>
        {[
          "사업자등록번호 인증",
          "통장사본 업로드",
          "정산 계좌 정보 입력",
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
            <div className="w-5 h-5 rounded-full bg-gold-500/10 flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {item}
          </div>
        ))}
      </div>

      <div className="w-full space-y-2.5">
        <button
          onClick={onNext}
          className="w-full bg-gold-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
        >
          지금 설정하러 가기
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          나중에 하기
        </button>
      </div>
    </div>
  );
}

function ProductStep({
  companyId,
  onDone,
  onSkip,
  isLastStep,
}: {
  companyId: string;
  onDone: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (data: ProductInput) => {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("products")
      .insert({ ...data, company_id: companyId });
    setSaving(false);
    if (err) {
      setError("상품 저장에 실패했습니다: " + err.message);
      return;
    }
    onDone();
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-1">첫 상품 등록하기</h2>
        <p className="text-sm text-gray-500">메뉴에 표시될 상품을 하나 등록해 보세요.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <ProductForm
        onSubmit={handleSubmit}
        onCancel={onSkip}
        companyId={companyId}
      />

      <button
        type="button"
        onClick={onSkip}
        disabled={saving}
        className="w-full mt-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
      >
        {isLastStep ? "나중에 하기" : "건너뛰기"}
      </button>
    </div>
  );
}

export default function OnboardingClient({ slug, companyId, plan }: Props) {
  const router = useRouter();
  const steps = getSteps(plan);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(`onboarding_done_${slug}`);
    if (done) router.replace(`/${slug}/admin/dashboard`);
  }, [slug, router]);

  const finish = (tab?: string) => {
    localStorage.setItem(`onboarding_done_${slug}`, "1");
    router.push(tab ? `/${slug}/admin/dashboard?tab=${tab}` : `/${slug}/admin/dashboard`);
  };

  const advance = () => setStepIndex((i) => i + 1);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gold-500 mb-1">
            {plan === "pro" ? "Pro" : "Starter"}
          </p>
          <h1 className="text-xl font-light tracking-widest text-gray-900">시작 설정</h1>
          <p className="text-sm text-gray-400 mt-1">
            단계 {stepIndex + 1} / {steps.length}
          </p>
        </div>

        <ProgressDots total={steps.length} current={stepIndex} />

        <div className="bg-beige-50 border border-beige-200 rounded-2xl p-8 shadow-sm">
          {currentStep === "consult" && (
            <ConsultStep
              onNext={() => finish("company")}
              onSkip={advance}
            />
          )}
          {currentStep === "product" && (
            <ProductStep
              companyId={companyId}
              onDone={() => finish()}
              onSkip={() => finish()}
              isLastStep={isLastStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}
