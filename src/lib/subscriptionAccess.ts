// 구독 상태에 따른 사장님 화면 접근
// · 지금 구독 중 (plan 이 none 이 아님 — 무료체험·월간·연간·Free) → 대시보드 모든 기능
// · 구독한 적 있음 (무료체험을 시작했거나 매장 정보를 입력해 매장 주소가 정해짐) + 지금 구독 없음 → 대시보드 '보기 전용'
//   (탭은 옮겨 다니며 보되 내용은 막으로 덮어 누를 수 없고, 내 정보만 쓸 수 있다. 서버·DB도 쓰기를 막는다)
// · 구독한 적 없음 → 구독 페이지 (구독하기 / 회원 탈퇴 두 가지뿐)

/** 구독하지 않은 계정이 쓰기를 시도했을 때 보여 줄 말 (API 응답·DB 오류와 같은 문구) */
export const SUBSCRIPTION_INACTIVE_MESSAGE = "구독하지 않은 계정은 사용할 수 없어요.";
export const SUBSCRIPTION_INACTIVE_CODE = "SUBSCRIPTION_INACTIVE";

/** 지금 구독 중인지 */
export const isActivePlan = (plan: string | null | undefined) => !!plan && plan !== "none";

/** 구독한 적이 있는지 — 무료체험 시작(카드 등록) 기록이 있거나, 매장 정보를 입력해 임시 주소(pending-)가 아닌 매장 */
export const hasEverSubscribed = (slug: string | null | undefined, trialEndsAt: string | null | undefined) =>
  !!trialEndsAt || (!!slug && !slug.startsWith("pending-"));
