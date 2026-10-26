import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReservationReceived, sendReservationCancelled } from "@/lib/solapi";
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
  if (status === "취소") {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("payment_id, paid, settlement_id")
      .eq("id", id)
      .single();

    // 이미 정산(매장에 지급 완료)된 예약은 자동 환불하지 않는다 — 운영자가 직접 처리
    if (reservation?.payment_id && !reservation.settlement_id) {
      // 토스 카드 결제 → 환불 시도, 실패 시 상태 변경 차단
      try {
        const refundResult = await tossCancelPayment(reservation.payment_id, cancelReason ?? "관리자 취소");
        if (!refundResult.ok) {
          console.error("[status] 환불 실패:", refundResult.data);
          return NextResponse.json(
            { error: `환불 실패: ${(refundResult.data as { message?: string })?.message ?? JSON.stringify(refundResult.data)}` },
            { status: 500 }
          );
        }
      } catch (err) {
        console.error("[status] 환불 요청 오류:", err);
        return NextResponse.json(
          { error: "환불 요청 중 오류가 발생했습니다. 다시 시도해주세요." },
          { status: 500 }
        );
      }
    }
    // payment_id 없는 경우(계좌이체, 매장 결제, 직접 추가 등)나 이미 정산된 경우 → 환불 처리 없이 상태만 변경
  }

  // 상태 업데이트
  const update: Record<string, unknown> = { status };
  if (status === "취소" && cancelReason) update.cancel_reason = cancelReason;

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
      .select("orderer_name, orderer_phone, items, final_price, delivery_type, desired_date, desired_time, customer_profile_id, company_id")
      .eq("id", id)
      .single();

    if (!reservation) return NextResponse.json({ ok: true });

    const { data: companyRaw } = await supabase
      .from("companies")
      .select("name, phone, is_demo, settings:company_settings(address)")
      .eq("id", reservation.company_id)
      .single();

    // 데모 매장은 고객/사장님 모두에게 알림톡을 보내지 않는다.
    if (companyRaw?.is_demo) return NextResponse.json({ ok: true });

    const company = companyRaw ? {
      name: companyRaw.name,
      phone: companyRaw.phone,
      address: (companyRaw.settings as { address?: string } | null)?.address ?? "",
    } : null;

    const companyPhone = company?.phone ?? "";
    const desiredDateTime = `${reservation.desired_date}${reservation.desired_time ? ` ${reservation.desired_time}` : ""}`;

    const items = reservation.items as { type?: string }[] | null;
    const productType = items?.[0]?.type ?? "";

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
