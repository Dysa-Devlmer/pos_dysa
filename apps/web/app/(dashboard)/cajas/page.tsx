import type { Metadata } from "next";
import { prisma } from "@repo/db";

import { auth } from "@/auth";

import { CajasTable } from "./cajas-table";
import type { CajaRow } from "./types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cajas" };

export default async function CajasPage() {
  const session = await auth();
  const canManage = session?.user?.rol === "ADMIN";

  const cajas = await prisma.caja.findMany({
    orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      ubicacion: true,
      activa: true,
      _count: { select: { aperturas: true } },
    },
  });

  const rows: CajaRow[] = cajas.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    ubicacion: c.ubicacion,
    activa: c.activa,
    aperturas: c._count.aperturas,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cajas</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Gestiona las cajas registradoras del local: crear, editar, desactivar."
            : "Vista solo lectura. Solo el rol ADMIN puede modificar cajas."}
        </p>
      </div>

      {!canManage ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Tu rol actual no permite modificar cajas. Contacta un ADMIN si
          necesitas crear una nueva caja.
        </div>
      ) : null}

      <CajasTable data={rows} canManage={canManage} />
    </div>
  );
}
