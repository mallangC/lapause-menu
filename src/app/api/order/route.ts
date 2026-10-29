import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReservationConfirmedOwner } from "@/lib/solapi";
import { cancelTossPayment, cartItemsTotal, isValidDeliveryPart, loadCompanyProducts, loadOptionPrices } from "@/lib/orderPricing";

interface CartItemPayload {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  product_type: string;
  bag_included: boolean;
  quantity: number;
  shoppingBagCount: number;
  preservativeCount: number;
  messageCardCount: number;
  messageCardContents: string[];
}

interface OrderBody {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
  items: CartItemPayload[];
  orderer: { name: string; phone: string };
  deliveryType: string;
  delivery: { recipientName: string; recipientPhone: string; address: string; addressDetail: string } | null;
  desiredDate: string;
  desiredTime: string;
  requests: string;
  finalPrice: number;
  paymentKey?: string;
  paymentOrderId?: string;
  paymentAmount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderBody = await request.json();
    const { slug, orderer, items, paymentKey, paymentOrderId, paymentAmount, finalPrice } = body;

    if (!orderer.name || !orderer.phone || !items?.length) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    // 매장 조회·고객 등록·사장님 연락처 RPC는 익명 실행 권한을 막아뒀으므로 서버 전용 클라이언트로 호출
    const adminClient = createAdminClient();

    // 휴무일 검증 (결제 승인 전에 막아 불필요한 결제를 방지)
    const { data: companyId } = await adminClient
      .rpc("get_company_id_by_slug", { p_slug: slug });

    // 데모 매장 여부 확인 (클라이언트가 보낸 값이 아니라 서버에서 직접 조회)
    let isDemoCompany = false;
    if (companyId) {
      const { data: companyRow } = await supabase.from("companies").select("is_demo").eq("id", companyId).single();
      isDemoCompany = companyRow?.is_demo ?? false;
    }

    if (companyId && body.desiredDate) {
      const { data: settingsRow } = await supabase
        .from("company_settings")
        .select("closed_dates, business_hours")
        .eq("company_id", companyId)
        .single();
      const closedDates = (settingsRow?.closed_dates as string[] | null) ?? [];
      const businessHours = (settingsRow?.business_hours as Record<string, { closed: boolean }> | null) ?? {};
      const desiredDow = new Date(`${body.desiredDate}T00:00:00`).getDay();
      const isClosedDay = businessHours[String(desiredDow)]?.closed;
      if (isClosedDay || closedDates.includes(body.desiredDate)) {
        return NextResponse.json({ error: "선택하신 날짜는 휴무일입니다. 다른 날짜를 선택해주세요." }, { status: 400 });
      }
    }

    // 없는 매장이면 결제 승인 전에 중단 (승인 후 저장할 곳이 없으면 돈만 빠짐)
    if (!companyId) {
      return NextResponse.json({ error: "매장을 찾을 수 없습니다." }, { status: 404 });
    }

    // 금액 검증 — 클라이언트가 보낸 가격 대신 DB 상품가·매장 옵션가로 다시 계산 (결제 승인 전에)
    const [optionPrices, dbProducts] = await Promise.all([
      loadOptionPrices(adminClient, companyId),
      loadCompanyProducts(adminClient, companyId, items.map((i) => i.productId)),
    ]);
    const itemsTotal = cartItemsTotal(items, dbProducts, optionPrices);
    if (itemsTotal === null) {
      return NextResponse.json({ error: "주문 상품 정보가 올바르지 않습니다. 장바구니를 다시 확인해주세요." }, { status: 400 });
    }
    if (!Number.isInteger(finalPrice) || !isValidDeliveryPart(body.deliveryType, finalPrice - itemsTotal, optionPrices)) {
      return NextResponse.json({ error: "주문 금액이 올바르지 않습니다. 상품 가격이 변경되었을 수 있으니 장바구니를 다시 확인해주세요." }, { status: 400 });
    }
    if (paymentKey && paymentAmount != null && paymentAmount !== finalPrice) {
      return NextResponse.json({ error: "결제 금액이 주문 금액과 다릅니다." }, { status: 400 });
    }

    // 토스 결제 승인 및 검증 (데모 매장은 실제 결제가 없으므로 건너뛴다)
    let paidAmount: number | null = null;
    if (paymentKey && !isDemoCompany) {
      const encodedKey = Buffer.from(`${process.env.TOSS_WIDGET_SECRET_KEY!}:`).toString("base64");
      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId: paymentOrderId,
          amount: finalPrice,
        }),
      });
      if (!tossRes.ok) {
        const tossError = await tossRes.json().catch(() => ({}));
        return NextResponse.json({ error: (tossError as { message?: string }).message ?? "결제 확인에 실패했습니다." }, { status: 400 });
      }
      const tossData = await tossRes.json();
      if (tossData.status !== "DONE") {
        return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
      }
      if (tossData.totalAmount !== finalPrice) {
        await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "결제 금액 불일치");
        return NextResponse.json({ error: "결제 금액이 주문 금액과 달라 결제를 취소했습니다." }, { status: 400 });
      }
      paidAmount = tossData.totalAmount;
    }

    // customer_profile upsert
    let customerProfileId: string | null = null;
    if (orderer.phone) {
      const { data: profileId } = await adminClient.rpc("upsert_customer_profile", {
        p_company_id: companyId,
        p_phone: orderer.phone,
        p_name: orderer.name,
      });
      customerProfileId = profileId ?? null;
    }

    // items JSONB 구성 — 상품명·가격·유형은 DB 값으로
    const dbItems = items.map((item) => ({
      type: dbProducts.get(item.productId)!.product_type,
      name: dbProducts.get(item.productId)!.name,
      price: dbProducts.get(item.productId)!.price,
      quantity: item.quantity,
      product_id: item.productId,
      shopping_bag: item.bag_included ? "서비스" : (item.shoppingBagCount > 0 ? `${item.shoppingBagCount}개` : "미포함"),
      preservative: item.preservativeCount > 0 ? `${item.preservativeCount}개` : "미포함",
      message_card: item.messageCardCount > 0 ? `${item.messageCardCount}장` : "미포함",
      message_card_content: item.messageCardCount > 0 && item.messageCardContents?.length
        ? item.messageCardContents.map((c, i) => item.messageCardContents.length > 1 ? `[${i + 1}] ${c}` : c).filter(Boolean).join("\n") || null
        : null,
      memo: null,
    }));

    // 대표 상품유형 (알림톡용)
    const representativeType = items.length === 1
      ? dbItems[0].type
      : `${dbItems[0].type} 외 ${items.length - 1}건`;

    let savedReservationId: string | null = null;
    const { delivery, deliveryType, desiredDate, desiredTime, requests } = body;

    // 손님은 예약 테이블에 직접 쓸 수 없으므로 서버 전용 클라이언트로 저장
    const { data: insertData, error: insertError } = await adminClient.from("reservations").insert({
      company_id: companyId,
      customer_profile_id: customerProfileId,
      status: "미확인",
      channel: "Flo.Aide",
      orderer_name: orderer.name,
      orderer_phone: orderer.phone,
      items: dbItems,
      quantity: items.reduce((s, i) => s + i.quantity, 0),
      paid: !!paymentKey,
      paid_at: paymentKey ? new Date().toISOString() : null,
      // 데모 매장은 실제 결제가 아니므로 payment_id를 비워서 정산/통신판매업 판매수량 집계 등 "실결제" 신호로 쓰이는 곳에서 자동 제외되게 한다
      payment_id: isDemoCompany ? null : (paymentKey ?? null),
      // 토스가 실제로 승인한 금액 — 정산은 이 값을 기준으로 한다 (사장님이 final_price를 수정해도 영향 없음)
      paid_amount: paidAmount,
      final_price: finalPrice,
      delivery_type: deliveryType,
      desired_date: desiredDate,
      desired_time: desiredTime || null,
      requests: requests || null,
      recipient_name: delivery?.recipientName || null,
      recipient_phone: delivery?.recipientPhone || null,
      address: delivery?.address || null,
      address_detail: delivery?.addressDetail || null,
      source: "cart",
      order_type: "product",
    }).select("id");

    if (insertError) {
      console.error("[order] insert 실패:", insertError.message);
      // 결제는 됐는데 주문이 저장되지 않으면 결제를 되돌린다
      if (paymentKey && !isDemoCompany) {
        const cancelled = await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "주문 저장 실패");
        return NextResponse.json(
          { error: cancelled ? "주문 저장 중 오류가 발생해 결제를 취소했습니다. 다시 시도해주세요." : "주문 저장 중 오류가 발생했습니다. 결제 취소가 필요하니 매장에 문의해주세요." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "주문 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    savedReservationId = insertData?.[0]?.id ?? null;

    // 사장님 알림톡 (데모 매장은 발송하지 않음)
    try {
      const { data: ownerPhone } = isDemoCompany ? { data: null } : await adminClient.rpc("get_owner_phone_by_slug", { p_slug: slug });
      if (ownerPhone) {
        const desiredDateTime = `${desiredDate}${desiredTime ? ` ${desiredTime}` : ""}`;
        await sendReservationConfirmedOwner({
          to: ownerPhone,
          companyName: body.companyName,
          productType: representativeType,
          deliveryType,
          desiredDateTime,
          finalPrice,
          ordererName: orderer.name,
          ordererPhone: orderer.phone,
          requests,
          slug,
        });
      }
    } catch (alimErr) {
      console.warn("[order] 사장님 알림톡 실패:", alimErr);
    }

    return NextResponse.json({ success: true, reservationId: savedReservationId });
  } catch (err) {
    console.error("[order] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
