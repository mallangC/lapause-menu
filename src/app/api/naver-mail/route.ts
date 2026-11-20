import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logReservationChange } from "@/lib/reservationLog";
import { mailHtmlToText, naverMailKeyOf, parseNaverMail } from "@/lib/naverMail";

export const dynamic = "force-dynamic";

// 네이버 예약 메일 받기 — Cloudflare 이메일 라우팅 → 워커(email) → 여기 (내부 비밀값으로만)
// · 예약 확정 메일 → 예약 추가 (채널 네이버 · 준비중 · 연락처 없음 · 손님 알림톡 없음 · 정산 제외)
// · 고객 취소 메일 → 같은 예약번호의 예약을 취소 (환불은 네이버가 이미 했다 — 우리 쪽 환불 없음)
// · 그 외·처리 못 한 메일 → '확인이 필요한 네이버 메일'로 보관 (사장님 메일함을 거치지 않으니 버리지 않는다)

interface Body {
  to?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
}

/** 네이버가 보낸 메일인지 (보낸 주소 도메인) */
const fromNaver = (from: string) => /@([a-z0-9-]+\.)*(naver\.com|navercorp\.com)>?\s*$/i.test(from.trim());
const norm = (s: string) => s.replace(/\s+/g, "");

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = ((await request.json().catch(() => null)) ?? {}) as Body;
  const key = naverMailKeyOf(body.to ?? "");
  if (!key) return NextResponse.json({ ok: false, reason: "unknown address" });

  const db = createAdminClient();
  const { data: setting } = await db.from("company_settings").select("company_id").eq("naver_mail_key", key).maybeSingle();
  if (!setting) return NextResponse.json({ ok: false, reason: "unknown store" });
  const companyId = setting.company_id as string;

  // 네이버가 아닌 곳에서 온 메일은 예약으로 만들지 않는다 (가짜 예약 방지)
  if (!fromNaver(body.from ?? "")) {
    console.warn("[naver-mail] 네이버가 아닌 발신자:", body.from);
    return NextResponse.json({ ok: false, reason: "not from naver" });
  }

  // 연결 상태 — 마지막으로 받은 시각
  await db.from("company_settings").update({ naver_mail_last_at: new Date().toISOString() }).eq("company_id", companyId);

  const text = (body.text && body.text.trim()) || mailHtmlToText(body.html ?? "");
  const mail = parseNaverMail(text);
  const keep = async (reason: string) => {
    await db.from("naver_mail_inbox").insert({ company_id: companyId, subject: body.subject ?? null, body: text.slice(0, 20000), reason });
    console.warn(`[naver-mail] ${companyId} 확인 필요: ${reason}`);
    return NextResponse.json({ ok: true, kept: reason });
  };

  // 메일 속 매장 이름이 이 주소의 매장과 다르면 (주소를 잘못 넣은 경우 등) 바로 넣지 않는다
  const { data: company } = await db.from("companies").select("name").eq("id", companyId).single();
  if (mail.storeName && company?.name && norm(mail.storeName) !== norm(company.name)) {
    return keep(`메일의 매장 이름(${mail.storeName})이 이 매장과 달라요`);
  }

  if (mail.kind === "confirm") {
    if (!mail.bookingId || !mail.date) return keep("예약번호나 이용일시를 읽지 못했어요");
    const { data: dup } = await db.from("reservations").select("id").eq("company_id", companyId).eq("naver_booking_id", mail.bookingId).maybeSingle();
    if (dup) return NextResponse.json({ ok: true, duplicate: true });

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
    });
    if (error) {
      // 같은 메일이 동시에 두 번 들어온 경우 (예약번호 중복) — 이미 있으니 괜찮다
      if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
      console.error("[naver-mail] 예약 추가 실패:", error.message);
      return keep(`예약을 추가하지 못했어요 (${error.message})`);
    }
    return NextResponse.json({ ok: true, created: true });
  }

  if (mail.kind === "cancel") {
    if (!mail.bookingId) return keep("취소 메일의 예약번호를 읽지 못했어요");
    const { data: r } = await db.from("reservations").select("id, status").eq("company_id", companyId).eq("naver_booking_id", mail.bookingId).maybeSingle();
    if (!r) return keep(`취소할 예약(예약번호 ${mail.bookingId})을 찾지 못했어요`);
    if (r.status === "취소") return NextResponse.json({ ok: true, already: true });
    const reason = `고객 취소 (네이버)${mail.cancelReason ? ` · ${mail.cancelReason}` : ""}${mail.refundAmount != null ? ` · 환불 ${mail.refundAmount.toLocaleString()}원` : ""}`;
    const { error } = await db.from("reservations").update({ status: "취소", cancel_reason: reason }).eq("id", r.id);
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
    return NextResponse.json({ ok: true, cancelled: true });
  }

  return keep("예약 확정·취소 메일이 아니에요");
}
