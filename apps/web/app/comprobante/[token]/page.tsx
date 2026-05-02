import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicReceiptUrl,
  getPublicSaleReceipt,
} from "@/lib/public-receipts";

import { PublicSaleReceiptView } from "../receipt-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comprobante interno",
  robots: { index: false, follow: false },
};

export default async function PublicSaleReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getPublicSaleReceipt(token);
  if (!receipt) notFound();

  return (
    <PublicSaleReceiptView
      receipt={receipt}
      url={getPublicReceiptUrl(receipt.publicToken)}
    />
  );
}

