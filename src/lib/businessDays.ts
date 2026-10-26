// 토·일요일을 제외한 영업일 기준으로 n일 전 날짜를 계산합니다. (공휴일은 고려하지 않음)
export function subtractBusinessDays(from: Date, n: number): Date {
  const result = new Date(from);
  let remaining = n;
  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const day = result.getDay(); // 0: 일요일, 6: 토요일
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}
