import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendReservationConfirmedOwner } from "@/lib/solapi";

interface CartItemPayload {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  product_type: string;
  bag_included: boolean;
  quantity: number;
  shoppingBagCount: number;
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
  kakaoConsent?: boolean;
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

    // 토스 결제 승인 및 검증
    if (paymentKey) {
      const encodedKey = Buffer.from(`${process.env.TOSS_SECRET_KEY!}:`).toString("base64");
      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId: paymentOrderId,
          amount: paymentAmount ?? finalPrice,
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
      if (tossData.totalAmount < finalPrice) {
        return NextResponse.json({ error: "결제 금액이 주문 금액보다 작습니다." }, { status: 400 });
      }
    }

    const { data: companyId, error: companyError } = await supabase
      .rpc("get_company_id_by_slug", { p_slug: slug });
    if (companyError) console.error("[order] company 조회 실패:", companyError.message);
    if (!companyId) {
      return NextResponse.json({ success: true });
    }

    // customer_profile upsert
    let customerProfileId: string | null = null;
    if (orderer.phone) {
      const { data: profileId } = await supabase.rpc("upsert_customer_profile", {
        p_company_id: companyId,
        p_phone: orderer.phone,
        p_name: orderer.name,
      });
      customerProfileId = profileId ?? null;
    }

    // items JSONB 구성
    const dbItems = items.map((item) => ({
      type: item.product_type,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      product_id: item.productId,
      shopping_bag: item.bag_included ? "서비스" : (item.shoppingBagCount > 0 ? `${item.shoppingBagCount}개` : "미포함"),
      message_card: item.messageCardCount > 0 ? `${item.messageCardCount}장` : "미포함",
      message_card_content: item.messageCardCount > 0 && item.messageCardContents?.length
        ? item.messageCardContents.map((c, i) => item.messageCardContents.length > 1 ? `[${i + 1}] ${c}` : c).filter(Boolean).join("\n") || null
        : null,
      memo: null,
    }));

    // 대표 상품유형 (알림톡용)
    const representativeType = items.length === 1
      ? items[0].product_type
      : `${items[0].product_type} 외 ${items.length - 1}건`;

    let savedReservationId: string | null = null;
    const { delivery, deliveryType, desiredDate, desiredTime, requests } = body;

    const { data: insertData, error: insertError } = await supabase.from("reservations").insert({
      company_id: companyId,
      customer_profile_id: customerProfileId,
      status: "미확인",
      channel: "Flo.Aide",
      orderer_name: orderer.name,
      orderer_phone: orderer.phone,
      items: dbItems,
      quantity: items.reduce((s, i) => s + i.quantity, 0),
      paid: !!paymentKey,
      payment_id: paymentKey ?? null,
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
    }).select("id");

    if (insertError) console.error("[order] insert 실패:", insertError.message);
    else savedReservationId = insertData?.[0]?.id ?? null;

    // 사장님 알림톡
    try {
      const { data: ownerPhone } = await supabase.rpc("get_owner_phone_by_slug", { p_slug: slug });
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

    if (customerProfileId) {
      try {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await adminClient.from("customer_profiles").update({ kakao_consent: body.kakaoConsent ?? false }).eq("id", customerProfileId);
      } catch { /* non-critical */ }
    }

    return NextResponse.json({ success: true, reservationId: savedReservationId });
  } catch (err) {
    console.error("[order] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
