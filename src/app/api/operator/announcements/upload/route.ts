import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  return profile?.role === "operator";
}

export async function POST(request: NextRequest) {
  if (!(await verifyOperator())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await adminClient.storage
    .from("announcements")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = adminClient.storage.from("announcements").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
