"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SOFT_BADGE } from "@/lib/badge-styles";
import { formatCLP } from "@/lib/utils";

import { crearDevolucion } from "../actions";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface VentaLinea {
  productoId: number;
  productoNombre: string;
  codigoBarras: string;
  cantidadVendida: number;
  cantidadYaDevuelta: number;
  /** Cantidad disponible para devolver = vendida − ya devuelta. */
  disponible: number;
  precioUnitario: number;
}

export interface VentaResumen {
  id: number;
  numeroBoleta: string;
  fecha: string; // ISO
  total: number;
  subtotal: number;
  metodoPago: MetodoPago;
  clienteNombre: string | null;
  clienteRut: string | null;
  lineas: VentaLinea[];
  tieneDevolucionTotal: boolean;
}

export interface DevolucionFormProps {
  venta: VentaResumen;
}

// ──────────────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function DevolucionForm({ venta }: DevolucionFormProps) {
  const router = useRouter();

  // Paso: 1 = seleccionar items, 2 = motivo + confirmación
  const [paso, setPaso] = React.useState<1 | 2>(1);

  // Cantidades a devolver por productoId (inicial: 0)
  const [cantidades, setCantidades] = React.useState<Record<number, number>>(
    () =>
      Object.fromEntries(
        venta.lineas.map((l) => [l.productoId, 0]),
      ) as Record<number, number>,
  );

  const [motivo, setMotivo] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const setCantidad = (productoId: number, valor: number) => {
    setCantidades((prev) => {
      const linea = venta.lineas.find((l) => l.productoId === productoId);
      if (!linea) return prev;
      const max = linea.disponible;
      const v = Math.min(Math.max(0, Math.floor(valor) || 0), max);
      return { ...prev, [productoId]: v };
    });
  };

  const toggleTodos = () => {
    setCantidades((prev) => {
      const alMenosUnoEnCero = venta.lineas.some(
        (l) => (prev[l.productoId] ?? 0) < l.disponible,
      );
      if (alMenosUnoEnCero) {
        // Marcar todo al máximo disponible
        return Object.fromEntries(
          venta.lineas.map((l) => [l.productoId, l.disponible]),
        ) as Record<number, number>;
      }
      // Si todos ya están al máximo, vaciar
      return Object.fromEntries(
        venta.lineas.map((l) => [l.productoId, 0]),
      ) as Record<number, number>;
    });
  };

  // ─── Cálculos derivados ───
  const lineasSeleccionadas = venta.lineas.filter(
    (l) => (cantidades[l.productoId] ?? 0) > 0,
  );
  const cantidadTotalDevolver = lineasSeleccionadas.reduce(
    (a, l) => a + (cantidades[l.productoId] ?? 0),
    0,
  );
  const subtotalLineasDevueltas = lineasSeleccionadas.reduce(
    (a, l) => a + l.precioUnitario * (cantidades[l.productoId] ?? 0),
    0,
  );

  // Monto devuelto proporcional al total real de la venta (misma fórmula
  // que el server)
  const montoDevuelto = React.useMemo(() => {
    if (venta.subtotal <= 0) return 0;
    const ratio = subtotalLineasDevueltas / venta.subtotal;
    return Math.min(venta.total, Math.round(venta.total * ratio));
  }, [subtotalLineasDevueltas, venta.subtotal, venta.total]);

  // esTotal (vista cliente): si después de esta devolución la suma total
  // de unidades devueltas (previas + actuales) iguala o excede las
  // originalmente vendidas.
  const unidadesOriginales = venta.lineas.reduce(
    (a, l) => a + l.cantidadVendida,
    0,
  );
  const unidadesPreviasDevueltas = venta.lineas.reduce(
    (a, l) => a + l.cantidadYaDevuelta,
    0,
  );
  const esTotalPreview =
    unidadesPreviasDevueltas + cantidadTotalDevolver >= unidadesOriginales;

  const puedeAvanzar = cantidadTotalDevolver > 0;
  const puedeEnviar = puedeAvanzar && motivo.trim().length >= 5 && !submitting;

  async function onSubmit() {
    setSubmitting(true);
    try {
      const items = lineasSeleccionadas.map((l) => ({
        productoId: l.productoId,
        cantidadDevolver: cantidades[l.productoId] ?? 0,
      }));
      const res = await crearDevolucion({
        ventaId: venta.id,
        motivo: motivo.trim(),
        items,
      });
      if (!res.ok) {
        toast.error("No se pudo registrar", { description: res.error });
        setSubmitting(false);
        return;
      }
      toast.success("Devolución registrada", {
        description: res.data?.esTotal
          ? "Devolución TOTAL — stock y cliente reajustados."
          : "Devolución parcial — stock de los productos reajustado.",
      });
      router.push("/devoluciones");
      router.refresh();
    } catch (err) {
      toast.error("Error inesperado", {
        description: err instanceof Error ? err.message : "—",
      });
      setSubmitting(false);
    }
  }

  // Indicador visual del paso
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* ─── Columna izquierda: steps ─── */}
      <div className="space-y-4">
        {/* Indicador pasos */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={
              paso === 1
                ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
            }
          >
            1. Productos a devolver
          </span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span
            className={
              paso === 2
                ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
            }
          >
            2. Motivo y confirmación
          </span>
        </div>

        <AnimatePresence mode="wait">
          {paso === 1 ? (
            <motion.div
              key="paso1"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Selecciona qué devolver</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ingresa la cantidad de cada producto a devolver (máx. la
                      cantidad disponible).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleTodos}
                    aria-label="Seleccionar todo o vaciar"
                  >
                    <PackageCheck className="size-4" />
                    Devolver todo
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {venta.lineas.map((l) => {
                      const qty = cantidades[l.productoId] ?? 0;
                      const agotada = l.disponible === 0;
                      return (
                        <li
                          key={l.productoId}
                          className={
                            "grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[1fr_auto_auto]"
                          }
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {l.productoNombre}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {l.codigoBarras}
                              </span>
                              <span>·</span>
                              <span>{formatCLP(l.precioUnitario)} c/u</span>
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-[11px]">
                              <Badge variant="outline">
                                Vendidas: {l.cantidadVendida}
                              </Badge>
                              {l.cantidadYaDevuelta > 0 ? (
                                <Badge
                                  variant="outline"
                                  className={SOFT_BADGE.warning}
                                >
                                  Ya devueltas: {l.cantidadYaDevuelta}
                                </Badge>
                              ) : null}
                              <span className="text-muted-foreground">
                                Disponible para devolver:{" "}
                                <strong
                                  className={
                                    agotada
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  }
                                >
                                  {l.disponible}
                                </strong>
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`qty-${l.productoId}`}
                              className="text-xs text-muted-foreground"
                            >
                              Devolver
                            </Label>
                            <Input
                              id={`qty-${l.productoId}`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={l.disponible}
                              step={1}
                              value={qty}
                              disabled={agotada}
                              onChange={(e) =>
                                setCantidad(
                                  l.productoId,
                                  e.target.valueAsNumber,
                                )
                              }
                              className="w-20 text-center"
                            />
                          </div>
                          <div className="hidden text-right text-xs text-muted-foreground sm:block">
                            Subtotal línea
                            <div className="tabular-nums font-medium text-foreground">
                              {formatCLP(l.precioUnitario * qty)}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      <ArrowLeft className="size-4" />
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setPaso(2)}
                      disabled={!puedeAvanzar}
                    >
                      Continuar
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="paso2"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Motivo de la devolución</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Describe brevemente la razón (mínimo 5 caracteres).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="motivo">Motivo</Label>
                    <textarea
                      id="motivo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. Producto defectuoso; cliente cambió de opinión; error de cobro..."
                      rows={4}
                      maxLength={255}
                      className="block w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <div className="flex items-center justify-between gap-3">
                      {motivo.trim().length > 0 &&
                      motivo.trim().length < 5 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Faltan {5 - motivo.trim().length} carácter(es) para
                          alcanzar el mínimo de 5.
                        </p>
                      ) : (
                        <span />
                      )}
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {motivo.trim().length} / 255
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaso(1)}
                    >
                      <ArrowLeft className="size-4" />
                      Volver
                    </Button>
                    <Button
                      type="button"
                      onClick={onSubmit}
                      disabled={!puedeEnviar}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Confirmar devolución
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Columna derecha: resumen ─── */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="size-4" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="font-mono text-[11px] text-muted-foreground">
                {venta.numeroBoleta}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {formatFecha(venta.fecha)}
              </p>
              {venta.clienteNombre ? (
                <p className="mt-1 text-sm font-medium">
                  {venta.clienteNombre}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Sin cliente
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Total venta</span>
              <span className="tabular-nums">{formatCLP(venta.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidades a devolver</span>
              <span className="tabular-nums font-medium">
                {cantidadTotalDevolver}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t pt-2">
              <span className="text-sm font-medium">Monto a devolver</span>
              <span className="tabular-nums text-xl font-bold text-amber-700 dark:text-amber-400">
                − {formatCLP(montoDevuelto)}
              </span>
            </div>

            {cantidadTotalDevolver > 0 ? (
              <div className="pt-1">
                {esTotalPreview ? (
                  <Badge
                    variant="outline"
                    className={`gap-1 ${SOFT_BADGE.destructive}`}
                  >
                    <RotateCcw className="size-3" />
                    Devolución TOTAL
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`gap-1 ${SOFT_BADGE.warning}`}
                  >
                    <RotateCcw className="size-3" />
                    Devolución parcial
                  </Badge>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {esTotalPreview
                    ? "Anulará la venta: se decrementará 'compras' del cliente y se recalculará su 'última compra'."
                    : "Sólo se revertirá el stock de los productos devueltos; el cliente no se altera."}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
