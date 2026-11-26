import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  // 예전 /products 주소는 메뉴판(/[slug]/menu)으로 — ?type= 등 주소 뒤 값은 그대로 넘긴다
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === "string") qs.append(k, v);
    else v?.forEach((x) => qs.append(k, x));
  }
  const rest = qs.toString();
  redirect(`/${slug}/menu${rest ? `?${rest}` : ""}`);
}
