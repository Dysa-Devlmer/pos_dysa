import type { Metadata } from "next";
import { prisma } from "@repo/db";

import { auth } from "@/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";

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
      <PageHeader
        title="Cajas"
        subtitle={
          canManage
            ? "Gestiona las cajas registradoras del local: crear, editar, desactivar."
            : "Vista solo lectura. Solo el rol ADMIN puede modificar cajas."
        }
      />

      {!canManage ? (
        <Alert variant="warning">
          <AlertDescription>
            Tu rol actual no permite modificar cajas. Contacta un ADMIN si
            necesitas crear una nueva caja.
          </AlertDescription>
        </Alert>
      ) : null}

      <CajasTable data={rows} canManage={canManage} />
    </div>
  );
}
