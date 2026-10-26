import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function SlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("companies")
    .select("is_demo")
    .eq("slug", slug)
    .single();

  const isDemo = data?.is_demo ?? false;

  if (!isDemo) return <>{children}</>;

  return (
    <>
      <div className="sticky top-0 z-[60] bg-red-600 text-white text-center text-xs font-semibold py-1.5 px-2 leading-snug tracking-wide">
        DEMO 모드 — 실제 결제가 이루어지지 않습니다
      </div>
      {children}
    </>
  );
}
