import { prisma } from "@repo/db";
import { CajaPos, type ProductoFrecuente } from "./caja-pos";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  // Productos más vendidos (si hay ventas) o recientes como fallback
  const topVendidos = await prisma.producto.findMany({
    where: { activo: true, stock: { gt: 0 } },
    orderBy: [{ ventas: "desc" }, { updatedAt: "desc" }],
    take: 12,
    include: { categoria: { select: { nombre: true } } },
  });

  const frecuentes: ProductoFrecuente[] = topVendidos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigoBarras: p.codigoBarras,
    precio: p.precio,
    stock: p.stock,
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

      <CajaPos productosFrecuentes={frecuentes} />
    </div>
  );
}
