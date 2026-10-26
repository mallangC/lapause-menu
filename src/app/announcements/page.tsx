import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import AnnouncementsBoardClient from "./AnnouncementsBoardClient";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isOperator = profile?.role === "operator";

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: announcements } = await adminClient
    .from("announcements")
    .select("id, created_at, updated_at, title, body, image_urls, view_count")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-beige-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Image src="/logo-light.png" alt="Flo.Aide" width={80} height={28} className="object-contain" />
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← 홈
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase mb-3">Announcements</p>
          <h1 className="text-2xl font-light text-gray-900">공지사항</h1>
        </div>

        <AnnouncementsBoardClient
          announcements={(announcements ?? []).map((a) => ({ ...a, image_urls: a.image_urls ?? [] }))}
          canEdit={isOperator}
        />
      </main>
    </div>
  );
}
