import { blockIfInactive } from "@/lib/requireActiveCompany";
import { reportOpsAlert } from "@/lib/opsAlert";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productTypeSummary, sendReservationReceived, sendReservationCancelled } from "@/lib/solapi";
import { logReservationChange } from "@/lib/reservationLog";

// 결제 시점에 따라 승인에 쓰인 시크릿 키가 다를 수 있어(위젯 전환 이전/이후), 위젯 키로 먼저 시도하고
// 키 인증 오류(401)일 때만 구버전 API 개별 연동 키로 재시도한다.
async function tossCancelPayment(paymentId: string, cancelReason: string) {
  const keys = [process.env.TOSS_WIDGET_SECRET_KEY, process.env.TOSS_SECRET_KEY].filter(
    (k): k is string => !!k
  );
  let lastData: unknown = null;
  for (const key of keys) {
    const encodedKey = Buffer.from(`${key}:`).toString("base64");
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Basic ${encodedKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason }),
    });
    if (res.ok) return { ok: true as const };
    const data = await res.json().catch(() => ({}));
    if ((data as { code?: string })?.code === "ALREADY_CANCELED") return { ok: true as const };
    lastData = data;
    if (res.status !== 401) return { ok: false as const, data };
  }
  return { ok: false as const, data: lastData };
}

// 허용된 상태 전이만 통과시킨다. 미확인 → 준비중 확인 단계를 건너뛰고 바로 제작완료/픽업완료로
// 점프시키는 것(정산 자격을 실제 처리 전에 얻는 수단으로 악용 가능)을 막기 위함.
// 준비중 → 픽업/배송완료는 제작완료 단계를 생략해도 되는 정상 플로우라 허용한다.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  "미확인": ["준비중", "취소"],
  "준비중": ["제작완료", "픽업/배송완료", "취소"],
  "제작완료": ["픽업/배송완료", "취소"],
  "픽업/배송완료": ["취소"],
  "취소": [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, previousStatus, cancelReason } = await request.json();

  const supabase = await createClient();

  // 인증 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 소유권 확인
  const { data: resCheck } = await supabase
    .from("reservations").select("company_id, status").eq("id", id).single();
  if (!resCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "operator") {
    const { data: company } = await supabase
      .from("companies").select("id").eq("id", resCheck.company_id).eq("owner_id", user.id).single();
    if (!company) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const blocked = await blockIfInactive(resCheck.company_id); if (blocked) return blocked; // 구독이 끝난 매장은 보기만
  }

  // 상태 전이 유효성 검증 (클라이언트가 보낸 previousStatus가 아니라 DB의 실제 현재 상태 기준)
  const currentStatus = resCheck.status;
  if (status !== currentStatus) {
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        { error: `'${currentStatus}' 상태에서 '${status}'(으)로 바로 변경할 수 없습니다.` },
        { status: 400 }
      );
    }
  }

  // 취소 시 결제 방식에 따라 환불 처리
  let refunded = false;
  if (status === "취소") {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("payment_id, paid, settlement_id, paid_amount, orderer_name")
      .eq("id", id)
      .single();
    const who = `${reservation?.orderer_name ?? ""}${reservation?.paid_amount ? ` · ${reservation.paid_amount.toLocaleString()}원` : ""} · 예약 ${id}`;

    // 이미 정산(매장에 지급 완료)된 예약은 자동 환불하지 않는다 — 운영자가 직접 처리
    if (reservation?.payment_id && !reservation.settlement_id) {
      // 토스 카드 결제 → 환불 시도, 실패 시 상태 변경 차단
      try {
        const refundResult = await tossCancelPayment(reservation.payment_id, cancelReason ?? "관리자 취소");
        if (!refundResult.ok) {
          console.error("[status] 환불 실패:", refundResult.data);
          // 사장님은 오류를 보지만 손님 환불이 안 된 채 남을 수 있다 — 운영자에게 알림
          await reportOpsAlert(createAdminClient(), {
            kind: "refund_failed",
            companyId: resCheck.company_id,
            title: "예약 취소 환불 실패 — 취소되지 않음",
            detail: `${who} · ${(refundResult.data as { message?: string })?.message ?? "토스 환불 실패"}`,
          });
          return NextResponse.json(
            { error: `환불 실패: ${(refundResult.data as { message?: string })?.message ?? JSON.stringify(refundResult.data)}` },
            { status: 500 }
          );
        }
      } catch (err) {
        console.error("[status] 환불 요청 오류:", err);
        await reportOpsAlert(createAdminClient(), {
          kind: "refund_failed",
          companyId: resCheck.company_id,
          title: "예약 취소 환불 요청 오류 — 취소되지 않음",
          detail: `${who} · ${err instanceof Error ? err.message : "요청 오류"}`,
        });
        return NextResponse.json(
          { error: "환불 요청 중 오류가 발생했습니다. 다시 시도해주세요." },
          { status: 500 }
        );
      }
    }
    // 이미 정산(매장에 지급)된 카드 결제 예약 — 자동 환불하지 않으므로 운영자가 직접 환불·정산 조정
    if (reservation?.payment_id && reservation.settlement_id) {
      await reportOpsAlert(createAdminClient(), {
        kind: "refund_manual_needed",
        companyId: resCheck.company_id,
        title: "정산된 예약 취소 — 직접 환불 필요",
        detail: `${who} · 이미 매장에 정산된 카드 결제라 자동 환불하지 않았어요`,
      });
    }
    // payment_id 없는 경우(무통장 입금, 매장 결제, 직접 추가 등)나 이미 정산된 경우 → 환불 처리 없이 상태만 변경
    refunded = !!(reservation?.payment_id && !reservation.settlement_id);
  }

  // 상태 업데이트
  const update: Record<string, unknown> = { status };
  if (status === "취소" && cancelReason) update.cancel_reason = cancelReason;

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) {
    // 환불은 됐는데 '취소' 저장 실패 — 예약이 살아 있어 정산에 잡힐 수 있다
    if (refunded) {
      await reportOpsAlert(createAdminClient(), {
        kind: "cancel_after_refund_failed",
        companyId: resCheck.company_id,
        title: "환불됐지만 예약 취소 저장 실패 — 직접 취소 필요",
        detail: `예약 ${id} · ${error.message}`,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status !== currentStatus) {
    await logReservationChange({
      reservationId: id,
      companyId: resCheck.company_id,
      actorUserId: user.id,
      action: "status_change",
      field: "status",
      oldValue: currentStatus,
      newValue: status,
      reason: status === "취소" ? (cancelReason ?? null) : null,
    });
  }

  // 준비중 알림은 미확인에서 변경 시에만, 취소 알림은 어떤 상태에서든 발송
  if (previousStatus !== "미확인" && status !== "취소") {
    return NextResponse.json({ ok: true });
  }

  // 알림 발송에 필요한 데이터 조회
  try {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("orderer_name, orderer_phone, items, final_price, delivery_type, desired_date, desired_time, customer_profile_id, company_id, after_hours_pickup, unattended_pickup, order_token, order_type")
      .eq("id", id)
      .single();

    if (!reservation) return NextResponse.json({ ok: true });
    // 손님 알림톡은 플로에이드에서 주문·결제한 예약만 (맞춤주문·상품 주문)
    // 사장님이 직접 추가한 예약(네이버·카카오·워크인)·네이버 메일 예약은 보내지 않고,
    // 링크결제 예약은 결제가 끝날 때 확정 알림톡만 보낸다 (취소 알림톡 없음)
    if (!["consult", "product"].includes((reservation as { order_type?: string | null }).order_type ?? "") || !reservation.orderer_phone) {
      return NextResponse.json({ ok: true });
    }

    const { data: companyRaw } = await supabase
      .from("companies")
      .select("name, slug, phone, is_demo, settings:company_settings(address, parking, after_hours_note, unattended_note)")
      .eq("id", reservation.company_id)
      .single();

    // 데모 매장은 고객/사장님 모두에게 알림톡을 보내지 않는다.
    if (companyRaw?.is_demo) return NextResponse.json({ ok: true });

    const company = companyRaw ? {
      name: companyRaw.name,
      phone: companyRaw.phone,
      address: (companyRaw.settings as { address?: string } | null)?.address ?? "",
      parking: (companyRaw.settings as { parking?: string | null } | null)?.parking ?? null,
      afterHoursNote: (companyRaw.settings as { after_hours_note?: string | null } | null)?.after_hours_note ?? null,
      unattendedNote: (companyRaw.settings as { unattended_note?: string | null } | null)?.unattended_note ?? null,
    } : null;

    const companyPhone = company?.phone ?? "";
    const desiredDateTime = `${reservation.desired_date}${reservation.desired_time ? ` ${reservation.desired_time}` : ""}`;

    // 같은 유형이면 '꽃다발 2건', 섞이면 '꽃다발 외 1건'
    const productType = productTypeSummary(reservation.items as { type?: string; quantity?: number }[] | null);

    if (status === "준비중") {
      await sendReservationReceived({
        to: reservation.orderer_phone,
        ordererName: reservation.orderer_name,
        companyName: company?.name ?? "",
        finalPrice: reservation.final_price,
        productType,
        deliveryType: reservation.delivery_type,
        desiredDateTime,
        companyPhone,
        companyAddress: company?.address ?? "",
        parking: company?.parking ?? null,
        // 영업시간 외 수령 주문에만 사장님 안내를 붙인다
        afterHoursNote: reservation.after_hours_pickup ? company?.afterHoursNote ?? null : null,
        // 무인 픽업(바로 구매 상품만) 주문 — 무인 픽업 안내 (안 적었으면 영업시간 외 픽업 안내)
        unattendedNote: (reservation as { unattended_pickup?: boolean | null }).unattended_pickup ? (company?.unattendedNote?.trim() || company?.afterHoursNote) ?? null : null,
        // [주문 확인하기] 버튼 — 주문 확인 페이지 (주문 코드는 모든 예약에 있다)
        orderLink: `${companyRaw?.slug ?? ""}/order/${reservation.order_token}`,
      });
    } else if (status === "취소") {
      await sendReservationCancelled({
        to: reservation.orderer_phone,
        ordererName: reservation.orderer_name,
        companyName: company?.name ?? "",
        productType,
        finalPrice: reservation.final_price,
        cancelReason: cancelReason ?? "사유 없음",
        companyPhone,
      });
    }
  } catch (alimErr) {
    console.warn("[status] 알림톡 실패:", alimErr);
  }

  return NextResponse.json({ ok: true });
}
