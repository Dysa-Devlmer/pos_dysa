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
    if (!boleta) return;

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;

    const fechaFormateada = formatFechaHora(boleta.fecha);

    const itemsHTML = boleta.items
      .map(
        (it) => `
        <tr>
          <td class="item-nombre">
            <div>${it.nombre}</div>
            <div class="precio-unitario">${formatCLP(it.precioUnitario)} c/u</div>
          </td>
          <td class="text-right">${it.cantidad}</td>
          <td class="text-right">${formatCLP(it.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const descuentosHTML = (() => {
      let html = "";
      if (boleta.descuentoPorcentual && boleta.descuentoPorcentual > 0) {
        const pct = Number(boleta.descuentoPct ?? 0).toLocaleString("es-CL", {
          maximumFractionDigits: 2,
        });
        html += `
          <div class="row">
            <span>Descuento (${pct}%)</span>
            <span>− ${formatCLP(boleta.descuentoPorcentual)}</span>
          </div>`;
      }
      if (boleta.descuentoMonto && boleta.descuentoMonto > 0) {
        html += `
          <div class="row">
            <span>Descuento fijo</span>
            <span>− ${formatCLP(boleta.descuentoMonto)}</span>
          </div>`;
      }
      if (
        (boleta.descuentoPorcentual ?? 0) + (boleta.descuentoMonto ?? 0) > 0
      ) {
        html += `
          <div class="row">
            <span>Base imponible</span>
            <span>${formatCLP(boleta.baseImponible ?? boleta.subtotal)}</span>
          </div>`;
      }
      return html;
    })();

    const efectivoHTML =
      boleta.metodoPago === "EFECTIVO" && boleta.montoRecibido !== null
        ? `
          <div class="row">
            <span>Recibido</span>
            <span>${formatCLP(boleta.montoRecibido)}</span>
          </div>
          ${
            boleta.vuelto !== null
              ? `<div class="row bold">
                  <span>Vuelto</span>
                  <span>${formatCLP(boleta.vuelto)}</span>
                </div>`
              : ""
          }`
        : "";

    const clienteHTML = boleta.cliente
      ? `
        <div class="row">
          <span>Cliente</span>
          <span>${boleta.cliente.nombre}</span>
        </div>
        <div class="row">
          <span>RUT</span>
          <span>${boleta.cliente.rut}</span>
        </div>`
      : "";

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boleta ${boleta.numeroBoleta}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 12mm;
      width: 280px;
      margin: 0 auto;
    }
    .header { text-align: center; margin-bottom: 12px; }
    .header .store-name {
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .header .doc-type {
      font-size: 10px;
      text-transform: uppercase;
      color: #555;
    }
    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .row span:first-child { color: #333; }
    .row span:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 1px solid #000; }
    th { text-align: left; padding-bottom: 4px; font-weight: bold; }
    th:not(:first-child) { text-align: right; }
    td { vertical-align: top; padding: 4px 0; }
    td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
    .item-nombre { max-width: 150px; word-break: break-word; white-space: normal; }
    .precio-unitario { font-size: 10px; color: #555; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 5px;
      font-variant-numeric: tabular-nums;
    }
    .footer { text-align: center; font-size: 10px; color: #555; margin-top: 8px; }
    @page { margin: 0; }
    @media print {
      body { padding: 8mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">POS CHILE</div>
    <div class="doc-type">Boleta electrónica</div>
  </div>

  <hr class="divider" />

  <div class="row"><span>N° Boleta</span><span><strong>${boleta.numeroBoleta}</strong></span></div>
  <div class="row"><span>Fecha</span><span>${fechaFormateada}</span></div>
  <div class="row"><span>Pago</span><span><strong>${boleta.metodoPago}</strong></span></div>
  ${clienteHTML}

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right">Cant.</th>
        <th style="text-align:right">Subt.</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <hr class="divider" />

  <div class="row"><span>Subtotal</span><span>${formatCLP(boleta.subtotal)}</span></div>
  ${descuentosHTML}
  <div class="row"><span>IVA 19%</span><span>${formatCLP(boleta.impuesto)}</span></div>
  <div class="total-row"><span>TOTAL</span><span>${formatCLP(boleta.total)}</span></div>
  ${efectivoHTML}

  <hr class="divider" />

  <div class="footer">Gracias por su compra</div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
      // Fallback por si onafterprint no dispara (Safari)
      setTimeout(function () { window.close(); }, 2000);
    };
  </script>
</body>
</html>`);

    win.document.close();
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
            id="boleta-wrapper"
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
                      <td className="py-1 max-w-[120px]">
                        <div className="truncate print:overflow-visible print:whitespace-normal print:break-words">
                          {it.nombre}
                        </div>
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
