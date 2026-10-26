import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  return profile?.role === "operator" ? user.id : null;
}

export async function POST(request: NextRequest) {
  const operatorId = await verifyOperator();
  if (!operatorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body, imageUrls } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminClient
    .from("announcements")
    .insert({
      operator_id: operatorId,
      title: title.trim(),
      body: body || null,
      image_urls: Array.isArray(imageUrls) ? imageUrls : [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
