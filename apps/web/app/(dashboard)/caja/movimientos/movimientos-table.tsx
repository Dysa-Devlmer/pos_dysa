"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { SOFT_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

type TipoMov = "INGRESO" | "EGRESO" | "RETIRO" | "AJUSTE";

export interface MovimientoRow {
  id: number;
  fechaISO: string;
  tipo: TipoMov;
  monto: number; // signed para AJUSTE; positivo para resto
  motivo: string;
  cajeroNombre: string;
  cajaNombre: string;
  cajaUbicacion: string | null;
  aperturaId: number;
  aperturaEstado: "ABIERTA" | "CERRADA";
}

const TIPO_BADGE: Record<TipoMov, string> = {
  INGRESO: SOFT_BADGE.success,
  EGRESO: SOFT_BADGE.destructive,
  RETIRO:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-transparent",
  AJUSTE: SOFT_BADGE.info,
};

/** Calcula el signo aplicado (para color y prefijo del monto). */
function signoMov(tipo: TipoMov, monto: number): "+" | "-" | "" {
  if (tipo === "INGRESO") return "+";
  if (tipo === "EGRESO" || tipo === "RETIRO") return "-";
  // AJUSTE — usar signo del propio monto
  if (monto > 0) return "+";
  if (monto < 0) return "-";
  return "";
}

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

export function MovimientosTable({
  data,
  hasFiltro,
}: {
  data: MovimientoRow[];
  hasFiltro: boolean;
}) {
  const columns = React.useMemo<ColumnDef<MovimientoRow>[]>(
    () => [
      {
        accessorKey: "fechaISO",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatFechaHora(row.original.fechaISO)}
          </span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant="outline" className={TIPO_BADGE[row.original.tipo]}>
            {row.original.tipo}
          </Badge>
        ),
      },
      {
        accessorKey: "monto",
        header: () => <span className="text-right">Monto</span>,
        cell: ({ row }) => {
          const { tipo, monto } = row.original;
          const signo = signoMov(tipo, monto);
          const colorCls =
            signo === "+"
              ? "text-emerald-700 dark:text-emerald-400"
              : signo === "-"
                ? "text-red-700 dark:text-red-400"
                : "text-foreground";
          return (
            <span className={`tabular-nums font-semibold ${colorCls}`}>
              {signo}
              {formatCLP(Math.abs(monto))}
            </span>
          );
        },
      },
      {
        accessorKey: "motivo",
        header: "Motivo",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.motivo}</span>
        ),
      },
      {
        accessorKey: "cajaNombre",
        header: "Caja",
        cell: ({ row }) => (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">
              {row.original.cajaNombre}
            </span>
            {row.original.cajaUbicacion ? (
              <span className="text-[10px] text-muted-foreground">
                {row.original.cajaUbicacion}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "aperturaId",
        header: "Apertura",
        cell: ({ row }) => {
          const { aperturaId, aperturaEstado } = row.original;
          const isCerrada = aperturaEstado === "CERRADA";
          const inner = (
            <span className="font-mono text-xs">#{aperturaId}</span>
          );
          return (
            <div className="flex items-center gap-1.5">
              {isCerrada ? (
                <Link
                  href={`/caja/${aperturaId}/cierre`}
                  className="hover:underline"
                  title="Ver cierre Z"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
              <Badge
                variant="outline"
                className={
                  isCerrada
                    ? SOFT_BADGE.muted
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent"
                }
              >
                {aperturaEstado}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "cajeroNombre",
        header: "Cajero",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.cajeroNombre}</span>
        ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) =>
          row.original.aperturaEstado === "CERRADA" ? (
            <div className="flex justify-end gap-1">
              <IconButton
                label="Ver cierre Z"
                href={`/caja/${row.original.aperturaId}/cierre`}
              >
                <Eye className="size-4" />
              </IconButton>
            </div>
          ) : null,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="motivo"
      searchPlaceholder="Buscar en motivo (en página actual)..."
      emptyMessage="No hay movimientos en el filtro actual."
      emptyState={
        hasFiltro ? undefined : (
          <EmptyState
            illustration="receipt"
            title="Aún no hay movimientos de caja"
            description="Cuando registres ingresos, egresos, retiros o ajustes en la caja, aparecerán aquí con su histórico completo."
            ctaLabel="Ir a la caja"
            ctaHref="/caja"
          />
        )
      }
    />
  );
}
