"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { formatCLP } from "@/lib/utils";
import { ClienteForm } from "./cliente-form";
import { eliminarCliente } from "./actions";

export interface ClienteRow {
  id: number;
  rut: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  comprasTotal: number;
  ultimaCompra: string | null; // ISO date
}

function formatFechaCL(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function ClientesTable({ data }: { data: ClienteRow[] }) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClienteRow | null>(null);
  const [deleting, setDeleting] = React.useState<ClienteRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const openCrear = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditar = (row: ClienteRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarCliente(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      throw new Error(res.error);
    }
  };

  const columns = React.useMemo<ColumnDef<ClienteRow>[]>(
    () => [
      {
        accessorKey: "rut",
        header: "RUT",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.rut}</span>
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
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.email ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.telefono ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "comprasTotal",
        header: "Compras totales",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatCLP(row.original.comprasTotal)}
          </span>
        ),
      },
      {
        accessorKey: "ultimaCompra",
        header: "Última compra",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatFechaCL(row.original.ultimaCompra)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
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
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
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
        searchPlaceholder="Buscar cliente por nombre..."
        emptyMessage="No hay clientes registrados."
        toolbar={
          <Button onClick={openCrear}>
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <ClienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar cliente"
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
