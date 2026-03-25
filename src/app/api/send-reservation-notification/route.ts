import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";
import { buildReservationNotificationHtml, ReservationEmailData } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: ReservationEmailData & { companyId: string } = await req.json();
    const { companyId, ...emailData } = body;

    const { data: company } = await supabase
      .from("companies")
      .select("notification_email")
      .eq("id", companyId)
      .eq("owner_id", user.id)
      .single();

    const toEmail = company?.notification_email;
    if (!toEmail) return NextResponse.json({ ok: true, skipped: "no notification_email" });

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (!gmailUser || !gmailPass) return NextResponse.json({ ok: true, skipped: "no gmail config" });

    const baseUrl = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const html = buildReservationNotificationHtml(emailData, baseUrl);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"${emailData.companyName} 예약알림" <${gmailUser}>`,
      to: toEmail,
      subject: `[새 예약] ${emailData.ordererName}님`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-reservation-notification]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
