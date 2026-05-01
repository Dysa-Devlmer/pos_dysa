import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { auth } from "@/auth";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";

import { UsuariosTable, type UsuarioRow } from "./usuarios-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const session = await auth();
  const canManage = session?.user?.rol === "ADMIN";
  const currentUserId = session?.user?.id ?? "";

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
    },
  });

  const rows: UsuarioRow[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle={
          canManage
            ? "Gestiona los usuarios del sistema: crear, editar, desactivar."
            : "Vista solo lectura. Solo el rol ADMIN puede modificar usuarios."
        }
      />

      {!canManage ? (
        <Alert variant="warning">
          <AlertDescription>
            Tu rol actual no permite modificar usuarios. Contacta un ADMIN
            si necesitas acceso.
          </AlertDescription>
        </Alert>
      ) : null}

      <UsuariosTable
        data={rows}
        canManage={canManage}
        currentUserId={currentUserId}
      />
    </div>
  );
}
