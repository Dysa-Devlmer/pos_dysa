"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/icon-button";
import { estadoBadge } from "@/lib/badge-styles";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { CategoriaForm } from "./categoria-form";
import { eliminarCategoria } from "./actions";

export interface CategoriaRow {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  productos: number;
}

export function CategoriasTable({ data }: { data: CategoriaRow[] }) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoriaRow | null>(null);
  const [deleting, setDeleting] = React.useState<CategoriaRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const openCrear = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditar = (row: CategoriaRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarCategoria(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      toast.error(res.error);
      return false;
    }
  };

  const columns = React.useMemo<ColumnDef<CategoriaRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            #{row.original.id}
          </span>
        ),
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.descripcion ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "activa",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant="outline" className={estadoBadge(row.original.activa)}>
            {row.original.activa ? "Activa" : "Inactiva"}
          </Badge>
        ),
      },
      {
        accessorKey: "productos",
        header: "# Productos",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.productos}</span>
        ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <IconButton
              label="Editar categoría"
              onClick={() => openEditar(row.original)}
            >
              <Pencil className="size-4" />
            </IconButton>
            <IconButton
              label="Eliminar categoría"
              tone="destructive"
              onClick={() => {
                setDeleteError(null);
                setDeleting(row.original);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchKey="nombre"
        searchPlaceholder="Buscar categoría..."
        emptyMessage="No hay categorías registradas."
        toolbar={
          <Button onClick={openCrear}>
            <Plus className="size-4" />
            Nueva categoría
          </Button>
        }
        emptyState={
          <EmptyState
            illustration="inbox"
            title="Aún no tienes categorías"
            description="Organiza tus productos creando una primera categoría."
            ctaLabel="Crear categoría"
            ctaOnClick={openCrear}
          />
        }
      />

      <CategoriaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categoria={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar categoría"
        description={
          <span>
            ¿Seguro que deseas eliminar{" "}
            <strong>{deleting?.nombre}</strong>? Esta acción no se puede
            deshacer.
            {deleteError ? (
              <span className="mt-2 block text-destructive">{deleteError}</span>
            ) : null}
          </span>
        }
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </>
  );
}
