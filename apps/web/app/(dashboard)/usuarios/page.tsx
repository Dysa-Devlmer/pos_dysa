import type { Metadata } from "next";
import { prisma } from "@repo/db";
import { auth } from "@/auth";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Gestiona los usuarios del sistema: crear, editar, desactivar."
            : "Vista solo lectura. Solo el rol ADMIN puede modificar usuarios."}
        </p>
      </div>

      {!canManage ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Tu rol actual no permite modificar usuarios. Contacta un ADMIN si
          necesitas acceso.
        </div>
      ) : null}

      <UsuariosTable
        data={rows}
        canManage={canManage}
        currentUserId={currentUserId}
      />
    </div>
  );
}
