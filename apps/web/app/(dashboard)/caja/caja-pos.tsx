"use client";

import * as React from "react";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { calcularDesglose, formatCLP } from "@/lib/utils";
import { buscarProductos, crearVenta } from "@/app/(dashboard)/ventas/actions";
import {
  DescuentoInput,
  type DescuentoModo,
} from "@/components/descuento-input";
import { ResumenVenta } from "@/components/resumen-venta";

import { ModalCobro } from "./modal-cobro";
import { BoletaModal, type BoletaData } from "./boleta-modal";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface ProductoFrecuente {
  id: number;
  nombre: string;
  codigoBarras: string;
  precio: number;
  stock: number;
  categoriaNombre: string;
}

export interface CajaItem {
  productoId: number;
  nombre: string;
  codigoBarras: string;
  precioUnitario: number;
  cantidad: number;
  stockMax: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Debounce hook
// ──────────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 250): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────

export interface CajaPosProps {
  productosFrecuentes: ProductoFrecuente[];
}

export function CajaPos({ productosFrecuentes }: CajaPosProps) {
  // Carrito
  const [items, setItems] = React.useState<CajaItem[]>([]);

  // Buscador
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = React.useState<ProductoFrecuente[]>([]);
  const [buscando, setBuscando] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Modales
  const [cobroOpen, setCobroOpen] = React.useState(false);
  const [boleta, setBoleta] = React.useState<BoletaData | null>(null);

  // Mensajes
  const [mensaje, setMensaje] = React.useState<{
    tipo: "error" | "info";
    texto: string;
  } | null>(null);

  // Búsqueda (debounced) — si la query coincide exacto con código de barras
  // y da 1 solo resultado → auto-agregar al carrito.
  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBuscando(true);
      try {
        const data = await buscarProductos(q);
        if (cancelled) return;
        const mapped: ProductoFrecuente[] = data.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          codigoBarras: p.codigoBarras,
          precio: p.precio,
          stock: p.stock,
          categoriaNombre: p.categoria.nombre,
        }));

        // Auto-agregar si coincidencia exacta por código de barras (típico
        // flujo: scanner → enter → agrega)
        const exacto = mapped.find((p) => p.codigoBarras === q);
        if (exacto && mapped.length === 1) {
          agregar(exacto);
          setQuery("");
          setResults([]);
          inputRef.current?.focus();
        } else {
          setResults(mapped);
        }
      } finally {
        if (!cancelled) setBuscando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // ─── Mensaje efímero ───
  React.useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 3500);
    return () => clearTimeout(t);
  }, [mensaje]);

  // ─── Carrito helpers ───
  const agregar = (p: ProductoFrecuente) => {
    setItems((prev) => {
      const existe = prev.find((it) => it.productoId === p.id);
      if (existe) {
        if (existe.cantidad + 1 > p.stock) {
          setMensaje({
            tipo: "error",
            texto: `Stock máximo alcanzado para "${p.nombre}" (${p.stock})`,
          });
          return prev;
        }
        return prev.map((it) =>
          it.productoId === p.id ? { ...it, cantidad: it.cantidad + 1 } : it,
        );
      }
      if (p.stock < 1) {
        setMensaje({
          tipo: "error",
          texto: `"${p.nombre}" sin stock`,
        });
        return prev;
      }
      return [
        ...prev,
        {
          productoId: p.id,
          nombre: p.nombre,
          codigoBarras: p.codigoBarras,
          precioUnitario: p.precio,
          cantidad: 1,
          stockMax: p.stock,
        },
      ];
    });
  };

  const cambiarCantidad = (productoId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.productoId !== productoId) return it;
          const nueva = Math.min(Math.max(0, it.cantidad + delta), it.stockMax);
          return { ...it, cantidad: nueva };
        })
        .filter((it) => it.cantidad > 0),
    );
  };

  const setCantidadManual = (productoId: number, raw: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productoId !== productoId) return it;
        const v = Math.min(Math.max(1, Math.floor(raw) || 1), it.stockMax);
        return { ...it, cantidad: v };
      }),
    );
  };

  const quitar = (productoId: number) => {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId));
  };

  const limpiarCarrito = () => {
    setItems([]);
    setQuery("");
    setResults([]);
    setMensaje(null);
    inputRef.current?.focus();
  };

  // ─── Enter en buscador: si hay 1 resultado, agregarlo ───
  const onBuscadorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (results.length === 1) {
      agregar(results[0]!);
      setQuery("");
      setResults([]);
    } else if (results.length > 1) {
      // Prioridad: match exacto por código de barras
      const exacto = results.find((p) => p.codigoBarras === query.trim());
      if (exacto) {
        agregar(exacto);
        setQuery("");
        setResults([]);
      }
    }
  };

  // ─── Descuento (estado local, se aplica al confirmar) ───
  const [descuentoModo, setDescuentoModo] =
    React.useState<DescuentoModo>("pct");
  const [descuentoPct, setDescuentoPct] = React.useState<number>(0);
  const [descuentoMonto, setDescuentoMonto] = React.useState<number>(0);

  // ─── Totales derivados ───
  const subtotal = React.useMemo(
    () => items.reduce((a, it) => a + it.precioUnitario * it.cantidad, 0),
    [items],
  );
  const desglose = React.useMemo(
    () => calcularDesglose(subtotal, descuentoPct, descuentoMonto),
    [subtotal, descuentoPct, descuentoMonto],
  );
  const total = desglose.total;
  const cantidadItems = items.reduce((a, it) => a + it.cantidad, 0);

  // ─── Confirmar venta (llamado desde ModalCobro) ───
  const onConfirmarVenta = async (args: {
    metodoPago: MetodoPago;
    clienteId: number | null;
    montoRecibido: number | null;
    clienteResumen: { nombre: string; rut: string } | null;
  }) => {
    const res = await crearVenta({
      metodoPago: args.metodoPago,
      clienteId: args.clienteId,
      items: items.map((it) => ({
        productoId: it.productoId,
        cantidad: it.cantidad,
      })),
      descuentoPct,
      descuentoMonto,
    });
    if (!res.ok) {
      setMensaje({ tipo: "error", texto: res.error });
      return { ok: false as const, error: res.error };
    }

    // Construir boleta local (ya validada server-side). Reutilizamos el
    // desglose calculado arriba que ya aplica el mismo algoritmo que el server.
    const boletaData: BoletaData = {
      id: res.data!.id,
      numeroBoleta: res.data!.numeroBoleta,
      fecha: new Date().toISOString(),
      items: items.map((it) => ({
        nombre: it.nombre,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.precioUnitario * it.cantidad,
      })),
      subtotal: desglose.subtotalBruto,
      descuentoPct,
      descuentoMonto: desglose.descuentoFijo,
      descuentoPorcentual: desglose.descuentoPorcentual,
      baseImponible: desglose.baseImponible,
      impuesto: desglose.iva,
      total: desglose.total,
      metodoPago: args.metodoPago,
      montoRecibido: args.montoRecibido,
      vuelto:
        args.montoRecibido !== null ? Math.max(0, args.montoRecibido - total) : null,
      cliente: args.clienteResumen,
    };

    setBoleta(boletaData);
    setCobroOpen(false);
    setItems([]);
    setDescuentoPct(0);
    setDescuentoMonto(0);
    setQuery("");
    setResults([]);
    return { ok: true as const };
  };

  const hayItems = items.length > 0;
  const productosVisibles =
    debouncedQuery.trim().length >= 2 ? results : productosFrecuentes;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      {/* ─── Izquierda: buscador + grid ─── */}
      <div className="space-y-4">
        <div className="rounded-md border bg-background p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onBuscadorKeyDown}
              placeholder="Buscar por nombre o escanear código de barras..."
              className="h-12 pl-10 text-base"
              autoFocus
            />
            {buscando ? (
              <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {debouncedQuery.trim().length >= 2 ? (
              <>
                Mostrando {results.length} resultado(s) para “
                {debouncedQuery.trim()}”
              </>
            ) : (
              <>Productos frecuentes:</>
            )}
          </p>
        </div>

        {/* Grid de productos (click = agregar) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {buscando && productosVisibles.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-md" />
              ))
            : null}

          {productosVisibles.length === 0 && !buscando ? (
            <div className="col-span-full rounded-md border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 size-8 opacity-40" />
              {debouncedQuery.trim().length >= 2
                ? `Sin resultados para “${debouncedQuery.trim()}”`
                : "No hay productos frecuentes disponibles"}
            </div>
          ) : null}

          {productosVisibles.map((p) => {
            const agotado = p.stock <= 0;
            const enCarrito = items.find((it) => it.productoId === p.id);
            const disponible = p.stock - (enCarrito?.cantidad ?? 0);
            const disabled = agotado || disponible <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => agregar(p)}
                disabled={disabled}
                className={
                  "group flex h-full flex-col justify-between gap-2 rounded-md border bg-background p-3 text-left transition " +
                  (disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary hover:bg-accent active:scale-[0.98]")
                }
              >
                <div>
                  <p className="line-clamp-2 text-sm font-medium">{p.nombre}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {p.codigoBarras}
                  </p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {p.categoriaNombre}
                  </Badge>
                </div>
                <div className="flex items-end justify-between">
                  <span className="tabular-nums text-base font-semibold">
                    {formatCLP(p.precio)}
                  </span>
                  <span
                    className={
                      "text-[11px] tabular-nums " +
                      (agotado
                        ? "text-destructive"
                        : p.stock < 10
                          ? "text-amber-600"
                          : "text-muted-foreground")
                    }
                  >
                    {agotado ? "Sin stock" : `Stock: ${p.stock}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Derecha: carrito + resumen ─── */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-col overflow-hidden rounded-md border bg-background">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              <h2 className="font-semibold">Carrito</h2>
              <Badge variant="secondary">
                {cantidadItems} {cantidadItems === 1 ? "item" : "items"}
              </Badge>
            </div>
            {hayItems ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={limpiarCarrito}
                aria-label="Limpiar carrito"
              >
                <X className="size-3" />
                Limpiar
              </Button>
            ) : null}
          </div>

          <div className="max-h-[42vh] overflow-y-auto">
            {!hayItems ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <ShoppingCart className="mx-auto mb-2 size-8 opacity-40" />
                Carrito vacío
                <p className="mt-1 text-xs">
                  Busca productos o escanea un código de barras
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((it) => (
                  <li
                    key={it.productoId}
                    className="grid grid-cols-[1fr_auto] gap-1 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {it.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCLP(it.precioUnitario)} c/u · stock {it.stockMax}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => quitar(it.productoId)}
                      aria-label="Quitar"
                      className="self-start"
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                    <div className="col-span-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => cambiarCantidad(it.productoId, -1)}
                          disabled={it.cantidad <= 1}
                          aria-label="Restar"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={it.stockMax}
                          value={it.cantidad}
                          onChange={(e) =>
                            setCantidadManual(
                              it.productoId,
                              Number(e.target.value),
                            )
                          }
                          className="h-8 w-14 text-center"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => cambiarCantidad(it.productoId, 1)}
                          disabled={it.cantidad >= it.stockMax}
                          aria-label="Sumar"
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <span className="tabular-nums font-semibold">
                        {formatCLP(it.precioUnitario * it.cantidad)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ─── Descuento ─── */}
          <div className="border-t bg-background p-4">
            <DescuentoInput
              modo={descuentoModo}
              onChangeModo={setDescuentoModo}
              descuentoPct={descuentoPct}
              onChangeDescuentoPct={setDescuentoPct}
              descuentoMonto={descuentoMonto}
              onChangeDescuentoMonto={setDescuentoMonto}
              subtotalBruto={subtotal}
            />
          </div>

          {/* ─── Resumen ─── */}
          <div className="border-t bg-muted/20 p-4">
            <ResumenVenta
              inline
              subtotalBruto={subtotal}
              descuentoPct={descuentoPct}
              descuentoMonto={descuentoMonto}
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="m-3 h-14 text-base font-semibold"
            onClick={() => setCobroOpen(true)}
            disabled={!hayItems}
          >
            <Wallet className="size-5" />
            Cobrar{" "}
            <span className="tabular-nums opacity-90">{formatCLP(total)}</span>
          </Button>
        </div>

        {mensaje ? (
          <div
            role="alert"
            className={
              "rounded-md border px-3 py-2 text-sm " +
              (mensaje.tipo === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-muted text-foreground")
            }
          >
            {mensaje.texto}
          </div>
        ) : null}
      </aside>

      {/* ─── Modales ─── */}
      <ModalCobro
        open={cobroOpen}
        onOpenChange={setCobroOpen}
        subtotal={desglose.subtotalBruto}
        descuentoPct={descuentoPct}
        descuentoMonto={descuentoMonto}
        total={desglose.total}
        cantidadItems={cantidadItems}
        onConfirmar={onConfirmarVenta}
      />

      <BoletaModal
        boleta={boleta}
        onClose={() => {
          setBoleta(null);
          inputRef.current?.focus();
        }}
      />
    </div>
  );
}
