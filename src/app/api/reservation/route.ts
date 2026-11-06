import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReservationConfirmedOwner } from "@/lib/solapi";
import { cancelTossPayment, consultMinimumTotal, isPastPickup, loadCompanyProducts, loadOptionPrices } from "@/lib/orderPricing";
import { normalizeTrafficSource } from "@/lib/trafficSource";
import { PHOTO_PRODUCT_ID, REF_DATA_PATTERN, STYLE_PRODUCT_TYPES, isValidStyleBudget, isVirtualProductId, styleProductName } from "@/lib/styleOrder";
import type { DbProduct } from "@/lib/orderPricing";
import { isValidPreparedColor } from "@/lib/todayColors";
import { parsePaymentChoice } from "@/lib/payment";

interface ReservationBody {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
  paymentKey?: string;
  paymentOrderId?: string;
  paymentAmount?: number;
  form: {
    purpose: string;
    purposeCustom: string;
    recipientGender: string;
    recipientAge: string;
    relationship: string;
    relationshipCustom: string;
    productType: string;
    mood: string;
    budget: string;
    budgetCustom: string;
    messageCard: string;
    messageCardContent: string;
    shoppingBag: string;
    preservative: string;
    deliveryType: string;
    desiredDate: string;
    desiredTime: string;
    requests: string;
    /** 오늘 매장에 있는 색으로 준비되는 날짜일 때 고른 색 */
    preparedColor?: string;
  };
  finalPrice?: number;
  product: {
    id: string;
    name: string;
    price: number;
    product_type: string;
    image_url: string;
    bag_included?: boolean;
  };
  orderer: {
    name: string;
    phone: string;
  };
  delivery: {
    recipientName: string;
    recipientPhone: string;
    address: string;
    addressDetail: string;
  } | null;
  /** 유입 출처 (?utm_source= / ?from=) */
  trafficSource?: string | null;
  /** 상품 상세에서 바로 예약(product_detail) / 처음부터 고른 맞춤 주문(consult) */
  orderPath?: string | null;
  /** 찾아본 사진 주문 — 손님이 보낸 참고 사진 (data URL). 결제가 승인된 뒤에 저장소에 올린다 */
  referenceImageData?: string | null;
  /** 결제 방법 — card(토스 결제) / transfer(계좌이체: 결제 없이 접수, 입금 확인 후 사장님이 확정) */
  paymentMethod?: "card" | "transfer";
  /** 계좌이체 현금영수증 신청 */
  cashReceipt?: { type: string; number: string };
}

export async function POST(request: NextRequest) {
  try {
    const body: ReservationBody = await request.json();
    const { slug, orderer, paymentKey, paymentOrderId, paymentAmount } = body;

    if (!orderer.name || !orderer.phone || !body.product?.id) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    // 결제 방법 — 계좌이체는 토스 결제 없이 접수한다
    const payment = parsePaymentChoice(body);
    if (!payment) {
      return NextResponse.json({ error: "현금영수증 정보를 다시 확인해주세요." }, { status: 400 });
    }
    const isTransfer = payment.method === "transfer";
    if (isTransfer && paymentKey) {
      return NextResponse.json({ error: "결제 정보가 올바르지 않습니다." }, { status: 400 });
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
      // 로그인 상태·RLS와 관계없이 정확히 읽도록 서버 전용 클라이언트로 조회 (못 읽으면 데모가 아닌 것으로 판단돼 알림톡이 나감)
      const { data: companyRow } = await adminClient.from("companies").select("is_demo").eq("id", companyId).single();
      isDemoCompany = companyRow?.is_demo ?? false;
    }

    if (companyId && body.form?.desiredDate) {
      const { data: settingsRow } = await supabase
        .from("company_settings")
        .select("closed_dates, business_hours")
        .eq("company_id", companyId)
        .single();
      const closedDates = (settingsRow?.closed_dates as string[] | null) ?? [];
      const businessHours = (settingsRow?.business_hours as Record<string, { closed: boolean }> | null) ?? {};
      const desiredDow = new Date(`${body.form.desiredDate}T00:00:00`).getDay();
      const isClosedDay = businessHours[String(desiredDow)]?.closed;
      if (isClosedDay || closedDates.includes(body.form.desiredDate)) {
        return NextResponse.json({ error: "선택하신 날짜는 휴무일입니다. 다른 날짜를 선택해주세요." }, { status: 400 });
      }
    }

    if (isPastPickup(body.form?.desiredDate, body.form?.desiredTime)) {
      return NextResponse.json({ error: "선택하신 수령 시간이 이미 지났습니다. 시간을 다시 선택해주세요." }, { status: 400 });
    }

    // 없는 매장이면 결제 승인 전에 중단 (승인 후 저장할 곳이 없으면 돈만 빠짐)
    if (!companyId) {
      return NextResponse.json({ error: "매장을 찾을 수 없습니다." }, { status: 404 });
    }

    // 사장님 스타일·찾아본 사진 주문 — 상품 없이 손님이 정한 예산이 상품 금액이 된다 (금액은 손님이 보낸 상품가가 아니라 폼의 예산에서 다시 계산)
    const isStyleOrder = isVirtualProductId(body.product.id);
    const isPhotoOrder = body.product.id === PHOTO_PRODUCT_ID;
    // 사진 주문은 사진 1장이 꼭 있어야 한다 — 결제 승인 전에 형식·크기(5MB)를 확인해 둔다
    const refMatch = isPhotoOrder ? REF_DATA_PATTERN.exec(body.referenceImageData ?? "") : null;
    const refBuffer = refMatch ? Buffer.from(body.referenceImageData!.split(",")[1], "base64") : null;
    if (isPhotoOrder && (!refMatch || !refBuffer || refBuffer.length === 0 || refBuffer.length > 5 * 1024 * 1024)) {
      return NextResponse.json({ error: "보내주신 사진을 찾을 수 없습니다. 처음 화면에서 사진을 다시 보내주세요." }, { status: 400 });
    }
    let dbProduct: DbProduct | undefined;
    if (isStyleOrder) {
      const budget = Number(body.form?.budgetCustom) * 10000;
      if (body.form?.budget !== "기타" || !isValidStyleBudget(budget) || !STYLE_PRODUCT_TYPES.includes(body.form?.productType)) {
        return NextResponse.json({ error: "주문 정보가 올바르지 않습니다. 처음부터 다시 시도해주세요." }, { status: 400 });
      }
      dbProduct = {
        id: body.product.id,
        price: budget,
        name: styleProductName(isPhotoOrder ? "photo" : "style", body.form.mood),
        product_type: body.form.productType,
        bag_included: false,
        message_card_unavailable: false,
        preservative_unavailable: false,
      };
    } else {
      // 상품은 반드시 이 매장 상품이어야 하고, 이름·가격은 DB 값을 쓴다
      dbProduct = (await loadCompanyProducts(adminClient, companyId, [body.product.id])).get(body.product.id);
    }
    if (!dbProduct) {
      return NextResponse.json({ error: "상품 정보를 찾을 수 없습니다." }, { status: 400 });
    }
    // 사장님이 메시지카드 추가 불가로 둔 상품에는 카드를 붙일 수 없다 (맞춤주문 화면에서도 숨기지만 서버에서 한 번 더 막는다)
    if (dbProduct.message_card_unavailable && body.form?.messageCard === "추가") {
      return NextResponse.json({ error: "이 상품은 메시지 카드를 추가할 수 없어요." }, { status: 400 });
    }
    if (dbProduct.preservative_unavailable && body.form?.preservative === "추가") {
      return NextResponse.json({ error: "이 상품은 생화 수명연장제를 추가할 수 없어요." }, { status: 400 });
    }

    // 계좌이체 — 결제 없이 받는 금액도 '상품가 + 선택한 옵션 최소 1개씩' 이상이어야 한다
    if (isTransfer) {
      const minimum = consultMinimumTotal(dbProduct, body.form, await loadOptionPrices(adminClient, companyId));
      if (!Number.isInteger(body.finalPrice) || (body.finalPrice as number) < minimum) {
        return NextResponse.json({ error: "주문 금액이 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
      }
    }

    // 토스 결제 승인 및 검증 (데모 매장은 실제 결제가 없으므로 건너뛴다)
    let paidAmount: number | null = null;
    if (paymentKey && !isDemoCompany) {
      // 옵션 개수는 서버로 오지 않으므로 '상품가 + 선택한 옵션 최소 1개씩' 이상인지 결제 승인 전에 확인
      const minimum = consultMinimumTotal(dbProduct, body.form, await loadOptionPrices(adminClient, companyId));
      const requested = paymentAmount ?? body.finalPrice;
      if (!Number.isInteger(requested) || (requested as number) < minimum) {
        return NextResponse.json({ error: "결제 금액이 주문 금액보다 작습니다. 다시 시도해주세요." }, { status: 400 });
      }

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
          amount: requested,
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
      if (tossData.totalAmount < minimum) {
        await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "결제 금액 부족");
        return NextResponse.json({ error: "결제 금액이 주문 금액보다 작아 결제를 취소했습니다." }, { status: 400 });
      }
      paidAmount = tossData.totalAmount;
    }

    // 찾아본 사진 — 결제가 승인된 뒤에야 저장소에 올린다 (주문하지 않은 손님의 사진이 남지 않게)
    const referenceImages: string[] = [];
    let refPath: string | null = null;
    if (refMatch && refBuffer) {
      const ext = refMatch[1] === "jpeg" ? "jpg" : refMatch[1];
      refPath = `${companyId}/ref_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await adminClient.storage
        .from("reservation-images")
        .upload(refPath, refBuffer, { contentType: `image/${refMatch[1]}`, upsert: false });
      if (upErr) {
        console.error("[reservation] 참고 사진 업로드 실패:", upErr.message);
        // 사진이 핵심인 주문이라 사진 없이 받지 않는다 — 결제를 되돌린다
        if (paymentKey && !isDemoCompany) {
          const cancelled = await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "참고 사진 저장 실패");
          return NextResponse.json(
            { error: cancelled ? "사진 저장 중 오류가 발생해 결제를 취소했습니다. 다시 시도해주세요." : "사진 저장 중 오류가 발생했습니다. 결제 취소가 필요하니 매장에 문의해주세요." },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: "사진 저장 중 오류가 발생했습니다. 다시 시도해주세요." }, { status: 500 });
      }
      referenceImages.push(adminClient.storage.from("reservation-images").getPublicUrl(refPath).data.publicUrl);
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

    // 계좌 정보 + 매장 전화번호 조회
    const { data: companyRaw } = await supabase
      .from("companies")
      .select("name, phone, settings:company_settings(address, bank_name, bank_account, bank_holder)")
      .eq("id", companyId)
      .single();
    const companySettings = companyRaw?.settings as { address?: string; bank_name?: string; bank_account?: string; bank_holder?: string } | null;
    const companyInfo = companyRaw ? {
      name: companyRaw.name,
      phone: companyRaw.phone,
      address: companySettings?.address ?? null,
      bank_name: companySettings?.bank_name ?? null,
      bank_account: companySettings?.bank_account ?? null,
      bank_holder: companySettings?.bank_holder ?? null,
    } : null;

    // DB에 예약 저장
    let savedReservationId: string | null = null;
    if (companyId) {
      const { form, orderer, delivery, finalPrice } = body;
      // 손님은 예약 테이블에 직접 쓸 수 없으므로 서버 전용 클라이언트로 저장
      const { data: insertData, error: insertError } = await adminClient.from("reservations").insert({
        company_id: companyId,
        customer_profile_id: customerProfileId,
        status: "미확인",
        channel: "Flo.Aide",
        orderer_name: orderer.name,
        orderer_phone: orderer.phone,
        items: [{
          type: dbProduct.product_type,
          name: dbProduct.name,
          price: dbProduct.price,
          // 사장님 스타일 주문은 실제 상품이 없다
          product_id: isStyleOrder ? null : dbProduct.id,
          message_card: form.messageCard,
          message_card_content: form.messageCardContent || null,
          shopping_bag: dbProduct.bag_included ? "서비스" : form.shoppingBag,
          preservative: form.preservative,
          memo: null,
        }],
        quantity: 1,
        paid: !!paymentKey,
        paid_at: paymentKey ? new Date().toISOString() : null,
        // 데모 매장은 실제 결제가 아니므로 payment_id를 비워서 정산/통신판매업 판매수량 집계 등 "실결제" 신호로 쓰이는 곳에서 자동 제외되게 한다
        payment_id: isDemoCompany ? null : (paymentKey ?? null),
        // 토스가 실제로 승인한 금액 — 정산은 이 값을 기준으로 한다
        paid_amount: paidAmount,
        final_price: paidAmount ?? (paymentKey || isTransfer ? (finalPrice ?? dbProduct.price) : dbProduct.price),
        // 계좌이체 주문만 결제 방법·현금영수증을 남긴다 (비어 있으면 카드 결제)
        ...(isTransfer ? { payment_method: "transfer", cash_receipt_type: payment.receiptType, cash_receipt_number: payment.receiptNumber } : {}),
        purpose: form.purpose === "기타" ? form.purposeCustom : form.purpose,
        recipient_gender: form.recipientGender,
        recipient_age: form.recipientAge,
        relationship: form.relationship === "기타" ? form.relationshipCustom : form.relationship,
        mood: form.mood,
        budget: form.budget === "기타" ? `${form.budgetCustom}만원` : form.budget,
        delivery_type: form.deliveryType,
        desired_date: form.desiredDate,
        desired_time: form.desiredTime,
        requests: form.requests || null,
        // 오늘 있는 색으로 준비하는 주문 — 손님이 고른 색 (정해진 값만, 고른 주문에만 넣는다)
        ...(isValidPreparedColor(form.preparedColor) ? { prepared_color: form.preparedColor } : {}),
        recipient_name: delivery?.recipientName || null,
        recipient_phone: delivery?.recipientPhone || null,
        address: delivery?.address || null,
        address_detail: delivery?.addressDetail || null,
        order_type: "consult",
        // 찾아본 사진 주문의 참고 사진 — 사장님 예약 상세에 참고 이미지로 보인다
        ...(referenceImages.length > 0 ? { reference_images: referenceImages } : {}),
        // 주문 경로 — 사장님 스타일·찾아본 사진 주문은 상품 id로 서버가 정한다
        order_path: isPhotoOrder ? "photo_request" : isStyleOrder ? "owner_style" : body.orderPath === "product_detail" ? "product_detail" : "consult",
        traffic_source: normalizeTrafficSource(body.trafficSource) ?? "direct",
      }).select("id");

      if (insertError) {
        console.error("[reservation] insert 실패:", insertError.message);
        // 예약이 없으니 방금 올린 참고 사진도 지운다
        if (refPath) await adminClient.storage.from("reservation-images").remove([refPath]);
        // 결제는 됐는데 예약이 저장되지 않으면 결제를 되돌린다
        if (paymentKey && !isDemoCompany) {
          const cancelled = await cancelTossPayment(process.env.TOSS_WIDGET_SECRET_KEY!, paymentKey, "예약 저장 실패");
          return NextResponse.json(
            { error: cancelled ? "예약 저장 중 오류가 발생해 결제를 취소했습니다. 다시 시도해주세요." : "예약 저장 중 오류가 발생했습니다. 결제 취소가 필요하니 매장에 문의해주세요." },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: "예약 저장 중 오류가 발생했습니다." }, { status: 500 });
      }
      savedReservationId = insertData?.[0]?.id ?? null;
    }

    // 사장님에게 카카오 알림 발송 (데모 매장은 발송하지 않음)
    try {
      const { data: ownerPhone } = isDemoCompany ? { data: null } : await adminClient.rpc("get_owner_phone_by_slug", { p_slug: slug });
      if (ownerPhone) {
        const { form, orderer, finalPrice } = body;
        const desiredDateTime = `${form.desiredDate}${form.desiredTime ? ` ${form.desiredTime}` : ""}`;
        await sendReservationConfirmedOwner({
          to: ownerPhone,
          companyName: body.companyName,
          productType: dbProduct.product_type,
          deliveryType: form.deliveryType,
          desiredDateTime,
          finalPrice: paidAmount ?? finalPrice ?? dbProduct.price,
          ordererName: orderer.name,
          ordererPhone: orderer.phone,
          requests: form.requests,
          slug,
        });
      }
    } catch (alimErr) {
      console.warn("[reservation] 사장님 알림톡 실패:", alimErr);
    }

    return NextResponse.json({
      success: true,
      reservationId: savedReservationId,
      bankName: companyInfo?.bank_name ?? null,
      // 계좌이체 주문은 입금해야 하므로 계좌번호 전체를, 그 외에는 가려서
      bankAccount: companyInfo?.bank_account
        ? isTransfer ? companyInfo.bank_account : companyInfo.bank_account.replace(/(\d{4})\d+(\d{4})/, "$1****$2")
        : null,
      bankHolder: companyInfo?.bank_holder ?? null,
      companyPhone: companyInfo?.phone ?? null,
      companyAddress: companyInfo?.address ?? null,
    });
  } catch (err) {
    console.error("[reservation] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
