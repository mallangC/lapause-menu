"use client";

import { hasAnySizeTier, normalizeSizeConfig } from "@/lib/sizeTiers";
import { isTodayColorsDecided } from "@/lib/todayColors";
import type { CompanySettings } from "./companySettings";

// 대시보드 — 손님 문의 줄이기
// 기능마다 '켜면 사라지는 손님 질문'을 함께 보여 줘서, 아직 안 켠 기능을 켜고 싶게 만든다.
// 안 켠 기능을 위에, 켠 기능은 아래에 회색으로. 줄을 누르면 그 설정 탭으로 간다.

interface Item {
  label: string;
  /** 켜면 사라지는 손님 질문 */
  question: string;
  on: boolean;
  /** 설정할 탭 */
  tab: string;
  /** 여러 개를 다 채워야 켜지는 항목 — [채운 수, 전체] */
  progress?: [number, number];
}

function buildItems(s: CompanySettings): Item[] {
  const fees = (s.delivery_fees ?? {}) as Record<string, number | null>;
  const hasFee = Object.values(fees).some((v) => v != null);
  return [
    { label: "배송 기능 · 배송비", question: "“배송 돼요? 배송비 얼마예요?”", on: !!s.delivery_enabled && hasFee, tab: "reservation" },
    { label: "맞춤 주문", question: "“이 예산으로 어떤 꽃이 돼요?”", on: !!s.consult_enabled, tab: "reservation" },
    { label: "크기 기준", question: "“이거 크기 어느 정도예요?”", on: hasAnySizeTier(normalizeSizeConfig(s.size_tiers)), tab: "reservation" },
    { label: "오늘 들어온 꽃 색상", question: "“오늘 무슨 색 꽃 있어요?”", on: isTodayColorsDecided(s) && (s.today_colors ?? []).length > 0, tab: "dashboard" },
    { label: "추가 옵션 (카드·쇼핑백·연장제)", question: "“메시지 카드 써주세요? 쇼핑백 있어요?”", on: !!(s.message_card_enabled || s.shopping_bag_enabled || s.preservative_enabled), tab: "reservation" },
    { label: "영업시간 외 수령", question: "“일찍·늦게 찾아가도 돼요?”", on: !!s.after_hours_enabled, tab: "business" },
    (() => {
      // 매장 위치·주차 정보 — 둘 다 채워야 체크
      const done = Number(!!s.location_url) + Number(!!s.parking);
      return { label: "매장 위치 · 주차 정보", question: "“매장 어디예요? 주차 돼요?”", on: done === 2, tab: "company", progress: [done, 2] as [number, number] };
    })(),
  ];
}

export default function InquiryChecklist({ settings, onNavigate }: { settings: CompanySettings; onNavigate: (tab: string) => void }) {
  const items = buildItems(settings);
  const onCount = items.filter((i) => i.on).length;
  // 안 켠 것을 먼저
  const sorted = [...items].sort((a, b) => Number(a.on) - Number(b.on));

  return (
    <div className="bg-white py-4 px-4 md:rounded-2xl md:px-5 md:col-span-2">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">손님 문의 줄이기</h3>
          <p className="text-xs text-gray-400 mt-0.5">켜 둘수록 손님이 전화·DM으로 묻는 일이 줄어요</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-gold-600 tabular-nums">
          {onCount}/{items.length}
        </span>
      </div>
      {/* 진행 막대 */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
        <div className="h-full bg-gold-500 rounded-full transition-all" style={{ width: `${(onCount / items.length) * 100}%` }} />
      </div>
      <ul className="divide-y divide-gray-50">
        {sorted.map((i) => (
          <li key={i.label}>
            <button
              type="button"
              // 오늘 꽃 색상은 같은 화면의 카드로 스크롤, 나머지는 그 설정 탭으로
              onClick={() =>
                i.tab === "dashboard"
                  ? document.getElementById("today-colors")?.scrollIntoView({ behavior: "smooth", block: "center" })
                  : onNavigate(i.tab)
              }
              className="w-full flex items-center gap-3 py-2.5 text-left group"
            >
              <span
                className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${i.on ? "bg-gold-500 text-white" : "border-2 border-gray-200"}`}
                aria-label={i.on ? "켜짐" : "꺼짐"}
              >
                {i.on && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm ${i.on ? "text-gray-400" : "text-gray-800 font-medium"}`}>
                  {i.label}
                  {i.progress && !i.on && <span className="ml-1.5 text-xs font-normal text-gold-600 tabular-nums">{i.progress[0]}/{i.progress[1]}</span>}
                </span>
                <span className={`block text-xs mt-0.5 break-keep ${i.on ? "text-gray-300 line-through" : "text-gray-500"}`}>{i.question}</span>
              </span>
              {!i.on && <span className="shrink-0 text-xs text-gray-400 group-hover:text-gold-500 transition-colors">켜기 →</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
