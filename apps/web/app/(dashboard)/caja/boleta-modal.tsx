"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Printer, Receipt } from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { ReceiptShareButton } from "@/components/receipt-share-button";
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
  publicToken: string;
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
  const publicUrl =
    boleta && typeof window !== "undefined"
      ? `${window.location.origin}/comprobante/${boleta.publicToken}`
      : "";

  const handlePrint = () => {
    if (!boleta) return;

    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;

    const fechaFormateada = formatFechaHora(boleta.fecha);

    // ─── Escapar HTML para prevenir inyección vía nombres/RUT de cliente
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const impresoEn = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const itemsHTML = boleta.items
      .map(
        (it, idx) => `
        <tr${idx > 0 ? ' class="item-row-sep"' : ""}>
          <td class="item-nombre">
            <div class="item-title">${esc(it.nombre)}</div>
            <div class="precio-unitario">${formatCLP(it.precioUnitario)} c/u</div>
          </td>
          <td class="qty">${it.cantidad}</td>
          <td class="subt">${formatCLP(it.subtotal)}</td>
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
          <div class="row row-strong">
            <span>Base imponible</span>
            <span>${formatCLP(boleta.baseImponible ?? boleta.subtotal)}</span>
          </div>`;
      }
      return html;
    })();

    const efectivoHTML =
      boleta.metodoPago === "EFECTIVO" && boleta.montoRecibido !== null
        ? `
          <div class="pago-block">
            <div class="row">
              <span>Recibido en efectivo</span>
              <span>${formatCLP(boleta.montoRecibido)}</span>
            </div>
            ${
              boleta.vuelto !== null
                ? `<div class="row row-strong">
                    <span>Vuelto</span>
                    <span>${formatCLP(boleta.vuelto)}</span>
                  </div>`
                : ""
            }
          </div>`
        : "";

    const clienteHTML = boleta.cliente
      ? `
        <div class="section-label">Cliente</div>
        <div class="row">
          <span>Nombre</span>
          <span>${esc(boleta.cliente.nombre)}</span>
        </div>
        <div class="row">
          <span>RUT</span>
          <span>${esc(boleta.cliente.rut)}</span>
        </div>
        <hr class="divider" />`
      : "";

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprobante ${esc(boleta.numeroBoleta)}</title>
  <style>
    /* ─── Reset y base ─── */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      /* Forzar colores exactos aunque el driver tenga "ahorrar tinta" */
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    html, body {
      background: #fff;
      color: #000;
    }

    body {
      /* Stack monoespaciado con fallbacks robustos — evita Courier New borroso */
      font-family: "SF Mono", "Menlo", "Consolas", "Liberation Mono",
        "Courier New", monospace;
      font-size: 12px;
      line-height: 1.45;
      font-weight: 500;           /* semi-bold global → aguanta poca tinta */
      color: #000;
      background: #fff;
      padding: 8mm;
      /* 76mm ancho de contenido: cabe perfecto en thermal 80mm y se ve
         profesional (columna angosta centrada) en A4/Letter. */
      max-width: 76mm;
      margin: 0 auto;
    }

    /* ─── Header ─── */
    .header {
      text-align: center;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
      margin-bottom: 10px;
    }
    .store-name {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 2px;
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .doc-type {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #000;
    }
    .empresa-info {
      font-size: 10px;
      font-weight: 500;
      color: #000;
      margin-top: 6px;
      line-height: 1.4;
    }

    /* ─── Secciones ─── */
    .section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000;
      margin: 8px 0 4px 0;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
    }

    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .divider-solid {
      border: none;
      border-top: 1px solid #000;
      margin: 8px 0;
    }

    /* ─── Filas key-value ─── */
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 3px;
      word-break: break-word;
      font-size: 11.5px;
      font-weight: 500;
    }
    .row span:first-child {
      color: #000;
      flex-shrink: 0;
    }
    .row span:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      word-break: break-word;
    }
    .row-strong {
      font-weight: 700;
      font-size: 12px;
    }
    .row-strong span:first-child,
    .row-strong span:last-child {
      font-weight: 700;
    }

    /* ─── Tabla de items ─── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    thead tr {
      border-bottom: 2px solid #000;
    }
    th {
      text-align: left;
      padding: 4px 0;
      font-weight: 700;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    th.qty, th.subt { text-align: right; }
    td {
      vertical-align: top;
      padding: 5px 0;
      font-size: 11.5px;
      font-weight: 500;
    }
    td.qty, td.subt {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      padding-left: 4px;
    }
    .item-nombre {
      max-width: 100%;
      word-break: break-word;
      white-space: normal;
      padding-right: 6px;
    }
    .item-title {
      font-weight: 700;
      color: #000;
      line-height: 1.3;
    }
    .precio-unitario {
      font-size: 10px;
      font-weight: 500;
      color: #000;
      margin-top: 1px;
    }
    /* Separador fino entre items (no en el primero) */
    .item-row-sep td {
      border-top: 1px dashed #000;
    }

    /* ─── Totales ─── */
    .totales-block {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #000;
    }

    /* Caja destacada del TOTAL — doble borde para máximo contraste */
    .total-box {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 16px;
      font-weight: 900;
      border-top: 3px double #000;
      border-bottom: 3px double #000;
      padding: 6px 0;
      margin: 6px 0;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.5px;
    }

    .pago-block {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #000;
    }

    /* ─── Footer ─── */
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    .footer .gracias {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .footer .disclaimer {
      font-size: 9.5px;
      font-weight: 500;
      color: #000;
      line-height: 1.4;
      margin-top: 4px;
    }
    .footer .impreso {
      font-size: 9.5px;
      font-weight: 500;
      margin-top: 6px;
      padding-top: 4px;
      border-top: 1px dotted #000;
      font-variant-numeric: tabular-nums;
    }

    /* ─── Reglas de impresión ─── */
    @page {
      /* size:auto → la impresora elige (thermal 58/80mm, A4, Letter).
         Margin 0 porque ya tenemos padding en body. */
      size: auto;
      margin: 0;
    }

    @media print {
      html, body {
        background: #fff !important;
      }
      body {
        padding: 5mm;
        max-width: 100%;
        width: auto;
      }
      /* Evitar cortes de items entre páginas */
      tr, .total-box, .footer {
        page-break-inside: avoid;
      }
    }

    /* ─── Thermal (impresoras de ticket 58/80mm) ─── */
    @media print and (max-width: 90mm) {
      body {
        padding: 3mm;
        font-size: 12px;
      }
      .store-name { font-size: 18px; }
    }

    /* ─── Hoja A4/Letter — columna angosta centrada, más profesional ─── */
    @media print and (min-width: 150mm) {
      body {
        max-width: 80mm;
        padding: 15mm 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">POS CHILE</div>
    <div class="doc-type">Comprobante interno</div>
    <div class="empresa-info">
      Punto de Venta Autorizado<br/>
      Santiago · Chile
    </div>
  </div>

  <div class="section-label">Documento</div>
  <div class="row"><span>N° Boleta</span><span>${esc(boleta.numeroBoleta)}</span></div>
  <div class="row"><span>Fecha emisión</span><span>${esc(fechaFormateada)}</span></div>
  <div class="row"><span>Método de pago</span><span>${esc(boleta.metodoPago)}</span></div>

  ${clienteHTML || '<hr class="divider" />'}

  <div class="section-label">Detalle de compra</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="qty">Cant.</th>
        <th class="subt">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totales-block">
    <div class="row"><span>Subtotal</span><span>${formatCLP(boleta.subtotal)}</span></div>
    ${descuentosHTML}
    <div class="row"><span>IVA 19%</span><span>${formatCLP(boleta.impuesto)}</span></div>
  </div>

  <div class="total-box"><span>TOTAL</span><span>${formatCLP(boleta.total)}</span></div>

  ${efectivoHTML}

  <div class="footer">
    <div class="gracias">¡Gracias por su compra!</div>
    <div class="disclaimer">
      Conserve este comprobante interno como respaldo de su compra.<br/>
      Documento interno de DyPos CL. No reemplaza boleta electrónica SII.
    </div>
    <div class="impreso">Impreso: ${esc(impresoEn)}</div>
  </div>

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
            Comprobante interno generado correctamente.
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
                  Comprobante interno
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
                <ReceiptShareButton
                  url={publicUrl}
                  title={`Comprobante ${boleta.numeroBoleta}`}
                  text={`Comprobante interno DyPos CL ${boleta.numeroBoleta}`}
                />
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
