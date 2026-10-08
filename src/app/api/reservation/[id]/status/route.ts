import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReservationReceived, sendReservationCancelled } from "@/lib/solapi";

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
    .from("reservations").select("company_id").eq("id", id).single();
  if (!resCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "operator") {
    const { data: company } = await supabase
      .from("companies").select("id").eq("id", resCheck.company_id).eq("owner_id", user.id).single();
    if (!company) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 취소 시 결제 방식에 따라 환불 처리
  if (status === "취소") {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("payment_id, paid")
      .eq("id", id)
      .single();

    if (reservation?.payment_id) {
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
    // payment_id 없는 경우 (계좌이체, 매장 결제, 직접 추가 등) → 환불 처리 없이 상태만 변경
  }

  // 상태 업데이트
  const update: Record<string, unknown> = { status };
  if (status === "취소" && cancelReason) update.cancel_reason = cancelReason;

  const { error } = await supabase.from("reservations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
      .select("name, phone, settings:company_settings(address)")
      .eq("id", reservation.company_id)
      .single();
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
