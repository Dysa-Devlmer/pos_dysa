"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Rol } from "@repo/db";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { UsuarioForm } from "./usuario-form";
import { eliminarUsuario } from "./actions";

export interface UsuarioRow {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

function RolBadge({ rol }: { rol: Rol }) {
  const styles: Record<Rol, string> = {
    ADMIN:
      "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-900",
    CAJERO:
      "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900",
    VENDEDOR:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900",
  };
  return (
    <Badge variant="outline" className={styles[rol]}>
      {rol}
    </Badge>
  );
}

export interface UsuariosTableProps {
  data: UsuarioRow[];
  canManage: boolean;
  currentUserId: string;
}

export function UsuariosTable({
  data,
  canManage,
  currentUserId,
}: UsuariosTableProps) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UsuarioRow | null>(null);
  const [deleting, setDeleting] = React.useState<UsuarioRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const openCrear = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditar = (row: UsuarioRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarUsuario(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      throw new Error(res.error);
    }
  };

  const columns = React.useMemo<ColumnDef<UsuarioRow>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.nombre}</span>
            {String(row.original.id) === currentUserId ? (
              <span className="text-xs text-muted-foreground">(tú)</span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "rol",
        header: "Rol",
        cell: ({ row }) => <RolBadge rol={row.original.rol} />,
      },
      {
        accessorKey: "activo",
        header: "Estado",
        cell: ({ row }) =>
          row.original.activo ? (
            <Badge variant="default">Activo</Badge>
          ) : (
            <Badge variant="secondary">Inactivo</Badge>
          ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!canManage) {
            return (
              <span className="text-xs text-muted-foreground">Solo lectura</span>
            );
          }
          const esYo = String(row.original.id) === currentUserId;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => openEditar(row.original)}
                aria-label="Editar"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(row.original);
                }}
                aria-label="Eliminar"
                disabled={esYo}
                title={esYo ? "No puedes eliminarte" : "Eliminar"}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage, currentUserId],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchKey="nombre"
        searchPlaceholder="Buscar usuario por nombre..."
        emptyMessage="No hay usuarios registrados."
        toolbar={
          canManage ? (
            <Button onClick={openCrear}>
              <Plus className="size-4" />
              Nuevo usuario
            </Button>
          ) : null
        }
      />

      {canManage ? (
        <>
          <UsuarioForm
            open={formOpen}
            onOpenChange={setFormOpen}
            usuario={editing}
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => {
              if (!open) {
                setDeleting(null);
                setDeleteError(null);
              }
            }}
            title="Eliminar usuario"
            description={
              <span>
                ¿Seguro que deseas eliminar{" "}
                <strong>{deleting?.nombre}</strong>? Esta acción no se puede
                deshacer.
                {deleteError ? (
                  <span className="mt-2 block text-destructive">
                    {deleteError}
                  </span>
                ) : null}
              </span>
            }
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </>
  );
}
