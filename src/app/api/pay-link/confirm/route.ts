import { NextRequest, NextResponse } from "next/server";
import { ownerWantsAlimtalk } from "@/lib/ownerAlimtalk";
import { PAY_LINK_BLOCKED_MESSAGE, payLinkAllowed } from "@/lib/payLinkAllowed";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cancelTossPayment } from "@/lib/orderPricing";
import { productTypeSummary, sendPaymentCompletedOwner, sendReservationReceived } from "@/lib/solapi";

export async function POST(request: NextRequest) {
  try {
    const { token, paymentKey, orderId, amount } = await request.json();

    if (!token || !paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: reservation, error: fetchError } = await adminClient
      .from("reservations")
      .select("id, orderer_name, orderer_phone, final_price, items, payment_link_expires_at, paid, company_id, delivery_type, desired_date, desired_time, after_hours_pickup, order_token, status, deleted_at")
      .eq("payment_token", token)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "유효하지 않은 결제 링크입니다." }, { status: 404 });
    }

    if (reservation.paid) {
      return NextResponse.json({ error: "이미 결제가 완료된 예약입니다." }, { status: 400 });
    }
    // 사장님이 취소·삭제한 예약은 링크로 결제할 수 없다
    if (reservation.status === "취소" || reservation.deleted_at) {
      return NextResponse.json({ error: "취소된 예약이에요. 매장에 문의해 주세요." }, { status: 400 });
    }

    const expires = reservation.payment_link_expires_at ? new Date(reservation.payment_link_expires_at) : null;
    if (expires && expires < new Date()) {
      return NextResponse.json({ error: "만료된 결제 링크입니다." }, { status: 400 });
    }

    if (amount < reservation.final_price) {
      return NextResponse.json({ error: "결제 금액이 주문 금액보다 작습니다." }, { status: 400 });
    }

    // 판매 신청이 승인된 매장만 결제받는다 (승인 전에 결제창까지 갔어도 승인 처리하지 않는다 — 토스 결제는 승인 요청이 없으면 자동 취소)
    if (!(await payLinkAllowed(adminClient, reservation.company_id))) {
      return NextResponse.json({ error: "지금은 결제할 수 없는 링크예요. 매장에 문의해 주세요." }, { status: 403 });
    }

    // 데모 매장 여부 확인 (클라이언트가 보낸 값이 아니라 서버에서 직접 조회)
    const { data: companyRow } = await adminClient.from("companies").select("is_demo").eq("id", reservation.company_id).single();
    const isDemoCompany = companyRow?.is_demo ?? false;

    // 토스 결제 승인 (데모 매장은 실제 결제가 없으므로 건너뛴다)
    let paidAmount: number | null = null;
    if (!isDemoCompany) {
      const encodedKey = Buffer.from(`${process.env.TOSS_WIDGET_SECRET_KEY!}:`).toString("base64");
      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      });

      if (!tossRes.ok) {
        const tossError = await tossRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: (tossError as { message?: string }).message ?? "결제 확인에 실패했습니다." },
          { status: 400 }
        );
      }

      const tossData = await tossRes.json();
      if (tossData.status !== "DONE") {
        return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
      }
      paidAmount = tossData.totalAmount;
    }

    // 예약 결제 완료 처리 — '아직 결제 안 된 예약'일 때만 (두 탭에서 동시에 결제하면 먼저 끝난 결제만 남기고 나머지는 취소)
    const { data: claimed, error: claimError } = await adminClient
      .from("reservations")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        // 데모 매장은 실제 결제가 아니므로 payment_id를 비워서 정산/통신판매업 판매수량 집계 등 "실결제" 신호로 쓰이는 곳에서 자동 제외되게 한다
        payment_id: isDemoCompany ? null : paymentKey,
        // 토스가 실제로 승인한 금액 — 정산은 이 값을 기준으로 한다
        paid_amount: paidAmount,
        order_type: "link",
        // 사장님이 추가(manual)한 예약이 링크로 결제 완료되면 주문 경로를 링크결제로 바꾼다
        order_path: "pay_link",
        payment_token: null,
        payment_link_expires_at: null,
      })
      .eq("id", reservation.id)
      .eq("paid", false)
      .select("id");
    if (claimError || !claimed?.length) {
      // 저장에 실패했거나 다른 결제가 먼저 끝났다 — 방금 승인한 결제는 되돌린다 (돈이 두 번 나가지 않게)
      const cancelled = isDemoCompany ? true : await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, claimError ? "결제 링크 결제 저장 실패" : "결제 링크 중복 결제", { db: adminClient, companyId: reservation.company_id as string, amount: paidAmount });
      return NextResponse.json(
        {
          error: claimError
            ? cancelled ? "결제 저장 중 오류가 발생해 결제를 취소했어요. 다시 시도해 주세요." : "결제 저장 중 오류가 발생했어요. 결제 취소가 필요하니 매장에 문의해 주세요."
            : cancelled ? "이미 결제가 완료된 예약이라 방금 결제는 취소했어요." : "이미 결제가 완료된 예약이에요. 중복 결제 취소가 필요하니 매장에 문의해 주세요.",
        },
        { status: 409 },
      );
    }

    // 사장님 알림톡
    try {
      const { data: company } = await adminClient
        .from("companies")
        .select("name, slug")
        .eq("id", reservation.company_id)
        .single();

      // 사장님이 '예약 접수 알림톡 받기'를 해제했으면 링크결제 완료 알림도 보내지 않는다
      const ownerPhone = company?.slug && !isDemoCompany && (await ownerWantsAlimtalk(adminClient, reservation.company_id, "new_order"))
        ? (await adminClient.rpc("get_owner_phone_by_slug", { p_slug: company.slug })).data
        : null;

      if (ownerPhone && company) {
        // 다른 알림톡과 같은 규칙 — 같은 유형이면 '꽃다발 2건', 섞이면 '꽃다발 외 1건'
        const productType = productTypeSummary(reservation.items as { type?: string; quantity?: number }[] | null) || "상품";

        const desiredDateTime = `${reservation.desired_date}${reservation.desired_time ? ` ${reservation.desired_time}` : ""}`;

        await sendPaymentCompletedOwner({
          to: ownerPhone,
          companyName: company.name,
          ordererName: reservation.orderer_name,
          ordererPhone: reservation.orderer_phone,
          productType,
          deliveryType: reservation.delivery_type,
          desiredDateTime,
          finalPrice: reservation.final_price,
        });
      }
    } catch (alimErr) {
      console.warn("[pay-link/confirm] 사장님 알림톡 실패:", alimErr);
    }

    // 손님 — 결제가 끝나면 바로 예약 확정 알림톡 (주문 확인 페이지 버튼 포함 — 진행 단계·완성 사진)
    // 링크결제 주문은 확정 알림톡만 보낸다 (취소 알림톡은 보내지 않는다)
    if (!isDemoCompany && reservation.orderer_phone) {
      try {
        const { data: c } = await adminClient
          .from("companies")
          .select("name, slug, phone, settings:company_settings(address, parking, after_hours_note)")
          .eq("id", reservation.company_id)
          .single();
        const cs = (Array.isArray(c?.settings) ? c?.settings[0] : c?.settings) as { address?: string | null; parking?: string | null; after_hours_note?: string | null } | null;
        if (c?.slug) {
          await sendReservationReceived({
            to: reservation.orderer_phone,
            ordererName: reservation.orderer_name,
            companyName: c.name,
            finalPrice: paidAmount ?? reservation.final_price,
            productType: productTypeSummary(reservation.items as { type?: string; quantity?: number }[] | null) || "상품",
            deliveryType: reservation.delivery_type,
            desiredDateTime: `${reservation.desired_date}${reservation.desired_time ? ` ${reservation.desired_time}` : ""}`,
            companyPhone: c.phone ?? "",
            companyAddress: cs?.address ?? "",
            parking: cs?.parking ?? null,
            afterHoursNote: reservation.after_hours_pickup ? cs?.after_hours_note ?? null : null,
            orderLink: `${c.slug}/order/${reservation.order_token}`,
          });
        }
      } catch (alimErr) {
        console.warn("[pay-link/confirm] 손님 확정 알림톡 실패:", alimErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[pay-link/confirm] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
