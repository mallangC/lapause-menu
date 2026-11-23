import { findOrderByPayment, findRecentTransferOrder, TOSS_ALREADY_PROCESSED } from "@/lib/orderIdempotency";
import { ownerWantsAlimtalk } from "@/lib/ownerAlimtalk";
import { transferOrderAllowed } from "@/lib/transferRateLimit";
import { NextRequest, NextResponse } from "next/server";
import { MESSAGE_CARD_MAX } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { productTypeSummary, sendReservationConfirmedOwner } from "@/lib/solapi";
import { cancelTossPayment, cartItemsTotal, isPastPickup, isValidDeliveryPart, loadCompanyProducts, loadOptionPrices, productUnitPrice, stockProblem, takeStock } from "@/lib/orderPricing";
import { isValidPreparedColor, preparedColorToSave } from "@/lib/todayColors";
import { parsePaymentChoice } from "@/lib/payment";
import { isAfterHoursPickup, isUnattendedPickup, readUnattended, UNATTENDED_OFF, type Unattended } from "@/lib/afterHours";
import type { BusinessHours, DateOverrides } from "@/lib/businessHours";
import { normalizeTrafficSource } from "@/lib/trafficSource";

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
  /** 고른 상품 옵션 항목 id */
  options?: string[] | null;
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
  /** 오늘 있는 색으로 준비되는 날짜일 때 고른 색 */
  preparedColor?: string;
  /** 결제 방법 — card(토스 결제) / transfer(무통장 입금: 결제 없이 접수) */
  paymentMethod?: "card" | "transfer";
  /** 무통장 입금 현금영수증 신청 */
  cashReceipt?: { type: string; number: string };
  finalPrice: number;
  paymentKey?: string;
  paymentOrderId?: string;
  paymentAmount?: number;
  trafficSource?: string | null;
  /** 주문 경로 — 상품 상세에서 수량 2개 이상으로 바로 예약했으면 product_detail, 장바구니면 cart */
  orderPath?: string | null;
  /** 선물 정보 (선택) — 맞춤주문 1단계와 같은 항목 */
  gift?: { purpose?: string; purposeCustom?: string; recipientGender?: string; recipientAge?: string } | null;
}

// 선물 정보 한 칸 — 비어 있으면 null, 길이는 넉넉히 자른다
const giftText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 50) : null);

export async function POST(request: NextRequest) {
  try {
    const body: OrderBody = await request.json();
    const { slug, orderer, items, paymentKey, paymentOrderId, paymentAmount, finalPrice } = body;
    // 결제 방법 — 무통장 입금는 토스 결제 없이 접수한다
    const payment = parsePaymentChoice(body);
    if (!payment) {
      return NextResponse.json({ error: "현금영수증 정보를 다시 확인해주세요." }, { status: 400 });
    }
    const isTransfer = payment.method === "transfer";
    if (isTransfer && paymentKey) {
      return NextResponse.json({ error: "결제 정보가 올바르지 않습니다." }, { status: 400 });
    }

    if (!orderer.name || !orderer.phone || !items?.length) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = await createClient();
    // 매장 조회·고객 등록·사장님 연락처 RPC는 익명 실행 권한을 막아뒀으므로 서버 전용 클라이언트로 호출
    const adminClient = createAdminClient();
    // 무통장 입금 주문은 결제 없이 접수되므로 IP별 횟수 제한 (가짜 주문 도배 방지)
    if (isTransfer && !(await transferOrderAllowed(adminClient, request))) {
      return NextResponse.json({ error: "주문이 너무 많이 들어왔어요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    }

    // 휴무일 검증 (결제 승인 전에 막아 불필요한 결제를 방지)
    const { data: companyId } = await adminClient
      .rpc("get_company_id_by_slug", { p_slug: slug });

    // 데모 매장 여부 확인 (클라이언트가 보낸 값이 아니라 서버에서 직접 조회)
    let isDemoCompany = false;
    if (companyId) {
      // 로그인 상태·RLS와 관계없이 정확히 읽도록 서버 전용 클라이언트로 조회 (못 읽으면 데모가 아닌 것으로 판단돼 알림톡이 나감)
      const { data: companyRow } = await adminClient.from("companies").select("is_demo").eq("id", companyId).single();
      isDemoCompany = companyRow?.is_demo ?? false;
    }

    // 영업시간 밖 수령인지 — 저장해 두고 확정 알림톡에 사장님 안내를 함께 보낸다
    let afterHoursPickup = false;
    // 무인 픽업 — 바로 구매 상품만, 영업시간 밖 무인 픽업 시간 (상품을 확인한 뒤 정한다)
    let unattended: Unattended = UNATTENDED_OFF;
    let pickupHours: { business_hours?: unknown; date_overrides?: unknown } = {};
    // 색 맞춤 최소 금액 (상품 금액이 이보다 작으면 고른 색 대신 '사장님께 맡길게요'로 저장)
    let colorMinPrice = 0;
    if (companyId && body.desiredDate) {
      // 매장 설정은 서버 키로 읽는다 (손님 키로는 매장 설정을 읽을 수 없다)
      const { data: settingsRow } = await adminClient
        .from("company_settings")
        .select("closed_dates, business_hours, date_overrides, color_min_price, after_hours_enabled, after_hours_start, after_hours_end")
        .eq("company_id", companyId)
        .single();
      colorMinPrice = (settingsRow?.color_min_price as number | null) ?? 0;
      unattended = readUnattended((settingsRow ?? {}) as Record<string, unknown>);
      pickupHours = settingsRow ?? {};
      const closedDates = (settingsRow?.closed_dates as string[] | null) ?? [];
      const businessHours = (settingsRow?.business_hours as Record<string, { closed: boolean }> | null) ?? {};
      const desiredDow = new Date(`${body.desiredDate}T00:00:00`).getDay();
      const isClosedDay = businessHours[String(desiredDow)]?.closed;
      if (isClosedDay || closedDates.includes(body.desiredDate)) {
        return NextResponse.json({ error: "선택하신 날짜는 휴무일입니다. 다른 날짜를 선택해주세요." }, { status: 400 });
      }
      afterHoursPickup = isAfterHoursPickup(
        body.desiredDate,
        body.desiredTime,
        settingsRow?.business_hours as BusinessHours | null,
        settingsRow?.date_overrides as DateOverrides | null
      );
    }

    if (isPastPickup(body.desiredDate, body.desiredTime)) {
      return NextResponse.json({ error: "선택하신 수령 시간이 이미 지났습니다. 시간을 다시 선택해주세요." }, { status: 400 });
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
    // 품절·재고 부족 — 결제 승인 전에 막는다
    const stockError = stockProblem(items, dbProducts);
    if (stockError) return NextResponse.json({ error: stockError }, { status: 409 });
    const itemsTotal = cartItemsTotal(items, dbProducts, optionPrices);
    const unattendedPickup = body.deliveryType !== "배송" && isUnattendedPickup(
      items.length > 0 && items.every((i) => dbProducts.get(i.productId)?.instant === true),
      unattended,
      body.desiredDate,
      body.desiredTime,
      pickupHours.business_hours as BusinessHours | null,
      pickupHours.date_overrides as DateOverrides | null
    );
    if (itemsTotal === null) {
      return NextResponse.json({ error: "주문 상품 정보가 올바르지 않습니다. 장바구니를 다시 확인해주세요." }, { status: 400 });
    }
    if (!Number.isInteger(finalPrice) || !isValidDeliveryPart(body.deliveryType, finalPrice - itemsTotal, optionPrices)) {
      return NextResponse.json({ error: "주문 금액이 올바르지 않습니다. 상품 가격이 변경되었을 수 있으니 장바구니를 다시 확인해주세요." }, { status: 400 });
    }
    if (paymentKey && paymentAmount != null && paymentAmount !== finalPrice) {
      return NextResponse.json({ error: "결제 금액이 주문 금액과 다릅니다." }, { status: 400 });
    }

    // 같은 주문 두 번 저장 막기 — 같은 결제로 이미 저장됐으면 그 주문을 돌려주고, 방금 들어온 같은 무통장 입금 주문은 거절
    if (paymentKey && !isDemoCompany) {
      const existing = await findOrderByPayment(adminClient, paymentKey);
      if (existing) return NextResponse.json({ success: true, reservationId: existing.id, orderToken: existing.order_token });
    }
    if (isTransfer && (await findRecentTransferOrder(adminClient, companyId, orderer.phone, finalPrice))) {
      return NextResponse.json({ error: "같은 주문이 방금 접수됐어요. 주문 확인 알림을 확인해 주세요." }, { status: 409 });
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
        // 동시에 두 번 들어와 다른 요청이 먼저 승인한 결제 — 그 요청이 저장한 주문을 돌려준다
        if ((tossError as { code?: string }).code === TOSS_ALREADY_PROCESSED) {
          await new Promise((r) => setTimeout(r, 1500));
          const existing = await findOrderByPayment(adminClient, paymentKey);
          if (existing) return NextResponse.json({ success: true, reservationId: existing.id, orderToken: existing.order_token });
        }
        return NextResponse.json({ error: (tossError as { message?: string }).message ?? "결제 확인에 실패했습니다." }, { status: 400 });
      }
      const tossData = await tossRes.json();
      if (tossData.status !== "DONE") {
        return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
      }
      if (tossData.totalAmount !== finalPrice) {
        await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "결제 금액 불일치", { db: adminClient, companyId, amount: tossData.totalAmount });
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
      // 상품 1개 값 (고른 상품 옵션 금액 포함) — 위 금액 확인을 통과했으니 늘 있다
      price: productUnitPrice(dbProducts.get(item.productId)!, item.options)!.unit,
      product_options: productUnitPrice(dbProducts.get(item.productId)!, item.options)!.options.label || null,
      quantity: item.quantity,
      product_id: item.productId,
      shopping_bag: item.bag_included ? "서비스" : (item.shoppingBagCount > 0 ? `${item.shoppingBagCount}개` : "미포함"),
      preservative: item.preservativeCount > 0 ? `${item.preservativeCount}개` : "미포함",
      message_card: item.messageCardCount > 0 ? `${item.messageCardCount}장` : "미포함",
      message_card_content: item.messageCardCount > 0 && item.messageCardContents?.length
        ? item.messageCardContents.map((c) => (c ?? "").slice(0, MESSAGE_CARD_MAX)).map((c, i) => item.messageCardContents.length > 1 ? `[${i + 1}] ${c}` : c).filter(Boolean).join("\n") || null
        : null,
      memo: null,
    }));

    // 대표 상품유형 (알림톡용)
    const representativeType = productTypeSummary(dbItems);

    let savedReservationId: string | null = null;
    const { delivery, deliveryType, desiredDate, desiredTime, requests, preparedColor } = body;

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
      // 영업시간 외 수령 (그런 주문만 표시 — 확정 알림톡에 안내를 붙인다)
      // 무인 픽업이면 영업시간 외 수령 대신 무인 픽업으로 (알림톡 안내도 무인 픽업 안내)
      ...(unattendedPickup ? { unattended_pickup: true } : afterHoursPickup ? { after_hours_pickup: true } : {}),
      requests: requests || null,
      // 오늘 있는 색으로 준비하는 주문 — 손님이 고른 색 (정해진 값만, 고른 주문에만 넣는다)
      // 최소 금액보다 작은 주문이면 '사장님께 맡길게요'로 (상품 금액 기준 — 추가 옵션·배송비 제외)
      ...(isValidPreparedColor(preparedColor)
        ? { prepared_color: preparedColorToSave(preparedColor, colorMinPrice, items.reduce((s, i) => s + productUnitPrice(dbProducts.get(i.productId)!, i.options)!.unit * i.quantity, 0)) }
        : {}),
      // 무통장 입금 주문만 결제 방법·현금영수증을 남긴다 (비어 있으면 카드 결제)
      ...(isTransfer ? { payment_method: "transfer", cash_receipt_type: payment.receiptType, cash_receipt_number: payment.receiptNumber } : {}),
      recipient_name: delivery?.recipientName || null,
      recipient_phone: delivery?.recipientPhone || null,
      address: delivery?.address || null,
      address_detail: delivery?.addressDetail || null,
      order_type: "product",
      order_path: body.orderPath === "product_detail" ? "product_detail" : "cart",
      purpose: giftText(body.gift?.purpose === "기타" ? body.gift?.purposeCustom || "기타" : body.gift?.purpose),
      recipient_gender: giftText(body.gift?.recipientGender),
      recipient_age: giftText(body.gift?.recipientAge),
      traffic_source: normalizeTrafficSource(body.trafficSource) ?? "direct",
    }).select("id, order_token");

    if (insertError) {
      console.error("[order] insert 실패:", insertError.message);
      // 결제는 됐는데 주문이 저장되지 않으면 결제를 되돌린다
      if (paymentKey && !isDemoCompany) {
        const cancelled = await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "주문 저장 실패", { db: adminClient, companyId, amount: paidAmount });
        return NextResponse.json(
          { error: cancelled ? "주문 저장 중 오류가 발생해 결제를 취소했습니다. 다시 시도해주세요." : "주문 저장 중 오류가 발생했습니다. 결제 취소가 필요하니 매장에 문의해주세요." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "주문 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    savedReservationId = insertData?.[0]?.id ?? null;
    // 재고 줄이기 (재고 관리 상품만 — 0개가 되면 품절)
    await takeStock(adminClient, items, dbProducts);
    // 손님 주문 확인 페이지 코드 (/{매장}/order/{코드})
    const savedOrderToken = (insertData?.[0] as { order_token?: string } | undefined)?.order_token ?? null;

    // 사장님 알림톡 (데모 매장은 발송하지 않음)
    try {
      // 사장님이 매장 설정에서 '예약 접수 알림톡 받기'를 해제했으면 보내지 않는다
      const { data: ownerPhone } = isDemoCompany || !(await ownerWantsAlimtalk(adminClient, companyId, "new_order")) ? { data: null } : await adminClient.rpc("get_owner_phone_by_slug", { p_slug: slug });
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
          paymentMethod: isTransfer ? "transfer" : "card",
          slug,
        });
      }
    } catch (alimErr) {
      console.warn("[order] 사장님 알림톡 실패:", alimErr);
    }

    // 무통장 입금 — 입금할 매장 계좌를 함께 돌려준다 (완료 화면에 안내)
    let bank: { bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null = null;
    if (isTransfer) {
      const { data: b } = await adminClient.from("company_settings").select("bank_name, bank_account, bank_holder").eq("company_id", companyId).single();
      bank = { bankName: b?.bank_name ?? null, bankAccount: b?.bank_account ?? null, bankHolder: b?.bank_holder ?? null };
    }

    return NextResponse.json({ success: true, reservationId: savedReservationId, orderToken: savedOrderToken, ...(bank ?? {}) });
  } catch (err) {
    console.error("[order] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
