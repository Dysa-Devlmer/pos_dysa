import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { VentaCarrito } from "@/components/venta-carrito";

export const dynamic = "force-dynamic";

export default function NuevaVentaPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva venta"
        subtitle="Agrega productos al carrito, asocia cliente (opcional) y confirma el pago."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/ventas">
              <ArrowLeft className="size-4" />
              Volver a ventas
            </Link>
          </Button>
        }
      />
      <VentaCarrito mode="crear" />
    </div>
  );
}
