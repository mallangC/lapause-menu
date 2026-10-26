import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendPaymentCompletedOwner } from "@/lib/solapi";

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
      .select("id, orderer_name, orderer_phone, final_price, items, payment_link_expires_at, paid, company_id, delivery_type, desired_date, desired_time")
      .eq("payment_token", token)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "유효하지 않은 결제 링크입니다." }, { status: 404 });
    }

    if (reservation.paid) {
      return NextResponse.json({ error: "이미 결제가 완료된 예약입니다." }, { status: 400 });
    }

    const expires = reservation.payment_link_expires_at ? new Date(reservation.payment_link_expires_at) : null;
    if (expires && expires < new Date()) {
      return NextResponse.json({ error: "만료된 결제 링크입니다." }, { status: 400 });
    }

    if (amount < reservation.final_price) {
      return NextResponse.json({ error: "결제 금액이 주문 금액보다 작습니다." }, { status: 400 });
    }

    // 데모 매장 여부 확인 (클라이언트가 보낸 값이 아니라 서버에서 직접 조회)
    const { data: companyRow } = await adminClient.from("companies").select("is_demo").eq("id", reservation.company_id).single();
    const isDemoCompany = companyRow?.is_demo ?? false;

    // 토스 결제 승인 (데모 매장은 실제 결제가 없으므로 건너뛴다)
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
    }

    // 예약 결제 완료 처리
    await adminClient
      .from("reservations")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        // 데모 매장은 실제 결제가 아니므로 payment_id를 비워서 정산/통신판매업 판매수량 집계 등 "실결제" 신호로 쓰이는 곳에서 자동 제외되게 한다
        payment_id: isDemoCompany ? null : paymentKey,
        order_type: "link",
        payment_token: null,
        payment_link_expires_at: null,
      })
      .eq("id", reservation.id);

    // 사장님 알림톡
    try {
      const { data: company } = await adminClient
        .from("companies")
        .select("name, slug")
        .eq("id", reservation.company_id)
        .single();

      const ownerPhone = company?.slug && !isDemoCompany
        ? (await adminClient.rpc("get_owner_phone_by_slug", { p_slug: company.slug })).data
        : null;

      if (ownerPhone && company) {
        const items = reservation.items as Array<{ type?: string; name?: string }>;
        const productType = items?.length === 1
          ? (items[0].name || items[0].type || "상품")
          : `${items[0]?.name || items[0]?.type || "상품"} 외 ${items.length - 1}건`;

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[pay-link/confirm] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
