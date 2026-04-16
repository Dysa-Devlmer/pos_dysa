"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { formatCLP } from "@/lib/utils";
import { ProductoForm } from "./producto-form";
import { eliminarProducto } from "./actions";

export interface ProductoRow {
  id: number;
  nombre: string;
  descripcion: string | null;
  codigoBarras: string;
  categoriaId: number;
  categoriaNombre: string;
  precio: number;
  stock: number;
  activo: boolean;
}

export function ProductosTable({
  data,
  categorias,
}: {
  data: ProductoRow[];
  categorias: Array<{ id: number; nombre: string }>;
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProductoRow | null>(null);
  const [deleting, setDeleting] = React.useState<ProductoRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const openCrear = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditar = (row: ProductoRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    const res = await eliminarProducto(deleting.id);
    if (!res.ok) {
      setDeleteError(res.error);
      throw new Error(res.error);
    }
  };

  const columns = React.useMemo<ColumnDef<ProductoRow>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Producto",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.nombre}</span>
            {row.original.descripcion ? (
              <span className="truncate text-xs text-muted-foreground">
                {row.original.descripcion}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "categoriaNombre",
        header: "Categoría",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.categoriaNombre}</Badge>
        ),
      },
      {
        accessorKey: "codigoBarras",
        header: "Código de barras",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.codigoBarras}</span>
        ),
      },
      {
        accessorKey: "precio",
        header: "Precio",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatCLP(row.original.precio)}
          </span>
        ),
      },
      {
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const s = row.original.stock;
          const tone =
            s <= 0
              ? "text-destructive"
              : s < 10
                ? "text-amber-600 dark:text-amber-500"
                : "text-foreground";
          return <span className={`tabular-nums ${tone}`}>{s}</span>;
        },
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
        searchPlaceholder="Buscar producto..."
        emptyMessage="No hay productos registrados."
        toolbar={
          <Button onClick={openCrear} disabled={categorias.length === 0}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

      <ProductoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categorias={categorias}
        producto={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar producto"
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
