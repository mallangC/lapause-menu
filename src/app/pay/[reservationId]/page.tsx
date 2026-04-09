import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PayConfirmClient from "./PayConfirmClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: Promise<{ reservationId: string }>;
}

export default async function PayPage({ params }: Props) {
  const { reservationId } = await params;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, product_name, final_price, paid, company_id")
    .eq("id", reservationId)
    .single();

  if (!reservation) notFound();

  const { data: companyRaw } = await supabase
    .from("companies")
    .select("name, settings:company_settings(bank_name, bank_account, bank_holder)")
    .eq("id", reservation.company_id)
    .single();
  const companySettings = companyRaw?.settings as { bank_name?: string; bank_account?: string; bank_holder?: string } | null;

  return (
    <PayConfirmClient
      reservationId={reservation.id}
      companyName={companyRaw?.name ?? ""}
      productName={reservation.product_name}
      finalPrice={reservation.final_price}
      bankName={companySettings?.bank_name ?? null}
      bankAccount={companySettings?.bank_account ?? null}
      bankHolder={companySettings?.bank_holder ?? null}
      alreadyPaid={reservation.paid}
    />
  );
}
