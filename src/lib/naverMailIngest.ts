import { reportOpsAlert } from "@/lib/opsAlert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logReservationChange } from "@/lib/reservationLog";
import { parseNaverMail } from "@/lib/naverMail";

// 네이버 예약 메일 처리 (서버 전용) — 메일 받기(/api/naver-mail)와 '다시 읽기'(/api/naver-mail/retry)가 함께 쓴다
// · 예약 확정 → 예약 추가 (채널 네이버 · 준비중 · 연락처 없음 · 손님 알림톡 없음 · 정산 제외)
// · 고객 취소 → 같은 예약번호의 예약을 취소 (환불은 네이버가 이미 했다)
// · 그 외·처리 못 함 → '확인이 필요한 네이버 메일' (inboxId가 있으면 그 칸의 사유만 바꾼다)

export type NaverMailResult = { ok: true; created?: boolean; cancelled?: boolean; duplicate?: boolean; already?: boolean; kept?: string };

const norm = (s: string) => s.replace(/\s+/g, "");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processNaverMail(db: SupabaseClient<any, any, any>, companyId: string, mailText: string, opts: { subject?: string | null; inboxId?: string } = {}): Promise<NaverMailResult> {
  const text = mailText;
  const mail = parseNaverMail(text);
  const keep = async (reason: string): Promise<NaverMailResult> => {
    if (opts.inboxId) await db.from("naver_mail_inbox").update({ reason }).eq("id", opts.inboxId);
    else {
      await db.from("naver_mail_inbox").insert({ company_id: companyId, subject: opts.subject ?? null, body: text.slice(0, 20000), reason });
      // 운영자에게 알림 — 메일 형식이 바뀌었을 수 있다 (사장님이 '다시 읽기'로 다시 시도한 건 이미 알린 메일이라 빼고)
      await reportOpsAlert(db, {
        kind: "naver_mail",
        companyId,
        title: "네이버 예약 메일 자동 처리 실패",
        detail: `${reason}${opts.subject ? ` · 제목: ${opts.subject}` : ""}`,
      });
    }
    console.warn(`[naver-mail] ${companyId} 확인 필요: ${reason}`);
    return { ok: true, kept: reason };
  };

  // 메일 속 매장 이름이 이 주소의 매장과 다르면 (주소를 잘못 넣은 경우 등) 바로 넣지 않는다
  const { data: company } = await db.from("companies").select("name").eq("id", companyId).single();
  if (mail.storeName && company?.name && norm(mail.storeName) !== norm(company.name)) {
    return keep(`메일의 매장 이름(${mail.storeName})이 이 매장과 달라요`);
  }

  if (mail.kind === "confirm") {
    if (!mail.bookingId || !mail.date) return keep("예약번호나 이용일시를 읽지 못했어요");
    const { data: dup } = await db.from("reservations").select("id").eq("company_id", companyId).eq("naver_booking_id", mail.bookingId).maybeSingle();
    if (dup) return { ok: true, duplicate: true };

    const items = (mail.items.length ? mail.items : [{ name: mail.productType ?? "네이버 예약", quantity: 1, amount: mail.amount ?? 0 }]).map((i) => ({
      type: mail.productType ?? "기타",
      name: i.name,
      // 한 개 값 (메일 금액은 수량만큼 더한 값)
      price: Math.round(i.amount / Math.max(1, i.quantity)),
      quantity: i.quantity,
      product_id: null,
      message_card: "없음",
      message_card_content: null,
      shopping_bag: "없음",
      preservative: "없음",
      memo: null,
    }));
    const requests = [
      mail.requests,
      mail.extras.length ? `네이버 옵션: ${mail.extras.join(", ")}` : null,
      mail.payMethod ? `네이버 결제: ${mail.payMethod}` : null,
    ].filter(Boolean).join("\n");
    const { error } = await db.from("reservations").insert({
      company_id: companyId,
      status: "준비중",
      channel: "네이버",
      orderer_name: mail.name ?? "네이버 예약",
      orderer_phone: null,
      items,
      quantity: items.reduce((s, i) => s + i.quantity, 0),
      paid: mail.paid,
      paid_at: mail.paid ? new Date().toISOString() : null,
      final_price: mail.amount ?? 0,
      delivery_type: "픽업",
      desired_date: mail.date,
      desired_time: mail.time,
      requests: requests || null,
      order_path: "manual",
      after_hours_pickup: false,
      naver_booking_id: mail.bookingId,
      // 사장님이 열어 볼 때까지 '확인 필요' (자동으로 들어와 놓치지 않게)
      naver_unchecked: true,
    });
    if (error) {
      // 같은 메일이 동시에 두 번 들어온 경우 (예약번호 중복) — 이미 있으니 괜찮다
      if (error.code === "23505") return { ok: true, duplicate: true };
      console.error("[naver-mail] 예약 추가 실패:", error.message);
      return keep(`예약을 추가하지 못했어요 (${error.message})`);
    }
    return { ok: true, created: true };
  }

  if (mail.kind === "cancel") {
    if (!mail.bookingId) return keep("취소 메일의 예약번호를 읽지 못했어요");
    const { data: r } = await db.from("reservations").select("id, status").eq("company_id", companyId).eq("naver_booking_id", mail.bookingId).maybeSingle();
    if (!r) return keep(`취소할 예약(예약번호 ${mail.bookingId})을 찾지 못했어요`);
    if (r.status === "취소") return { ok: true, already: true };
    const reason = `고객 취소 (네이버)${mail.cancelReason ? ` · ${mail.cancelReason}` : ""}${mail.refundAmount != null ? ` · 환불 ${mail.refundAmount.toLocaleString()}원` : ""}`;
    // 취소도 사장님이 확인할 때까지 '확인 필요'
    const { error } = await db.from("reservations").update({ status: "취소", cancel_reason: reason, naver_unchecked: true }).eq("id", r.id);
    if (error) return keep(`예약을 취소하지 못했어요 (${error.message})`);
    await logReservationChange({
      reservationId: r.id,
      companyId,
      actorUserId: null,
      action: "status_change",
      field: "status",
      oldValue: r.status,
      newValue: "취소",
      reason,
    });
    return { ok: true, cancelled: true };
  }

  return keep("예약 확정·취소 메일이 아니에요");
}
