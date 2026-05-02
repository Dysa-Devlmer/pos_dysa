"use client";

import { Printer } from "lucide-react";

import { ReceiptShareButton } from "@/components/receipt-share-button";
import { Button } from "@/components/ui/button";

export function PublicReceiptActions({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:justify-end">
      <ReceiptShareButton url={url} title={title} text={text} />
      <Button type="button" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" />
        Imprimir comprobante
      </Button>
    </div>
  );
}

