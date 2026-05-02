"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Receipt, RotateCcw, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/icon-button";
import { ReceiptShareButton } from "@/components/receipt-share-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { devolucionBadge } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

export interface DevolucionRow {
  id: number;
  publicToken: string;
  fechaISO: string;
  motivo: string;
  montoDevuelto: number;
  esTotal: boolean;
  itemsCount: number;
  ventaId: number;
  ventaNumeroBoleta: string;
  ventaTotal: number;
  clienteNombre: string | null;
  usuarioNombre: string;
}

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function DevolucionesList({ data }: { data: DevolucionRow[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        illustration="cart"
        title="Sin devoluciones"
        description="No hay devoluciones registradas en el período. Para crear una, abre una venta y usa el botón “Nueva devolución”."
      />
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.04 }}
      className="overflow-hidden rounded-md border bg-background"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Boleta original</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Monto devuelto</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <motion.tr
              key={d.id}
              variants={rowVariants}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-200"
            >
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {formatFechaHora(d.fechaISO)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/ventas/${d.ventaId}`}
                  className="flex items-center gap-1.5 font-mono text-xs font-medium hover:underline"
                >
                  <Receipt className="size-3 text-muted-foreground" />
                  {d.ventaNumeroBoleta}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs">
                <span className="line-clamp-2 text-sm">{d.motivo}</span>
              </TableCell>
              <TableCell>
                {d.clienteNombre ? (
                  <span className="flex items-center gap-1.5 text-sm">
                    <User className="size-3 text-muted-foreground" />
                    {d.clienteNombre}
                  </span>
                ) : (
                  <span className="text-sm italic text-muted-foreground">
                    Sin cliente
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">{d.usuarioNombre}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`gap-1 ${devolucionBadge(d.esTotal)}`}
                >
                  <RotateCcw className="size-3" />
                  {d.esTotal ? "Total" : "Parcial"}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {d.itemsCount}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                − {formatCLP(d.montoDevuelto)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <ReceiptShareButton
                    path={`/comprobante/devolucion/${d.publicToken}`}
                    title={`Devolución ${d.ventaNumeroBoleta}`}
                    text={`Comprobante interno de devolución DyPos CL ${d.ventaNumeroBoleta}`}
                    label="Compartir"
                  />
                  <IconButton
                    label="Ver venta original"
                    href={`/ventas/${d.ventaId}`}
                  >
                    <Eye className="size-4" />
                  </IconButton>
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
