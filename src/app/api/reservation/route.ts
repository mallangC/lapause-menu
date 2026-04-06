import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReservationConfirmedOwner } from "@/lib/solapi";

interface ReservationBody {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
  paymentId?: string;
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
  };
  orderer: {
    name: string;
    phone: string;
  };
  kakaoConsent?: boolean;
  delivery: {
    recipientName: string;
    recipientPhone: string;
    address: string;
    addressDetail: string;
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReservationBody = await request.json();
    const { slug, orderer, paymentId } = body;

    if (!orderer.name || !orderer.phone || !body.product?.id) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    // 포트원 결제 검증
    if (paymentId) {
      const portoneRes = await fetch(`https://api.portone.io/payments/${paymentId}`, {
        headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
      });
      const portoneData = await portoneRes.json();
      if (portoneData.status !== "PAID") {
        return NextResponse.json({ error: "결제가 완료되지 않았습니다." }, { status: 400 });
      }
      if (portoneData.amount?.total !== (body.finalPrice ?? body.product.price)) {
        return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const { data: companyId, error: companyError } = await supabase
      .rpc("get_company_id_by_slug", { p_slug: slug });
    if (companyError) console.error("[reservation] company 조회 실패:", companyError.message);
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

    // 계좌 정보 + 매장 전화번호 조회
    const { data: companyInfo } = await supabase
      .from("companies")
      .select("name, phone, address, bank_name, bank_account, bank_holder")
      .eq("id", companyId)
      .single();

    // DB에 예약 저장
    let savedReservationId: string | null = null;
    if (companyId) {
      const { form, product, orderer, delivery, finalPrice, kakaoConsent } = body;
      const { data: insertData, error: insertError } = await supabase.from("reservations").insert({
        company_id: companyId,
        customer_profile_id: customerProfileId,
        status: "미확인",
        channel: "Flo.Aide",
        orderer_name: orderer.name,
        orderer_phone: orderer.phone,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_type: product.product_type,
        product_image_url: product.image_url,
        quantity: 1,
        paid: !!paymentId,
        payment_id: paymentId ?? null,
        final_price: finalPrice ?? product.price,
        purpose: form.purpose === "기타" ? form.purposeCustom : form.purpose,
        recipient_gender: form.recipientGender,
        recipient_age: form.recipientAge,
        relationship: form.relationship === "기타" ? form.relationshipCustom : form.relationship,
        mood: form.mood,
        budget: form.budget === "기타" ? `${form.budgetCustom}만원` : form.budget,
        message_card: form.messageCard,
        message_card_content: form.messageCardContent || null,
        shopping_bag: form.shoppingBag,
        delivery_type: form.deliveryType,
        desired_date: form.desiredDate,
        desired_time: form.desiredTime,
        requests: form.requests || null,
        recipient_name: delivery?.recipientName || null,
        recipient_phone: delivery?.recipientPhone || null,
        address: delivery?.address || null,
        address_detail: delivery?.addressDetail || null,
      }).select("id");

      if (insertError) console.error("[reservation] insert 실패:", insertError.message);
      else {
        savedReservationId = insertData?.[0]?.id ?? null;
        if (customerProfileId) {
          await supabase.from("customer_profiles").update({ kakao_consent: kakaoConsent ?? false }).eq("id", customerProfileId);
        }
      }
    }

    // 사장님에게 카카오 알림 발송
    try {
      const { data: ownerPhone } = await supabase.rpc("get_owner_phone_by_slug", { p_slug: slug });
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
      bankAccount: companyInfo?.bank_account ?? null,
      bankHolder: companyInfo?.bank_holder ?? null,
      companyPhone: companyInfo?.phone ?? null,
      companyAddress: companyInfo?.address ?? null,
    });
  } catch (err) {
    console.error("[reservation] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
