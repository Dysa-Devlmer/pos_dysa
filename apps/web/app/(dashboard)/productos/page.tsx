import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@repo/db";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title="Productos"
        subtitle="Catálogo de productos, precios en CLP y control de stock."
      />

      {categorias.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>No hay categorías activas</AlertTitle>
          <AlertDescription>
            Debes crear al menos una categoría antes de registrar productos.
          </AlertDescription>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/categorias">Ir a categorías</Link>
          </Button>
        </Alert>
      ) : null}

      <ProductosTable data={rows} categorias={categorias} />
    </div>
  );
}
