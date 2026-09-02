import { Suspense } from "react";
import PayClient from "./PayClient";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string; code?: string; message?: string }>;
}) {
  const { slug, token } = await params;
  const sp = await searchParams;

  return (
    <Suspense>
      <PayClient
        slug={slug}
        token={token}
        initialPaymentKey={sp.paymentKey ?? null}
        initialOrderId={sp.orderId ?? null}
        initialAmount={sp.amount ? Number(sp.amount) : null}
        failCode={sp.code ?? null}
        failMessage={sp.message ?? null}
      />
    </Suspense>
  );
}
