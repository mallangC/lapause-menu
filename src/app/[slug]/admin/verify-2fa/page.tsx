import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Verify2FAClient from "./Verify2FAClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Verify2FAPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/admin`);

  return <Verify2FAClient slug={slug} email={user.email ?? ""} />;
}
