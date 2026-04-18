"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PercentCircle, Tag } from "lucide-react";

import { calcularDesglose, cn, formatCLP } from "@/lib/utils";

export interface ResumenVentaProps {
  subtotalBruto: number;
  descuentoPct?: number;
  descuentoMonto?: number;
  /** Si true, renderiza solo las líneas numéricas sin el contenedor de card. */
  inline?: boolean;
  className?: string;
}

function DiscountRow({
  label,
  icon,
  amount,
}: {
  label: React.ReactNode;
  icon: React.ReactNode;
  amount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-400">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-medium">− {formatCLP(amount)}</span>
      </div>
    </motion.div>
  );
}

export function ResumenVenta({
  subtotalBruto,
  descuentoPct = 0,
  descuentoMonto = 0,
  inline = false,
  className,
}: ResumenVentaProps) {
  const desglose = React.useMemo(
    () => calcularDesglose(subtotalBruto, descuentoPct, descuentoMonto),
    [subtotalBruto, descuentoPct, descuentoMonto],
  );

  const hayPct = desglose.descuentoPorcentual > 0;
  const hayFijo = desglose.descuentoFijo > 0;
  const hayDescuento = hayPct || hayFijo;

  const rows = (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">
          {formatCLP(desglose.subtotalBruto)}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {hayPct ? (
          <DiscountRow
            key="pct"
            label={
              <>
                Descuento (
                {Number(descuentoPct).toLocaleString("es-CL", {
                  maximumFractionDigits: 2,
                })}
                %)
              </>
            }
            icon={<PercentCircle className="size-3.5" />}
            amount={desglose.descuentoPorcentual}
          />
        ) : null}

        {hayFijo ? (
          <DiscountRow
            key="fijo"
            label="Descuento fijo"
            icon={<Tag className="size-3.5" />}
            amount={desglose.descuentoFijo}
          />
        ) : null}
      </AnimatePresence>

      {hayDescuento ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Base imponible</span>
          <span className="tabular-nums">
            {formatCLP(desglose.baseImponible)}
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">IVA (19%)</span>
        <span className="tabular-nums">{formatCLP(desglose.iva)}</span>
      </div>

      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="text-base font-semibold">Total</span>
        <span className="tabular-nums text-2xl font-bold">
          {formatCLP(desglose.total)}
        </span>
      </div>
    </div>
  );

  if (inline) {
    return <div className={className}>{rows}</div>;
  }

  return (
    <div
      className={cn("rounded-md border bg-muted/20 p-4", className)}
      aria-label="Resumen de la venta"
    >
      {rows}
    </div>
  );
}
