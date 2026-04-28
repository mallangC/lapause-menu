import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "operator";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  if (action === "complete") {
    const { transferred_at, transfer_memo } = body;
    if (!transferred_at) {
      return NextResponse.json({ error: "이체일을 입력해주세요." }, { status: 400 });
    }
    const { error } = await adminClient
      .from("settlements")
      .update({ status: "completed", transferred_at, transfer_memo: transfer_memo || null })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else if (action === "tax_invoice") {
    const { tax_invoice_number, tax_invoice_issued_at } = body;
    const { error } = await adminClient
      .from("settlements")
      .update({
        tax_invoice_number: tax_invoice_number || null,
        tax_invoice_issued_at: tax_invoice_issued_at || null,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else if (action === "cancel") {
    const { error: rErr } = await adminClient
      .from("reservations")
      .update({ settlement_id: null })
      .eq("settlement_id", id);
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    const { error } = await adminClient
      .from("settlements")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  } else {
    return NextResponse.json({ error: "알 수 없는 액션입니다." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
