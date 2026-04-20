"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, PackageX, Pencil, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SOFT_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

import type { AlertaProductoRow } from "./actions";

type Urgencia = "critico" | "bajo" | "advertencia";

function clasificar(p: AlertaProductoRow): Urgencia {
  if (p.stock <= 0) return "critico";
  // Mitad del umbral o menos → Bajo
  if (p.stock <= Math.max(1, Math.floor(p.alertaStock / 2))) return "bajo";
  return "advertencia";
}

const ORDEN: Record<Urgencia, number> = {
  critico: 0,
  bajo: 1,
  advertencia: 2,
};

const BADGE_STYLES: Record<Urgencia, string> = {
  critico: SOFT_BADGE.destructive,
  // "bajo" usa orange (entre red y amber) — mantiene gradación visual soft.
  bajo:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-transparent",
  advertencia: SOFT_BADGE.warning,
};

const ICONS: Record<Urgencia, React.ComponentType<{ className?: string }>> = {
  critico: PackageX,
  bajo: AlertTriangle,
  advertencia: TriangleAlert,
};

const LABELS: Record<Urgencia, string> = {
  critico: "Crítico",
  bajo: "Bajo",
  advertencia: "Advertencia",
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function AlertasList({ data }: { data: AlertaProductoRow[] }) {
  // Orden por urgencia, luego stock asc, luego nombre asc
  const sorted = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const ua = clasificar(a);
      const ub = clasificar(b);
      if (ORDEN[ua] !== ORDEN[ub]) return ORDEN[ua] - ORDEN[ub];
      if (a.stock !== b.stock) return a.stock - b.stock;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [data]);

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
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Urgencia</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Umbral</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const urg = clasificar(p);
            const Icon = ICONS[urg];
            return (
              <motion.tr
                key={p.id}
                variants={rowVariants}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-200"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {p.codigoBarras}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.categoriaNombre}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${BADGE_STYLES[urg]}`}
                  >
                    <Icon className="size-3" />
                    {LABELS[urg]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      urg === "critico"
                        ? "font-semibold text-red-700 dark:text-red-400"
                        : urg === "bajo"
                          ? "font-semibold text-orange-700 dark:text-orange-400"
                          : "font-semibold text-amber-700 dark:text-amber-400"
                    }
                  >
                    {p.stock}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  ≤ {p.alertaStock}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCLP(p.precio)}
                </TableCell>
                <TableCell className="text-right">
                  <IconButton label="Ver producto" href="/productos">
                    <Pencil className="size-4" />
                  </IconButton>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </motion.div>
  );
}
