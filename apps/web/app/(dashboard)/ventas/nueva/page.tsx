import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VentaCarrito } from "@/components/venta-carrito";

export const dynamic = "force-dynamic";

export default function NuevaVentaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva venta</h1>
          <p className="text-sm text-muted-foreground">
            Agrega productos al carrito, asocia cliente (opcional) y confirma
            el pago.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/ventas">
            <ArrowLeft className="size-4" />
            Volver a ventas
          </Link>
        </Button>
      </div>

      <VentaCarrito mode="crear" />
    </div>
  );
}
