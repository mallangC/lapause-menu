import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import PayConfirmClient from "./PayConfirmClient";

interface Props {
  params: Promise<{ reservationId: string }>;
}

export default async function PayPage({ params }: Props) {
  const { reservationId } = await params;
  const supabase = createServiceClient();

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, product_name, final_price, paid, company_id")
    .eq("id", reservationId)
    .single();

  if (!reservation) notFound();

  const { data: company } = await supabase
    .from("companies")
    .select("name, bank_name, bank_account, bank_holder")
    .eq("id", reservation.company_id)
    .single();

  return (
    <PayConfirmClient
      reservationId={reservation.id}
      companyName={company?.name ?? ""}
      productName={reservation.product_name}
      finalPrice={reservation.final_price}
      bankName={company?.bank_name ?? null}
      bankAccount={company?.bank_account ?? null}
      bankHolder={company?.bank_holder ?? null}
      alreadyPaid={reservation.paid}
    />
  );
}
