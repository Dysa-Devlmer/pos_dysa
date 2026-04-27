import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
import { CajaPos, type ProductoCaja, type CategoriaCaja } from "./caja-pos";
import { obtenerAperturaActiva } from "./actions";
import { formatCLP } from "@/lib/utils";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">POS Caja</h1>
          <p className="text-sm text-muted-foreground">
            Punto de venta: busca, cobra y genera la boleta en un solo flujo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
            <span className="text-muted-foreground">Apertura</span>{" "}
            <span className="font-mono">#{apertura.id}</span>
            {" · "}
            <span>{apertura.caja.nombre}</span>
            {" · inicial "}
            <span className="tabular-nums">{formatCLP(apertura.montoInicial)}</span>
          </span>
          <Link
            href="/caja/movimientos/nuevo"
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-muted"
          >
            Movimiento
          </Link>
          <Link
            href="/caja/cerrar"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
          >
            Cerrar caja
          </Link>
        </div>
      </div>

      <CajaPos productos={productosCaja} categorias={categorias as CategoriaCaja[]} />
    </div>
  );
}
