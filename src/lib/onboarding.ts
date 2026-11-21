// 시작 설정(대화형 온보딩) 질문 순서 — 시작 설정 화면과 대시보드 '이어서 하기' 카드가 함께 쓴다.
// 질문은 하나씩, 묶음 단위로 진행 막대를 보여준다.
//   메뉴판 열기: 매장 정보 → 영업시간 → 첫 상품 → 메뉴판 완성(링크 · 네이버 예약 연동)
//   판매 시작하기: 판매 신청(사업자·계좌·서류) → 판매 준비(준비 시간·영업시간 외 수령·배송·추가 옵션·안내 문구·판매 켜기)
// 대화를 끝까지 하면 승인만 남는다 — '승인되면 바로 시작'을 고르면 승인 순간 판매가 켜진다.
// company_settings.onboarding_step에는 마지막으로 보던 질문 id를 저장한다.

export const ONBOARDING_SECTIONS = ["info", "hours", "product", "ready", "apply", "setup"] as const;
export type OnboardingSection = (typeof ONBOARDING_SECTIONS)[number];

export const ONBOARDING_QUESTIONS = [
  { id: "phone", section: "info" },
  { id: "address", section: "info" },
  { id: "parking", section: "info" },
  { id: "open", section: "hours" },
  { id: "closed", section: "hours" },
  { id: "product", section: "product" },
  { id: "ready", section: "ready" },
  { id: "naver", section: "ready" },
  { id: "sales", section: "apply" },
  { id: "contact", section: "apply" },
  { id: "bizno", section: "apply" },
  { id: "bizdoc", section: "apply" },
  { id: "bank", section: "apply" },
  { id: "bankdoc", section: "apply" },
  { id: "mailorder", section: "apply" },
  { id: "submit", section: "apply" },
  { id: "lead", section: "setup" },
  { id: "afterhours", section: "setup" },
  { id: "delivery", section: "setup" },
  { id: "fees", section: "setup" },
  { id: "options", section: "setup" },
  { id: "notice", section: "setup" },
  { id: "golive", section: "setup" },
  { id: "done", section: "setup" },
] as const satisfies readonly { id: string; section: OnboardingSection }[];

export type OnboardingQuestionId = (typeof ONBOARDING_QUESTIONS)[number]["id"];

/** 저장된 단계(질문 id, 예전 묶음 id)가 몇 번째 묶음인지 — 모르면 0 */
export function onboardingSectionIndex(step: string | null | undefined): number {
  if (!step) return 0;
  // 예전에 묶음 이름으로 저장한 'sales'는 판매 신청 묶음
  const q = ONBOARDING_QUESTIONS.find((x) => x.id === step);
  const section = q ? q.section : step;
  return Math.max(0, ONBOARDING_SECTIONS.indexOf(section as OnboardingSection));
}
