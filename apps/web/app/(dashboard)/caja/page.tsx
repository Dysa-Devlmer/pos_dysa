import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { formatCLP } from "@/lib/utils";

import { CajaPos, type ProductoCaja, type CategoriaCaja } from "./caja-pos";
import { obtenerAperturaActiva } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const usuarioId = Number(session.user.id);

  // F-9: Caja requiere apertura activa para operar.
  const apertura = await obtenerAperturaActiva(usuarioId);
  if (!apertura) redirect("/caja/abrir");

  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ ventas: "desc" }, { nombre: "asc" }],
      take: 120,
      include: { categoria: { select: { id: true, nombre: true } } },
    }),
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const productosCaja: ProductoCaja[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoBarras: p.codigoBarras,
    precio: p.precio,
    stock: p.stock,
    alertaStock: p.alertaStock,
    categoriaId: p.categoria.id,
    categoriaNombre: p.categoria.nombre,
  }));

  return (
    <div className="space-y-4 print:hidden">
      <PageHeader
        title="POS Caja"
        subtitle="Punto de venta: busca, cobra y genera la boleta en un solo flujo."
        meta={
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <span className="text-muted-foreground">Apertura</span>
            <span className="font-mono">#{apertura.id}</span>
            <span aria-hidden>·</span>
            <span>{apertura.caja.nombre}</span>
            <span aria-hidden>·</span>
            <span className="text-muted-foreground">inicial</span>
            <span className="tabular-nums">
              {formatCLP(apertura.montoInicial)}
            </span>
          </Badge>
        }
        action={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/caja/movimientos/nuevo">Movimiento</Link>
            </Button>
            <Button asChild variant="destructive" size="sm">
              <Link href="/caja/cerrar">Cerrar caja</Link>
            </Button>
          </>
        }
      />

      <CajaPos productos={productosCaja} categorias={categorias as CategoriaCaja[]} />
    </div>
  );
}
