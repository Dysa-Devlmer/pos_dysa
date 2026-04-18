"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Inbox, Receipt, RotateCcw, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCLP } from "@/lib/utils";

export interface DevolucionRow {
  id: number;
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
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center"
      >
        <Inbox className="size-10 text-muted-foreground opacity-40" />
        <h3 className="text-base font-semibold">Sin devoluciones</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          No hay devoluciones registradas en el período. Para crear una, abre
          una venta y usa el botón “Nueva devolución”.
        </p>
      </motion.div>
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
              className="border-b last:border-0 hover:bg-muted/40"
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
                {d.esTotal ? (
                  <Badge variant="destructive" className="gap-1">
                    <RotateCcw className="size-3" />
                    Total
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    <RotateCcw className="size-3" />
                    Parcial
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {d.itemsCount}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                − {formatCLP(d.montoDevuelto)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Ver venta"
                >
                  <Link href={`/ventas/${d.ventaId}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
