"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Rol } from "@repo/db";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { ROL_BADGE, estadoBadge } from "@/lib/badge-styles";
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
  return (
    <Badge variant="outline" className={ROL_BADGE[rol]}>
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
        cell: ({ row }) => (
          <Badge variant="outline" className={estadoBadge(row.original.activo)}>
            {row.original.activo ? "Activo" : "Inactivo"}
          </Badge>
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
              <IconButton
                label="Editar usuario"
                onClick={() => openEditar(row.original)}
              >
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                label={esYo ? "No puedes eliminarte" : "Eliminar usuario"}
                tone="destructive"
                disabled={esYo}
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(row.original);
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
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
        emptyState={
          <EmptyState
            illustration="users"
            title="No hay usuarios registrados"
            description={
              canManage
                ? "Crea el primer usuario para que pueda acceder al sistema."
                : "Solicita a un administrador que cree los usuarios."
            }
            ctaLabel={canManage ? "Crear usuario" : undefined}
            ctaOnClick={canManage ? openCrear : undefined}
          />
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
