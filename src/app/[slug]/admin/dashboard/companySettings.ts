// 대시보드 탭들이 공유하는 매장 설정(company_settings 행 + company_phone: companies.phone).
// 서버 page.tsx에서 한 번 조회해 내려주고, 각 탭은 DB를 다시 조회하지 않고 이 값을 사용한다.
// 탭에서 저장하면 DashboardClient의 onSettingsSaved로 공유 값도 갱신해 다른 탭에 바로 반영된다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CompanySettings = Record<string, any>;

// 브라우저로 내려보내지 않는 컬럼 (암호화된 주민번호 등)
export const SERVER_ONLY_SETTINGS_KEYS = ["resident_number_enc"];

export function toClientSettings(row: Record<string, unknown> | null | undefined): CompanySettings {
  const settings: CompanySettings = { ...(row ?? {}) };
  for (const key of SERVER_ONLY_SETTINGS_KEYS) delete settings[key];
  return settings;
}
