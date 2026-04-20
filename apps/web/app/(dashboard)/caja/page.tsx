import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { CajaPos, type ProductoCaja, type CategoriaCaja } from "./caja-pos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaPage() {
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
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">POS Caja</h1>
          <p className="text-sm text-muted-foreground">
            Punto de venta: busca, cobra y genera la boleta en un solo flujo.
          </p>
        </div>
      </div>

      <CajaPos productos={productosCaja} categorias={categorias as CategoriaCaja[]} />
    </div>
  );
}
