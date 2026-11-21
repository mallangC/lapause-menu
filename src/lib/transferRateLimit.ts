import type { SupabaseClient } from "@supabase/supabase-js";

// IP별 횟수 제한 — 공개 API를 자동으로 대량 호출하지 못하게 (사진 가격 기능의 횟수 제한 함수를 이름표만 바꿔 같이 쓴다)
// 확인이 실패하면 막지 않는다 (진짜 손님이 막히지 않게)

const ipOf = (request: Request) =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

export async function ipAllowed(admin: SupabaseClient, request: Request, key: string, perMinute: number, perDay: number): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("photo_price_take", { p_ip: `${key}:${ipOf(request)}`, p_per_minute: perMinute, p_per_day: perDay });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** 무통장 입금 주문 — 결제 없이 접수되고 주문마다 사장님께 알림톡이 나가 1분 3건·하루 10건 */
export const transferOrderAllowed = (admin: SupabaseClient, request: Request) => ipAllowed(admin, request, "transfer", 3, 10);
