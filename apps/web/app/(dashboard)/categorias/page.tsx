import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { CategoriasTable, type CategoriaRow } from "./categorias-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { productos: true } } },
  });

  const rows: CategoriaRow[] = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    descripcion: c.descripcion,
    activa: c.activa,
    productos: c._count.productos,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
        <p className="text-sm text-muted-foreground">
          Administra las categorías del catálogo de productos.
        </p>
      </div>
      <CategoriasTable data={rows} />
    </div>
  );
}
