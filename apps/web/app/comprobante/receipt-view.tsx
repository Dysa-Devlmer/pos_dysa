import { Receipt, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import type {
  PublicRefundReceipt,
  PublicSaleReceipt,
} from "@/lib/public-receipts";
import { formatCLP } from "@/lib/utils";

import { PublicReceiptActions } from "./public-receipt-actions";

function formatFecha(d: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function PublicSaleReceiptView({
  receipt,
  url,
}: {
  receipt: PublicSaleReceipt;
  url: string;
}) {
  return (
    <ReceiptShell
      icon={<Receipt className="size-7" />}
      title="Comprobante interno"
      subtitle={receipt.numeroBoleta}
      url={url}
      shareTitle={`Comprobante ${receipt.numeroBoleta}`}
      shareText={`Comprobante interno DyPos CL ${receipt.numeroBoleta}`}
    >
      <InfoRow label="Fecha" value={formatFecha(receipt.fecha)} />
      <InfoRow label="Pago" value={receipt.metodoPago} />
      {receipt.cliente ? (
        <>
          <InfoRow label="Cliente" value={receipt.cliente.nombre} />
          <InfoRow label="RUT" value={receipt.cliente.rut} />
        </>
      ) : null}
      <Items items={receipt.items} />
      <Totals
        subtotal={receipt.subtotal}
        descuentoPct={receipt.descuentoPct}
        descuentoMonto={receipt.descuentoMonto}
        impuesto={receipt.impuesto}
        total={receipt.total}
      />
    </ReceiptShell>
  );
}

export function PublicRefundReceiptView({
  receipt,
  url,
}: {
  receipt: PublicRefundReceipt;
  url: string;
}) {
  return (
    <ReceiptShell
      icon={<RotateCcw className="size-7" />}
      title="Comprobante interno de devolución"
      subtitle={receipt.venta.numeroBoleta}
      url={url}
      shareTitle={`Devolución ${receipt.venta.numeroBoleta}`}
      shareText={`Comprobante interno de devolución DyPos CL ${receipt.venta.numeroBoleta}`}
    >
      <InfoRow label="Fecha devolución" value={formatFecha(receipt.fecha)} />
      <InfoRow
        label="Tipo"
        value={receipt.esTotal ? "Devolución total" : "Devolución parcial"}
      />
      <InfoRow label="Venta original" value={receipt.venta.numeroBoleta} />
      {receipt.venta.cliente ? (
        <>
          <InfoRow label="Cliente" value={receipt.venta.cliente.nombre} />
          <InfoRow label="RUT" value={receipt.venta.cliente.rut} />
        </>
      ) : null}
      {/* `motivo` deliberadamente NO se muestra: texto libre interno
          que puede contener PII / data sensible. Solo visible en la
          vista admin autenticada. */}
      <Items items={receipt.items} />
      <section className="border-t pt-3">
        <div className="flex items-center justify-between text-base font-bold">
          <span>Monto devuelto</span>
          <span className="tabular-nums">{formatCLP(receipt.montoDevuelto)}</span>
        </div>
      </section>
    </ReceiptShell>
  );
}

function ReceiptShell({
  icon,
  title,
  subtitle,
  url,
  shareTitle,
  shareText,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  url: string;
  shareTitle: string;
  shareText: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white">
      <div className="mx-auto max-w-xl space-y-4">
        <PublicReceiptActions url={url} title={shareTitle} text={shareText} />
        <article className="rounded-md border bg-background p-5 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <header className="space-y-2 border-b pb-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              <p className="font-mono text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Documento interno de DyPos CL. No reemplaza boleta electrónica
              SII.
            </p>
          </header>
          <div className="space-y-4 pt-4">{children}</div>
        </article>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right font-medium">{value}</span>
    </div>
  );
}

function Items({ items }: { items: PublicSaleReceipt["items"] }) {
  return (
    <section className="border-y py-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Detalle
      </h2>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={`${item.nombre}-${idx}`} className="flex justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {item.cantidad} × {formatCLP(item.precioUnitario)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium tabular-nums">
              {formatCLP(item.subtotal)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Totals({
  subtotal,
  descuentoPct,
  descuentoMonto,
  impuesto,
  total,
}: {
  subtotal: number;
  descuentoPct: number;
  descuentoMonto: number;
  impuesto: number;
  total: number;
}) {
  return (
    <section className="space-y-1 text-sm">
      <InfoRow label="Subtotal" value={formatCLP(subtotal)} />
      {descuentoPct > 0 ? (
        <InfoRow label={`Descuento (${descuentoPct}%)`} value="Aplicado" />
      ) : null}
      {descuentoMonto > 0 ? (
        <InfoRow label="Descuento fijo" value={`- ${formatCLP(descuentoMonto)}`} />
      ) : null}
      <InfoRow label="IVA 19%" value={formatCLP(impuesto)} />
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-bold">
        <span>Total</span>
        <span className="tabular-nums">{formatCLP(total)}</span>
      </div>
    </section>
  );
}
