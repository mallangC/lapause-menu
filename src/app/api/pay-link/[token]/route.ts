import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminClient
      .from("reservations")
      .select("id, orderer_name, orderer_phone, final_price, items, payment_link_expires_at, paid, company_id, delivery_type, desired_date, desired_time")
      .eq("payment_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "유효하지 않은 링크입니다." }, { status: 404 });
    }

    if (data.paid) {
      return NextResponse.json({ error: "이미 결제가 완료된 예약입니다." }, { status: 400 });
    }

    const expires = data.payment_link_expires_at ? new Date(data.payment_link_expires_at) : null;
    if (expires && expires < new Date()) {
      return NextResponse.json({ error: "만료된 결제 링크입니다." }, { status: 400 });
    }

    const { data: company } = await adminClient
      .from("companies")
      .select("name, slug, settings:company_settings(logo_image, message_card_price, shopping_bag_price)")
      .eq("id", data.company_id)
      .single();
    const settings = company?.settings as { logo_image?: string | null; message_card_price?: number | null; shopping_bag_price?: number | null } | null;

    return NextResponse.json({
      reservationId: data.id,
      ordererName: data.orderer_name,
      ordererPhone: data.orderer_phone,
      finalPrice: data.final_price,
      items: data.items,
      expiresAt: data.payment_link_expires_at,
      deliveryType: data.delivery_type,
      desiredDate: data.desired_date,
      desiredTime: data.desired_time,
      companyName: company?.name ?? "",
      slug: company?.slug ?? "",
      logoImage: settings?.logo_image ?? null,
      messageCardPrice: settings?.message_card_price ?? 0,
      shoppingBagPrice: settings?.shopping_bag_price ?? 0,
    });
  } catch (err) {
    console.error("[pay-link/token] 오류:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
