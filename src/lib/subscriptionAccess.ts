// 구독 상태에 따른 사장님 화면 접근
// · 지금 구독 중 (plan 이 none 이 아님 — 카드 없는 무료체험(trial)·월간·연간·Free) → 대시보드 모든 기능
// · 구독한 적 있음 (무료체험을 시작했거나 매장 정보를 입력해 매장 주소가 정해짐) + 지금 구독 없음 → 대시보드 '보기 전용'
//   (탭은 옮겨 다니며 보되 내용은 막으로 덮어 누를 수 없고, 내 정보만 쓸 수 있다. 서버·DB도 쓰기를 막는다)
// · 매장 정보를 아직 입력하지 않음 (임시 주소 pending-) → 매장 정보 입력(/setup). 입력을 마치면 카드 없이 무료체험 시작

/** company_subscriptions.plan — trial: 카드 없이 쓰는 무료체험 (카드를 등록하면 monthly/annual 로 바뀌고 체험 끝나는 날 첫 결제) */
export type Plan = "none" | "free" | "trial" | "monthly" | "annual";

/** 구독하지 않은 계정이 쓰기를 시도했을 때 보여 줄 말 (API 응답·DB 오류와 같은 문구) */
export const SUBSCRIPTION_INACTIVE_MESSAGE = "구독하지 않은 계정은 사용할 수 없어요.";
export const SUBSCRIPTION_INACTIVE_CODE = "SUBSCRIPTION_INACTIVE";

/** 지금 구독 중인지 */
export const isActivePlan = (plan: string | null | undefined) => !!plan && plan !== "none";

/** 구독한 적이 있는지 — 무료체험 시작 기록이 있거나, 매장 정보를 입력해 임시 주소(pending-)가 아닌 매장 */
export const hasEverSubscribed = (slug: string | null | undefined, trialEndsAt: string | null | undefined) =>
  !!trialEndsAt || (!!slug && !slug.startsWith("pending-"));

/** 무료체험이 이 날 수 이하로 남으면 안내 띠·요금제 안내를 붉게 */
export const TRIAL_WARN_DAYS = 7;

/** 무료체험 남은 날 (끝났거나 체험이 없으면 0) — 남은 시간을 하루 단위로 올림 */
export const trialDaysLeft = (trialEndsAt: string | null | undefined, now: Date = new Date()) =>
  trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000)) : 0;
