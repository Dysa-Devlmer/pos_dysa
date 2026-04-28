"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { estadoBadge } from "@/lib/badge-styles";

import { eliminarCaja } from "./actions";
import { CajaForm } from "./caja-form";
import type { CajaRow } from "./types";

export interface CajasTableProps {
  data: CajaRow[];
  canManage: boolean;
}

export function CajasTable({ data, canManage }: CajasTableProps) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CajaRow | null>(null);
  const [deleting, setDeleting] = React.useState<CajaRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const openCrear = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditar = (row: CajaRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarCaja(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      toast.error(res.error);
      return false;
    }
    toast.success("Caja eliminada");
  };

  const columns = React.useMemo<ColumnDef<CajaRow>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.nombre}</span>
        ),
      },
      {
        accessorKey: "ubicacion",
        header: "Ubicación",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.ubicacion ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "aperturas",
        header: "Aperturas",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.aperturas}
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
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          if (!canManage) {
            return (
              <span className="text-xs text-muted-foreground">
                Solo lectura
              </span>
            );
          }
          const tieneAperturas = row.original.aperturas > 0;
          return (
            <div className="flex justify-end gap-1">
              <IconButton
                label="Editar caja"
                onClick={() => openEditar(row.original)}
              >
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                label={
                  tieneAperturas
                    ? "Tiene aperturas — desactiva en su lugar"
                    : "Eliminar caja"
                }
                tone="destructive"
                disabled={tieneAperturas}
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
    [canManage],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchKey="nombre"
        searchPlaceholder="Buscar caja por nombre..."
        emptyMessage="No hay cajas registradas."
        toolbar={
          canManage ? (
            <Button onClick={openCrear}>
              <Plus className="size-4" />
              Nueva caja
            </Button>
          ) : null
        }
        emptyState={
          <EmptyState
            illustration="box"
            title="No hay cajas registradas"
            description={
              canManage
                ? "Crea la primera caja registradora para empezar a abrir turnos."
                : "Solicita a un administrador que cree las cajas."
            }
            ctaLabel={canManage ? "Crear caja" : undefined}
            ctaOnClick={canManage ? openCrear : undefined}
          />
        }
      />

      {canManage ? (
        <>
          <CajaForm
            open={formOpen}
            onOpenChange={setFormOpen}
            caja={editing}
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => {
              if (!open) {
                setDeleting(null);
                setDeleteError(null);
              }
            }}
            title="Eliminar caja"
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
