import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicReceiptUrl,
  getPublicRefundReceipt,
} from "@/lib/public-receipts";

import { PublicRefundReceiptView } from "../../receipt-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comprobante interno de devolución",
  robots: { index: false, follow: false },
};

export default async function PublicRefundReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getPublicRefundReceipt(token);
  if (!receipt) notFound();

  return (
    <PublicRefundReceiptView
      receipt={receipt}
      url={getPublicReceiptUrl(receipt.publicToken, "devolucion")}
    />
  );
}
