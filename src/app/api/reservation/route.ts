import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReservationConfirmedOwner } from "@/lib/solapi";

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
  source?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReservationBody = await request.json();
    const { slug, orderer, paymentKey, paymentOrderId, paymentAmount } = body;

    if (!orderer.name || !orderer.phone || !body.product?.id) {
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

    // 토스 결제 승인 및 검증 (데모 매장은 실제 결제가 없으므로 건너뛴다)
    if (paymentKey && !isDemoCompany) {
      const { data: dbProduct } = await supabase
        .from("products")
        .select("price")
        .eq("id", body.product.id)
        .single();

      if (!dbProduct) {
        return NextResponse.json({ error: "상품 정보를 찾을 수 없습니다." }, { status: 400 });
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
          amount: paymentAmount ?? body.finalPrice ?? dbProduct.price,
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
      if (tossData.totalAmount < dbProduct.price) {
        return NextResponse.json({ error: "결제 금액이 상품 가격보다 작습니다." }, { status: 400 });
      }
    }
    if (!companyId) {
      return NextResponse.json({ success: true });
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
      const { form, product, orderer, delivery, finalPrice, source } = body;
      const { data: insertData, error: insertError } = await supabase.from("reservations").insert({
        company_id: companyId,
        customer_profile_id: customerProfileId,
        status: "미확인",
        channel: "Flo.Aide",
        orderer_name: orderer.name,
        orderer_phone: orderer.phone,
        items: [{
          type: product.product_type,
          name: product.name,
          price: product.price,
          product_id: product.id ?? null,
          message_card: form.messageCard,
          message_card_content: form.messageCardContent || null,
          shopping_bag: product.bag_included ? "서비스" : form.shoppingBag,
          preservative: form.preservative,
          memo: null,
        }],
        quantity: 1,
        paid: !!paymentKey,
        paid_at: paymentKey ? new Date().toISOString() : null,
        // 데모 매장은 실제 결제가 아니므로 payment_id를 비워서 정산/통신판매업 판매수량 집계 등 "실결제" 신호로 쓰이는 곳에서 자동 제외되게 한다
        payment_id: isDemoCompany ? null : (paymentKey ?? null),
        final_price: paymentKey ? (finalPrice ?? product.price) : (product.price ?? finalPrice),
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
        recipient_name: delivery?.recipientName || null,
        recipient_phone: delivery?.recipientPhone || null,
        address: delivery?.address || null,
        address_detail: delivery?.addressDetail || null,
        source: source || null,
        order_type: "consult",
      }).select("id");

      if (insertError) console.error("[reservation] insert 실패:", insertError.message);
      else {
        savedReservationId = insertData?.[0]?.id ?? null;
      }
    }

    // 사장님에게 카카오 알림 발송 (데모 매장은 발송하지 않음)
    try {
      const { data: ownerPhone } = isDemoCompany ? { data: null } : await adminClient.rpc("get_owner_phone_by_slug", { p_slug: slug });
      if (ownerPhone) {
        const { form, product, orderer, finalPrice } = body;
        const desiredDateTime = `${form.desiredDate}${form.desiredTime ? ` ${form.desiredTime}` : ""}`;
        await sendReservationConfirmedOwner({
          to: ownerPhone,
          companyName: body.companyName,
          productType: product.product_type,
          deliveryType: form.deliveryType,
          desiredDateTime,
          finalPrice: finalPrice ?? product.price,
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
      bankAccount: companyInfo?.bank_account ? companyInfo.bank_account.replace(/(\d{4})\d+(\d{4})/, "$1****$2") : null,
      bankHolder: companyInfo?.bank_holder ?? null,
      companyPhone: companyInfo?.phone ?? null,
      companyAddress: companyInfo?.address ?? null,
    });
  } catch (err) {
    console.error("[reservation] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
