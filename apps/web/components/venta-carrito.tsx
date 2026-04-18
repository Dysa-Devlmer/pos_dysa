"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  UserRound,
  UserRoundX,
  X,
} from "lucide-react";
import { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCLP, validarRUT } from "@/lib/utils";
import {
  buscarClientePorRut,
  buscarProductos,
  crearVenta,
  editarVenta,
  type VentaInput,
} from "@/app/(dashboard)/ventas/actions";
import { DescuentoInput, type DescuentoModo } from "@/components/descuento-input";
import { ResumenVenta } from "@/components/resumen-venta";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface ProductoResult {
  id: number;
  nombre: string;
  codigoBarras: string;
  precio: number;
  stock: number;
  categoria: { nombre: string };
}

export interface ClienteResult {
  id: number;
  rut: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

export interface CarritoItem {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  stockMax: number; // stock efectivo (considerando devolución en modo edición)
}

export interface VentaCarritoProps {
  mode: "crear" | "editar";
  ventaId?: number;
  initialItems?: CarritoItem[];
  initialCliente?: ClienteResult | null;
  initialMetodoPago?: MetodoPago;
  initialDescuentoPct?: number;
  initialDescuentoMonto?: number;
  /** Mapping productoId → cantidad que venía en la venta vieja (para stock efectivo) */
  refundCantidades?: Record<number, number>;
}

const METODOS: MetodoPago[] = [
  "EFECTIVO",
  "DEBITO",
  "CREDITO",
  "TRANSFERENCIA",
];

// Hook: debounce
function useDebounce<T>(value: T, delay = 300): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────────

export function VentaCarrito({
  mode,
  ventaId,
  initialItems = [],
  initialCliente = null,
  initialMetodoPago = "EFECTIVO",
  initialDescuentoPct = 0,
  initialDescuentoMonto = 0,
  refundCantidades = {},
}: VentaCarritoProps) {
  const router = useRouter();

  // Carrito
  const [items, setItems] = React.useState<CarritoItem[]>(initialItems);

  // Cliente
  const [rutInput, setRutInput] = React.useState(initialCliente?.rut ?? "");
  const [cliente, setCliente] = React.useState<ClienteResult | null>(
    initialCliente,
  );
  const [rutError, setRutError] = React.useState<string | null>(null);
  const [buscandoCliente, setBuscandoCliente] = React.useState(false);

  // Producto search
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = React.useState<ProductoResult[]>([]);
  const [buscando, setBuscando] = React.useState(false);

  // Método pago
  const [metodoPago, setMetodoPago] = React.useState<MetodoPago>(
    initialMetodoPago,
  );

  // Descuento
  const [descuentoModo, setDescuentoModo] = React.useState<DescuentoModo>(
    initialDescuentoMonto > 0 && initialDescuentoPct === 0 ? "monto" : "pct",
  );
  const [descuentoPct, setDescuentoPct] = React.useState<number>(
    initialDescuentoPct,
  );
  const [descuentoMonto, setDescuentoMonto] = React.useState<number>(
    initialDescuentoMonto,
  );

  // Submit state
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Búsqueda de productos (debounced)
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
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setBuscando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ──── Carrito helpers ────
  const agregar = (p: ProductoResult) => {
    setItems((prev) => {
      const existe = prev.find((it) => it.productoId === p.id);
      const stockEfectivo = p.stock + (refundCantidades[p.id] ?? 0);
      if (existe) {
        if (existe.cantidad + 1 > stockEfectivo) return prev;
        return prev.map((it) =>
          it.productoId === p.id ? { ...it, cantidad: it.cantidad + 1 } : it,
        );
      }
      if (stockEfectivo < 1) return prev;
      return [
        ...prev,
        {
          productoId: p.id,
          nombre: p.nombre,
          precioUnitario: p.precio,
          cantidad: 1,
          stockMax: stockEfectivo,
        },
      ];
    });
    setQuery("");
    setResults([]);
  };

  const cambiarCantidad = (productoId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.productoId !== productoId) return it;
          const nueva = Math.min(
            Math.max(1, it.cantidad + delta),
            it.stockMax,
          );
          return { ...it, cantidad: nueva };
        })
        .filter((it) => it.cantidad > 0),
    );
  };

  const setCantidad = (productoId: number, raw: number) => {
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

  // ──── Cliente ────
  const buscarCliente = async () => {
    setRutError(null);
    const v = rutInput.trim();
    if (!v) {
      setCliente(null);
      return;
    }
    if (!validarRUT(v)) {
      setRutError("RUT inválido");
      return;
    }
    setBuscandoCliente(true);
    try {
      const c = await buscarClientePorRut(v);
      if (c) setCliente(c);
      else {
        setCliente(null);
        setRutError("RUT válido, pero no hay cliente registrado con ese RUT");
      }
    } finally {
      setBuscandoCliente(false);
    }
  };

  const limpiarCliente = () => {
    setCliente(null);
    setRutInput("");
    setRutError(null);
  };

  // ──── Totales (derivados) ────
  const subtotal = React.useMemo(
    () => items.reduce((a, it) => a + it.precioUnitario * it.cantidad, 0),
    [items],
  );

  // ──── Submit ────
  const onSubmit = async () => {
    setSubmitError(null);
    if (items.length === 0) {
      setSubmitError("Agrega al menos un producto");
      return;
    }
    setSubmitting(true);
    try {
      const payload: VentaInput = {
        clienteId: cliente?.id ?? null,
        metodoPago,
        items: items.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
        })),
        descuentoPct,
        descuentoMonto,
      };

      const res =
        mode === "editar" && ventaId
          ? await editarVenta(ventaId, payload)
          : await crearVenta(payload);

      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }

      router.push(`/ventas/${res.data!.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const puedeGuardar = items.length > 0 && !submitting;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ─── Izquierda: selector productos ─── */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Agregar productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o código de barras..."
                className="pl-8"
                autoFocus
              />
              {buscando ? (
                <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            {results.length > 0 ? (
              <ul className="divide-y rounded-md border bg-background">
                {results.map((p) => {
                  const stockEfectivo = p.stock + (refundCantidades[p.id] ?? 0);
                  const agotado = stockEfectivo <= 0;
                  const yaEnCarrito = items.find(
                    (it) => it.productoId === p.id,
                  );
                  const disabled =
                    agotado ||
                    (yaEnCarrito?.cantidad ?? 0) >= stockEfectivo;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <Badge variant="outline" className="mr-1 align-middle">
                            {p.categoria.nombre}
                          </Badge>
                          <span className="font-mono">{p.codigoBarras}</span>
                          <span className="mx-2">·</span>
                          <span className="font-medium text-foreground">
                            {formatCLP(p.precio)}
                          </span>
                          <span className="mx-2">·</span>
                          <span
                            className={
                              stockEfectivo < 10
                                ? "text-amber-600"
                                : "text-muted-foreground"
                            }
                          >
                            Stock: {stockEfectivo}
                          </span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => agregar(p)}
                        disabled={disabled}
                      >
                        <Plus className="size-4" />
                        Agregar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : debouncedQuery.trim().length >= 2 && !buscando ? (
              <p className="text-center text-sm text-muted-foreground">
                Sin resultados para “{debouncedQuery.trim()}”
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carrito ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                El carrito está vacío. Busca productos arriba y agrégalos.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((it) => (
                  <li
                    key={it.productoId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCLP(it.precioUnitario)} c/u · stock máx{" "}
                        {it.stockMax}
                      </p>
                    </div>
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
                          setCantidad(it.productoId, Number(e.target.value))
                        }
                        className="w-16 text-center"
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
                    <div className="w-28 text-right text-sm font-medium tabular-nums">
                      {formatCLP(it.precioUnitario * it.cantidad)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => quitar(it.productoId)}
                      aria-label="Quitar"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Derecha: resumen + cliente + pago ─── */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cliente (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <UserRound className="size-4" />
                      {cliente.nombre}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {cliente.rut}
                    </p>
                    {cliente.email ? (
                      <p className="text-xs text-muted-foreground">
                        {cliente.email}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={limpiarCliente}
                    aria-label="Quitar cliente"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rut">RUT del cliente</Label>
                <div className="flex gap-2">
                  <Input
                    id="rut"
                    value={rutInput}
                    onChange={(e) => setRutInput(e.target.value)}
                    placeholder="12.345.678-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void buscarCliente();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={buscarCliente}
                    disabled={buscandoCliente}
                  >
                    {buscandoCliente ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </div>
                {rutError ? (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <UserRoundX className="size-3.5" />
                    {rutError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Dejar vacío para venta sin cliente.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Método de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={metodoPago}
              onValueChange={(v) => setMetodoPago(v as MetodoPago)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descuento</CardTitle>
          </CardHeader>
          <CardContent>
            <DescuentoInput
              modo={descuentoModo}
              onChangeModo={setDescuentoModo}
              descuentoPct={descuentoPct}
              onChangeDescuentoPct={setDescuentoPct}
              descuentoMonto={descuentoMonto}
              onChangeDescuentoMonto={setDescuentoMonto}
              subtotalBruto={subtotal}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResumenVenta
              inline
              subtotalBruto={subtotal}
              descuentoPct={descuentoPct}
              descuentoMonto={descuentoMonto}
            />

            {submitError ? (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitError}
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="mt-3 w-full"
              onClick={onSubmit}
              disabled={!puedeGuardar}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {mode === "editar" ? "Guardar cambios" : "Confirmar venta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
