import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@repo/db";
import { Button } from "@/components/ui/button";
import { ProductosTable, type ProductoRow } from "./productos-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage() {
  const [productos, categorias] = await Promise.all([
    prisma.producto.findMany({
      orderBy: { nombre: "asc" },
      include: { categoria: { select: { id: true, nombre: true } } },
    }),
    prisma.categoria.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  const rows: ProductoRow[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    codigoBarras: p.codigoBarras,
    categoriaId: p.categoriaId,
    categoriaNombre: p.categoria.nombre,
    precio: p.precio,
    stock: p.stock,
    alertaStock: p.alertaStock,
    activo: p.activo,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de productos, precios en CLP y control de stock.
        </p>
      </div>

      {categorias.length === 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            No hay categorías activas.
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Debes crear al menos una categoría antes de registrar productos.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/categorias">Ir a categorías</Link>
          </Button>
        </div>
      ) : null}

      <ProductosTable data={rows} categorias={categorias} />
    </div>
  );
}
