"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { MetodoPago } from "@repo/db";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { formatCLP } from "@/lib/utils";
import { eliminarVenta } from "./actions";

export interface VentaRow {
  id: number;
  numeroBoleta: string;
  fechaISO: string;
  clienteNombre: string | null;
  clienteRut: string | null;
  usuarioNombre: string;
  metodoPago: MetodoPago;
  total: number;
  items: number;
  descuentoPct: number;
  descuentoMonto: number;
  /** Descuento total en CLP (porcentual + fijo) para mostrar en columna. */
  descuentoTotal: number;
}

const METODO_STYLES: Record<MetodoPago, string> = {
  EFECTIVO:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-900",
  DEBITO:
    "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-900",
  CREDITO:
    "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-900",
  TRANSFERENCIA:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-900",
};

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function VentasTable({ data }: { data: VentaRow[] }) {
  const [deleting, setDeleting] = React.useState<VentaRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarVenta(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      throw new Error(res.error);
    }
  };

  const columns = React.useMemo<ColumnDef<VentaRow>[]>(
    () => [
      {
        accessorKey: "numeroBoleta",
        header: "Nº Boleta",
        cell: ({ row }) => (
          <Link
            href={`/ventas/${row.original.id}`}
            className="font-mono text-xs font-medium hover:underline"
          >
            {row.original.numeroBoleta}
          </Link>
        ),
      },
      {
        accessorKey: "fechaISO",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatFechaHora(row.original.fechaISO)}
          </span>
        ),
      },
      {
        accessorKey: "clienteNombre",
        header: "Cliente",
        cell: ({ row }) =>
          row.original.clienteNombre ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {row.original.clienteNombre}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {row.original.clienteRut}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sin cliente</span>
          ),
      },
      {
        accessorKey: "usuarioNombre",
        header: "Vendedor",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.usuarioNombre}</span>
        ),
      },
      {
        accessorKey: "items",
        header: "Items",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.items}</span>
        ),
      },
      {
        accessorKey: "metodoPago",
        header: "Pago",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={METODO_STYLES[row.original.metodoPago]}
          >
            {row.original.metodoPago}
          </Badge>
        ),
      },
      {
        accessorKey: "descuentoTotal",
        header: "Descuento",
        cell: ({ row }) => {
          const { descuentoTotal, descuentoPct } = row.original;
          if (descuentoTotal <= 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-col items-start leading-tight">
              <span className="tabular-nums text-sm font-medium text-amber-700 dark:text-amber-400">
                − {formatCLP(descuentoTotal)}
              </span>
              {descuentoPct > 0 ? (
                <span className="text-[10px] text-muted-foreground">
                  {Number(descuentoPct).toLocaleString("es-CL", {
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => (
          <span className="tabular-nums font-semibold">
            {formatCLP(row.original.total)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Ver">
              <Link href={`/ventas/${row.original.id}`}>
                <Eye className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Editar">
              <Link href={`/ventas/${row.original.id}/editar`}>
                <Pencil className="size-4" />
              </Link>
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
        searchKey="numeroBoleta"
        searchPlaceholder="Buscar por nº boleta..."
        emptyMessage="No hay ventas en el rango seleccionado."
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar venta"
        description={
          <span>
            ¿Eliminar la boleta <strong>{deleting?.numeroBoleta}</strong>?
            <br />
            Se <strong>devolverá el stock</strong> de los productos y se
            recalculará el historial del cliente.
            {deleteError ? (
              <span className="mt-2 block text-destructive">{deleteError}</span>
            ) : null}
          </span>
        }
        confirmLabel="Eliminar venta"
        onConfirm={handleDelete}
      />
    </>
  );
}
