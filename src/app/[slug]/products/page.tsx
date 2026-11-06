import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductsPage({ params }: Props) {
  const { slug } = await params;

  // 예전 /products 주소는 메뉴판(/[slug]/menu)으로
  redirect(`/${slug}/menu`);
}
