/** 전화번호 포맷 (표시용): 010-1234-5678 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 5) return digits;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 6) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 전화번호 파싱 (저장용): 숫자만 */
export function parsePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** 금액 포맷 (표시용): 10,000 */
export function formatMoney(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

/** 금액 파싱 (저장용): 숫자만 */
export function parseMoney(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}
