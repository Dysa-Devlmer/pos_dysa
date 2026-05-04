import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@repo/db";

import { PageHeader } from "@/components/page-header";
import { auth } from "@/auth";

import { CategoriasTable, type CategoriaRow } from "./categorias-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  // Patch RBAC Fase 3D.4 — categorías es ADMIN-only.
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "ADMIN") {
    redirect("/?error=admin_required");
  }

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
      <PageHeader
        title="Categorías"
        subtitle="Administra las categorías del catálogo de productos."
      />
      <CategoriasTable data={rows} />
    </div>
  );
}
