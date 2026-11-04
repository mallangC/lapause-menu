"use client";

import { useState } from "react";

// 장바구니·바로 예약 주문의 1단계(선물 정보) — 맞춤주문 1단계와 같은 화면·항목. 사장님이 받는 분에 맞게 제작할 때 참고한다
export interface GiftInfo {
  purpose: string;
  purposeCustom: string;
  recipientGender: string;
  recipientAge: string;
}

export const EMPTY_GIFT_INFO: GiftInfo = { purpose: "", purposeCustom: "", recipientGender: "", recipientAge: "" };

/** 예약 상세·완료 화면 표시용 한 줄 (예: 축하 · 여성 · 30대) */
export const giftInfoText = (g: GiftInfo) =>
  [g.purpose === "기타" ? g.purposeCustom || "기타" : g.purpose, g.recipientGender, g.recipientAge].filter(Boolean).join(" · ");

interface Props {
  value: GiftInfo;
  onChange: React.Dispatch<React.SetStateAction<GiftInfo>>;
  /** 다음 / 건너뛰기 */
  onNext: () => void;
}

// 맞춤주문(ConsultClient) 1단계와 같은 아코디언 — 하나 고르면 다음 항목이 열린다
export default function GiftInfoStep({ value, onChange, onNext }: Props) {
  const [active, setActive] = useState(0);
  // 이전 값 기준으로 합친다 (빠르게 연달아 눌러도 앞서 고른 항목이 지워지지 않게)
  const set = (patch: Partial<GiftInfo>) => onChange((prev) => ({ ...prev, ...patch }));

  const sections = [
    {
      title: "선물 목적",
      selected: value.purpose,
      displayValue: value.purpose === "기타" ? (value.purposeCustom || "기타") : value.purpose,
      options: ["기념", "축하", "감사", "위로", "데이트", "기타"],
      onSelect: (v: string) => {
        onChange((prev) => ({ ...prev, purpose: v, purposeCustom: v === "기타" ? prev.purposeCustom : "" }));
        if (v !== "기타") setActive(1);
      },
      extra: value.purpose === "기타" ? (
        <div className="px-4 pt-3 pb-4">
          <input
            type="text"
            placeholder="직접 입력"
            value={value.purposeCustom}
            onChange={(e) => set({ purposeCustom: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)] placeholder:text-gray-400"
            autoFocus
          />
        </div>
      ) : null,
    },
    {
      title: "성별",
      selected: value.recipientGender,
      displayValue: value.recipientGender,
      options: ["여성", "남성"],
      onSelect: (v: string) => { set({ recipientGender: v }); setActive(2); },
      extra: null,
    },
    {
      title: "받는 분 연령대",
      selected: value.recipientAge,
      displayValue: value.recipientAge,
      options: ["10대 이하", "10대", "20대", "30대", "40대", "50대 이상"],
      onSelect: (v: string) => { set({ recipientAge: v }); setActive(3); },
      extra: null,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="bg-white -mx-4 px-5 py-3.5 md:mx-0 md:rounded-xl">
        <p className="text-sm text-gray-600 text-center">선물 목적과 받는 분 정보를 알려주시면<br/>더 잘 어울리는 꽃을 준비해드릴 수 있어요.</p>
      </div>
      <div className="bg-white -mx-4 md:mx-0 md:rounded-xl overflow-hidden divide-y divide-gray-200">
        {sections.map((section, idx) => {
          const isOpen = active === idx;
          const isDone = !!section.selected && !isOpen;

          return (
            <div key={section.title} className="overflow-hidden" data-gift-section={idx}>
              <button
                type="button"
                onClick={() => setActive(isOpen ? -1 : idx)}
                className="w-full flex items-center justify-between px-4 py-4 text-left bg-gray-50"
              >
                <span className="text-[15px] font-semibold text-gray-700">{section.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {isDone && <span className="text-sm text-gold-600 font-medium">{section.displayValue}</span>}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 300ms ease-in-out" }}>
                <div className="overflow-hidden">
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {section.options.map((opt) => (
                      <button
                        key={opt}
                        data-gift-opt={opt}
                        type="button"
                        onClick={() => section.onSelect(opt)}
                        className={`w-full flex items-center justify-between pl-8 pr-4 py-3.5 text-left transition-colors ${section.selected === opt ? "bg-[color-mix(in_srgb,var(--color-gold-500)_8%,#fff)]" : "hover:bg-gray-50"}`}
                      >
                        <span className={`text-sm ${section.selected === opt ? "text-gold-600 font-medium" : "text-gray-800"}`}>{opt}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${section.selected === opt ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                          {section.selected === opt && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {section.extra}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sections.some((s) => !!s.selected) ? (
        <button type="button" onClick={onNext} className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 transition-colors">
          다음
        </button>
      ) : (
        <button type="button" onClick={onNext} data-gift-skip className="w-full py-3.5 rounded-xl font-medium text-gray-400 text-sm transition-colors">
          <span>건너뛰기</span>
        </button>
      )}
    </div>
  );
}

/** 주문 단계 표시줄 — 맞춤주문과 같은 모양 (1 선물 정보 · 2 예약 확인) */
export function OrderStepBar({ step, onBack }: { step: 1 | 2; onBack: () => void }) {
  return (
    <div className="sticky top-14 md:top-20 z-30 border-b border-gray-100 bg-white">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
        {([{ num: 1 as const, label: "선물 정보" }, { num: 2 as const, label: "예약 확인" }]).map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-2">
            {i > 0 && <div className="flex-1 h-px bg-gray-200 w-8" />}
            <button
              type="button"
              onClick={() => step > num && onBack()}
              className={`flex items-center gap-1.5 ${step === num ? "text-gold-500" : step > num ? "text-gray-400 cursor-pointer hover:text-gold-400" : "text-gray-300 cursor-default"}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === num ? "bg-gold-500 text-white" : step > num ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-300"}`}>
                {step > num ? "✓" : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
