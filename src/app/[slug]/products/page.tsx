import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductsPage({ params }: Props) {
  const { slug } = await params;

  // searchParams가 없는 경우 /[slug]로 리다이렉트
  redirect(`/${slug}`);
}
