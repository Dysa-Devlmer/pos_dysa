import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { TipoMovimientoCaja } from "@repo/db";
import { obtenerResumenCierre } from "../../actions";
import { formatCLP } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cierre Z" };

export default async function CierreZPage({
  params,
}: {
  params: Promise<{ aperturaId: string }>;
}) {
  const { aperturaId: idStr } = await params;
  const aperturaId = Number(idStr);
  if (!Number.isInteger(aperturaId) || aperturaId <= 0) notFound();

  const session = await auth();
  if (!session?.user?.id) notFound();

  const resumen = await obtenerResumenCierre(aperturaId);
  if (!resumen) notFound();

  // Cajero solo puede ver sus propias aperturas (mismo criterio que /api/v1/ventas).
  if (
    session.user.rol === "CAJERO" &&
    resumen.apertura.usuarioId !== Number(session.user.id)
  ) {
    notFound();
  }

  const a = resumen.apertura;
  const formatear = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleString("es-CL") : "—";

  return (
    <div className="mx-auto max-w-xl space-y-4 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Cierre Z</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 font-mono text-sm print:border-0 print:p-0 print:shadow-none">
        <div className="text-center">
          <p className="text-base font-bold">CIERRE Z · Apertura #{a.id}</p>
          <p className="text-xs text-muted-foreground">{a.caja.nombre}</p>
        </div>

        <hr className="my-3 border-dashed" />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Cajero</dt>
          <dd className="text-right">{a.usuario.nombre}</dd>
          <dt className="text-muted-foreground">Apertura</dt>
          <dd className="text-right">{formatear(a.fechaApertura)}</dd>
          <dt className="text-muted-foreground">Cierre</dt>
          <dd className="text-right">{formatear(a.fechaCierre)}</dd>
          <dt className="text-muted-foreground">Estado</dt>
          <dd className="text-right">{a.estado}</dd>
        </dl>

        <hr className="my-3 border-dashed" />

        <p className="font-bold">Ventas</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
          <dt className="text-muted-foreground">Cantidad</dt>
          <dd className="text-right tabular-nums">{resumen.ventasCount}</dd>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-right tabular-nums">
            {formatCLP(resumen.ventasTotal)}
          </dd>
        </dl>

        <p className="mt-2 font-bold">Pagos por método</p>
        {resumen.pagosPorMetodo.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin pagos.</p>
        ) : (
          <ul className="text-xs">
            {resumen.pagosPorMetodo.map((p) => (
              <li
                key={p.metodo}
                className="flex justify-between border-b border-dashed py-0.5"
              >
                <span>
                  {p.metodo} ({p.count})
                </span>
                <span className="tabular-nums">{formatCLP(p.total)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 font-bold">Movimientos</p>
        {a.movimientos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin movimientos.</p>
        ) : (
          <ul className="text-xs">
            {a.movimientos.map((m) => {
              const signo =
                m.tipo === TipoMovimientoCaja.INGRESO
                  ? "+"
                  : m.tipo === TipoMovimientoCaja.EGRESO ||
                      m.tipo === TipoMovimientoCaja.RETIRO
                    ? "-"
                    : m.monto >= 0
                      ? "+"
                      : "";
              return (
                <li
                  key={m.id}
                  className="flex justify-between border-b border-dashed py-0.5"
                >
                  <span>
                    {m.tipo} · {m.motivo}
                  </span>
                  <span className="tabular-nums">
                    {signo}
                    {formatCLP(Math.abs(m.monto))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <hr className="my-3 border-dashed" />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
          <dt>Monto inicial</dt>
          <dd className="text-right tabular-nums">
            {formatCLP(a.montoInicial)}
          </dd>
          <dt>Monto final sistema</dt>
          <dd className="text-right tabular-nums">
            {formatCLP(resumen.montoFinalSistema)}
          </dd>
          <dt>Monto declarado</dt>
          <dd className="text-right tabular-nums">
            {a.montoFinalDeclarado !== null
              ? formatCLP(a.montoFinalDeclarado)
              : "—"}
          </dd>
          <dt className="font-bold">Diferencia</dt>
          <dd className="text-right font-bold tabular-nums">
            {a.diferencia !== null
              ? `${a.diferencia >= 0 ? "+" : ""}${formatCLP(a.diferencia)}`
              : "—"}
          </dd>
        </dl>

        {a.observaciones ? (
          <>
            <hr className="my-3 border-dashed" />
            <p className="text-xs">
              <span className="font-bold">Observaciones:</span>{" "}
              {a.observaciones}
            </p>
          </>
        ) : null}
      </div>

      <PrintButton />
    </div>
  );
}

