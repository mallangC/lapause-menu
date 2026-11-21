"use client";

import { useState } from "react";
import { inquiryItems, type InquirySettings } from "@/lib/inquiryChecklist";
import type { CompanySettings } from "./companySettings";

// 대시보드 — 손님 문의 줄이기
// 기능마다 '켜면 사라지는 손님 질문'을 함께 보여 줘서, 아직 안 켠 기능을 켜고 싶게 만든다.
// 안 켠 기능을 위에, 켠 기능은 아래에 회색으로. 줄을 누르면 그 설정 탭으로 간다.

// 판단 기준은 운영자 활용도 요약과 같다 (lib/inquiryChecklist)
// 오늘 꽃 색상 기능을 꺼 둔 매장은 그 항목을 빼요 (쓰지 않기로 한 것)
const buildItems = (s: CompanySettings) => inquiryItems(s as InquirySettings).filter((i) => !i.off);

export default function InquiryChecklist({ settings, onNavigate }: { settings: CompanySettings; onNavigate: (tab: string) => void }) {
  const items = buildItems(settings);
  const onCount = items.filter((i) => i.on).length;
  // 안 켠 것을 먼저
  const sorted = [...items].sort((a, b) => Number(a.on) - Number(b.on));
  // 다 채우면 목록을 접어 둔다 (제목 줄을 눌러 펼치기) — 덜 채웠으면 늘 펼쳐서 보여준다
  const allDone = onCount === items.length;
  const [open, setOpen] = useState(false);
  const showList = !allDone || open;

  return (
    <div className="bg-white py-4 px-4 md:rounded-2xl md:px-5 md:col-span-2">
      {/* 제목 줄 — 다 채웠으면 눌러서 목록을 펼치고 접는다 */}
      <button
        type="button"
        onClick={() => allDone && setOpen((v) => !v)}
        aria-expanded={showList}
        className={`w-full flex items-end justify-between gap-3 text-left ${showList ? "mb-3" : ""} ${allDone ? "cursor-pointer" : "cursor-default"}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-700">손님 문의 줄이기</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {allDone ? "모두 활성화하셨어요 · 손님이 묻기 전에 화면에서 알려줘요" : "활성화할수록 손님이 전화·DM으로 묻는 일이 줄어요"}
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-gold-600 tabular-nums">
          {onCount}/{items.length}
          {allDone && (
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showList ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </span>
      </button>
      {showList && (
        <>
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
              {!i.on && <span className="shrink-0 text-xs text-gray-400 group-hover:text-gold-500 transition-colors">활성화 →</span>}
            </button>
          </li>
        ))}
      </ul>
        </>
      )}
    </div>
  );
}
