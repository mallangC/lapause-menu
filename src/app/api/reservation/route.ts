import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";
import { buildReservationNotificationHtml } from "@/lib/email";

interface ReservationBody {
  slug: string;
  companyName: string;
  notificationEmail?: string | null;
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
    const { slug, orderer } = body;

    if (!orderer.name || !orderer.phone || !body.product?.id) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    // 해당 꽃집 ID 조회 (SECURITY DEFINER 함수 — RLS 우회)
    const supabase = await createClient();
    const { data: companyId, error: companyError } = await supabase
      .rpc("get_company_id_by_slug", { p_slug: slug });
    if (companyError) console.error("[reservation] company 조회 실패:", companyError.message);
    if (!companyId) {
      console.error("[reservation] company 없음, slug:", slug);
      return NextResponse.json({ success: true, emailSent: false });
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

    // DB에 예약 저장
    if (companyId) {
      const { form, product, orderer, delivery, finalPrice } = body;
      const { error: insertError } = await supabase.from("reservations").insert({
        company_id: companyId,
        customer_profile_id: customerProfileId,
        status: "미확인",
        orderer_name: orderer.name,
        orderer_phone: orderer.phone,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_type: product.product_type,
        product_image_url: product.image_url,
        quantity: 1,
        paid: false,
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
      });
      if (insertError) console.error("[reservation] insert 실패:", insertError.message);
    }

    // 이메일 알림 (실패해도 예약은 성공으로 처리)
    try {
      let toEmail = body.notificationEmail;
      if (!toEmail) {
        const { data: ownerEmail } = await supabase.rpc("get_owner_email_by_slug", { p_slug: slug });
        toEmail = ownerEmail ?? null;
      }
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      if (toEmail && gmailUser && gmailPass) {
        const baseUrl = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const datetime = `${body.form.desiredDate}${body.form.desiredTime ? ` ${body.form.desiredTime}` : ""}`;
        const html = buildReservationNotificationHtml({
          companyName: body.companyName,
          slug: body.slug,
          ordererName: orderer.name,
          ordererPhone: orderer.phone,
          deliveryType: body.form.deliveryType,
          desiredDatetime: datetime || undefined,
          productType: body.product.product_type || undefined,
          finalPrice: body.finalPrice ?? body.product.price,
          paid: false,
        }, baseUrl);
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: gmailUser, pass: gmailPass },
        });
        await transporter.sendMail({
          from: `"${body.companyName} 예약알림" <${gmailUser}>`,
          to: toEmail,
          subject: `[새 예약] ${orderer.name}님`,
          html,
        });
      }
    } catch (emailErr) {
      console.warn("[reservation] 이메일 전송 실패:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reservation] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
