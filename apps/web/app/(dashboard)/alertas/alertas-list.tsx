"use client";

import { motion } from "framer-motion";
import { AlertTriangle, PackageX, Pencil } from "lucide-react";

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

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function AlertasList({ data }: { data: AlertaProductoRow[] }) {
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
            <TableHead className="text-right">Stock actual</TableHead>
            <TableHead className="text-right">Umbral</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
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
              <TableCell className="text-right tabular-nums">
                <span
                  className={
                    p.sinStock
                      ? "font-semibold text-red-700 dark:text-red-400"
                      : "font-semibold text-amber-700 dark:text-amber-400"
                  }
                >
                  {p.stock}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                ≤ {p.alertaStock}
              </TableCell>
              <TableCell>
                {p.sinStock ? (
                  <Badge variant="outline" className={`gap-1 ${SOFT_BADGE.destructive}`}>
                    <PackageX className="size-3" />
                    Sin stock
                  </Badge>
                ) : (
                  <Badge variant="outline" className={`gap-1 ${SOFT_BADGE.warning}`}>
                    <AlertTriangle className="size-3" />
                    Stock bajo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCLP(p.precio)}
              </TableCell>
              <TableCell className="text-right">
                <IconButton label="Editar producto" href="/productos">
                  <Pencil className="size-4" />
                </IconButton>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  );
}
