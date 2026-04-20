"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Printer, Receipt } from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { METODO_PAGO_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────

export interface BoletaData {
  id: number;
  numeroBoleta: string;
  fecha: string; // ISO
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  /** Subtotal bruto (suma de precios * cantidad, sin descuento). */
  subtotal: number;
  /** Porcentaje de descuento aplicado (0 si no hay). */
  descuentoPct?: number;
  /** Monto CLP del descuento fijo efectivo (ya truncado si superaba la base). */
  descuentoMonto?: number;
  /** Monto CLP del descuento porcentual (derivado). */
  descuentoPorcentual?: number;
  /** Base imponible (subtotal − descuentos). */
  baseImponible?: number;
  impuesto: number;
  total: number;
  metodoPago: MetodoPago;
  montoRecibido: number | null;
  vuelto: number | null;
  cliente: { nombre: string; rut: string } | null;
}

export interface BoletaModalProps {
  boleta: BoletaData | null;
  onClose: () => void;
}

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// ──────────────────────────────────────────────────────────────────────────

export function BoletaModal({ boleta, onClose }: BoletaModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={boleta !== null} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md print:shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            Venta registrada
          </DialogTitle>
          <DialogDescription>
            Boleta electrónica emitida correctamente.
          </DialogDescription>
        </DialogHeader>

        {boleta ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.05 }}
            className="space-y-4"
          >
            {/* ─── Vista imprimible ─── */}
            <div
              id="boleta-print"
              className="rounded-md border bg-background p-4 font-mono text-xs print:border-0 print:p-0"
            >
              <div className="text-center">
                <Receipt
                  className="mx-auto mb-2 size-7"
                  aria-hidden="true"
                />
                <p className="text-base font-bold tracking-wide">POS CHILE</p>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Boleta electrónica
                </p>
              </div>

              <div className="my-3 border-t border-dashed" />

              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>N° Boleta</span>
                  <span className="font-semibold">{boleta.numeroBoleta}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha</span>
                  <span>{formatFechaHora(boleta.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pago</span>
                  <span className="font-semibold">{boleta.metodoPago}</span>
                </div>
                {boleta.cliente ? (
                  <>
                    <div className="flex justify-between">
                      <span>Cliente</span>
                      <span>{boleta.cliente.nombre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RUT</span>
                      <span>{boleta.cliente.rut}</span>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="my-3 border-t border-dashed" />

              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left">Item</th>
                    <th className="text-right">Cant.</th>
                    <th className="text-right">Subt.</th>
                  </tr>
                </thead>
                <tbody>
                  {boleta.items.map((it, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1">
                        <div className="truncate">{it.nombre}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatCLP(it.precioUnitario)} c/u
                        </div>
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {it.cantidad}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {formatCLP(it.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-3 border-t border-dashed" />

              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatCLP(boleta.subtotal)}
                  </span>
                </div>
                {boleta.descuentoPorcentual && boleta.descuentoPorcentual > 0 ? (
                  <div className="flex justify-between">
                    <span>
                      Descuento (
                      {Number(boleta.descuentoPct ?? 0).toLocaleString("es-CL", {
                        maximumFractionDigits: 2,
                      })}
                      %)
                    </span>
                    <span className="tabular-nums">
                      − {formatCLP(boleta.descuentoPorcentual)}
                    </span>
                  </div>
                ) : null}
                {boleta.descuentoMonto && boleta.descuentoMonto > 0 ? (
                  <div className="flex justify-between">
                    <span>Descuento fijo</span>
                    <span className="tabular-nums">
                      − {formatCLP(boleta.descuentoMonto)}
                    </span>
                  </div>
                ) : null}
                {(boleta.descuentoPorcentual ?? 0) +
                  (boleta.descuentoMonto ?? 0) >
                0 ? (
                  <div className="flex justify-between">
                    <span>Base imponible</span>
                    <span className="tabular-nums">
                      {formatCLP(boleta.baseImponible ?? boleta.subtotal)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>IVA 19%</span>
                  <span className="tabular-nums">
                    {formatCLP(boleta.impuesto)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between border-t pt-1 text-sm font-bold">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatCLP(boleta.total)}</span>
                </div>
                {boleta.metodoPago === "EFECTIVO" &&
                boleta.montoRecibido !== null ? (
                  <>
                    <div className="flex justify-between pt-1">
                      <span>Recibido</span>
                      <span className="tabular-nums">
                        {formatCLP(boleta.montoRecibido)}
                      </span>
                    </div>
                    {boleta.vuelto !== null ? (
                      <div className="flex justify-between font-semibold">
                        <span>Vuelto</span>
                        <span className="tabular-nums">
                          {formatCLP(boleta.vuelto)}
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="my-3 border-t border-dashed" />

              <p className="text-center text-[10px] text-muted-foreground">
                Gracias por su compra
              </p>
            </div>

            {/* ─── Meta fuera de la impresión ─── */}
            <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs print:hidden">
              <div>
                <p className="text-muted-foreground">ID interno</p>
                <p className="font-mono">#{boleta.id}</p>
              </div>
              <Badge variant="outline" className={METODO_PAGO_BADGE[boleta.metodoPago]}>
                {boleta.metodoPago}
              </Badge>
            </div>

            <DialogFooter className="gap-2 sm:justify-between print:hidden">
              <Button asChild variant="outline" size="sm">
                <Link href={`/ventas/${boleta.id}`}>
                  <FileText className="size-4" />
                  Ver detalle
                </Link>
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handlePrint}>
                  <Printer className="size-4" />
                  Imprimir
                </Button>
                <Button type="button" onClick={onClose}>
                  Nueva venta
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
