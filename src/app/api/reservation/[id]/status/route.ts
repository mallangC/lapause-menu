import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReservationReceived, sendReservationCancelled } from "@/lib/solapi";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, previousStatus, cancelReason } = await request.json();

  const supabase = await createClient();

  // 취소 시 결제 방식에 따라 환불 처리
  if (status === "취소") {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("payment_id, paid")
      .eq("id", id)
      .single();

    if (reservation?.payment_id) {
      // 포트원 카드 결제 → 자동 환불
      try {
        await fetch(`https://api.portone.io/payments/${reservation.payment_id}/cancel`, {
          method: "POST",
          headers: {
            Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: cancelReason ?? "관리자 취소" }),
        });
      } catch (err) {
        console.error("[status] 환불 실패:", err);
      }
    }
    // payment_id 없는 경우 (계좌이체, 매장 결제, 직접 추가 등) → 환불 처리 없이 상태만 변경
  }

  // 상태 업데이트
  const update: Record<string, unknown> = { status };
  if (status === "취소" && cancelReason) update.cancel_reason = cancelReason;

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 미확인에서 상태 변경 시에만 알림 발송
  if (previousStatus !== "미확인") {
    return NextResponse.json({ ok: true });
  }

  // 알림 발송에 필요한 데이터 조회
  try {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("orderer_name, orderer_phone, product_type, final_price, delivery_type, desired_date, desired_time, customer_profile_id, company_id")
      .eq("id", id)
      .single();

    if (!reservation) return NextResponse.json({ ok: true });

    const { data: company } = await supabase
      .from("companies")
      .select("name, phone, address")
      .eq("id", reservation.company_id)
      .single();

    const companyPhone = company?.phone ?? "";
    const desiredDateTime = `${reservation.desired_date}${reservation.desired_time ? ` ${reservation.desired_time}` : ""}`;

    // kakao_consent 확인
    let kakaoConsent = false;
    if (reservation.customer_profile_id) {
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("kakao_consent")
        .eq("id", reservation.customer_profile_id)
        .single();
      kakaoConsent = profile?.kakao_consent ?? false;
    }

    if (!kakaoConsent) return NextResponse.json({ ok: true });

    if (status === "준비중") {
      await sendReservationReceived({
        to: reservation.orderer_phone,
        ordererName: reservation.orderer_name,
        companyName: company?.name ?? "",
        finalPrice: reservation.final_price,
        productType: reservation.product_type,
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
        productType: reservation.product_type,
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
