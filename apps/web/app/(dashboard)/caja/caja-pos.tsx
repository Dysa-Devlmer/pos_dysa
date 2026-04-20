"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  Keyboard,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UserRoundPlus,
  Wallet,
  X,
} from "lucide-react";
import type { MetodoPago } from "@repo/db";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { RutInput } from "@/components/ui/rut-input";
import {
  DescuentoInput,
  type DescuentoModo,
} from "@/components/descuento-input";
import { EmptyState } from "@/components/empty-state";
import { ResumenVenta } from "@/components/resumen-venta";
import { cn, calcularDesglose, formatCLP, validarRUT } from "@/lib/utils";
import {
  buscarClientePorRut,
  crearVenta,
} from "@/app/(dashboard)/ventas/actions";

import { BoletaModal, type BoletaData } from "./boleta-modal";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface ProductoCaja {
  id: number;
  nombre: string;
  codigoBarras: string;
  precio: number;
  stock: number;
  alertaStock: number;
  categoriaId: number;
  categoriaNombre: string;
}

export interface CategoriaCaja {
  id: number;
  nombre: string;
}

interface CajaItem {
  productoId: number;
  nombre: string;
  codigoBarras: string;
  precioUnitario: number;
  cantidad: number;
  stockMax: number;
}

interface ClienteLite {
  id: number;
  rut: string;
  nombre: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 150): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

/** Gradientes por categoría — elige uno determinista según el id. */
const GRADIENTES = [
  "from-indigo-500/20 via-indigo-400/10 to-transparent",
  "from-emerald-500/20 via-emerald-400/10 to-transparent",
  "from-amber-500/20 via-amber-400/10 to-transparent",
  "from-rose-500/20 via-rose-400/10 to-transparent",
  "from-cyan-500/20 via-cyan-400/10 to-transparent",
  "from-violet-500/20 via-violet-400/10 to-transparent",
  "from-teal-500/20 via-teal-400/10 to-transparent",
  "from-orange-500/20 via-orange-400/10 to-transparent",
];

function gradientePorId(id: number): string {
  return GRADIENTES[id % GRADIENTES.length]!;
}

function tonoStock(
  stock: number,
  alerta: number,
): { label: string; cls: string } {
  if (stock <= 0) {
    return {
      label: "Sin stock",
      cls: "bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400",
    };
  }
  if (stock <= alerta) {
    return {
      label: `Últimas ${stock}`,
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
    };
  }
  return {
    label: "En stock",
    cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Categoría pills (con framer layoutId)
// ──────────────────────────────────────────────────────────────────────────

function CategoryPills({
  categorias,
  value,
  onChange,
}: {
  categorias: CategoriaCaja[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const todas: { id: number | null; nombre: string }[] = [
    { id: null, nombre: "Todos" },
    ...categorias,
  ];
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {todas.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id ?? "all"}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "relative flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="caja-category-pill"
                aria-hidden
                className="absolute inset-0 -z-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10">{c.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Product card
// ──────────────────────────────────────────────────────────────────────────

function ProductCard({
  producto,
  enCarritoQty,
  onClick,
}: {
  producto: ProductoCaja;
  enCarritoQty: number;
  onClick: () => void;
}) {
  const disponible = producto.stock - enCarritoQty;
  const disabled = disponible <= 0;
  const stock = tonoStock(producto.stock, producto.alertaStock);
  const gradient = gradientePorId(producto.categoriaId);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2, scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-shadow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:shadow-md hover:border-primary/30",
      )}
    >
      {/* Placeholder con gradient */}
      <div
        aria-hidden
        className={cn(
          "relative flex h-20 items-center justify-center bg-gradient-to-br",
          gradient,
        )}
      >
        <Package className="size-8 text-muted-foreground/40" />
        <Badge
          variant="outline"
          className={cn(
            "absolute right-2 top-2 h-5 text-[10px]",
            stock.cls,
          )}
        >
          {stock.label}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-tight">
          {producto.nombre}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {producto.codigoBarras}
        </p>
        <div className="mt-auto flex items-baseline justify-between pt-1.5">
          <span className="tabular-nums text-base font-bold">
            {formatCLP(producto.precio)}
          </span>
          {enCarritoQty > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              ×{enCarritoQty}
            </span>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Método de pago pills
// ──────────────────────────────────────────────────────────────────────────

const METODOS: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: "EFECTIVO", label: "Efectivo", icon: <Banknote className="size-4" /> },
  { value: "DEBITO", label: "Débito", icon: <CreditCard className="size-4" /> },
  { value: "CREDITO", label: "Crédito", icon: <CreditCard className="size-4" /> },
];

function MetodoPagoPills({
  value,
  onChange,
  disabled,
}: {
  value: MetodoPago;
  onChange: (v: MetodoPago) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-1">
      {METODOS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "opacity-60 cursor-not-allowed",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="caja-metodo-pill"
                aria-hidden
                className="absolute inset-0 -z-0 rounded-md bg-background shadow-sm ring-1 ring-border"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {m.icon}
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────

export interface CajaPosProps {
  productos: ProductoCaja[];
  categorias: CategoriaCaja[];
}

export function CajaPos({ productos, categorias }: CajaPosProps) {
  // ─── Carrito ───
  const [items, setItems] = React.useState<CajaItem[]>([]);

  // ─── Buscador / filtro ───
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 150);
  const [categoriaId, setCategoriaId] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // ─── Descuento ───
  const [descuentoModo, setDescuentoModo] =
    React.useState<DescuentoModo>("pct");
  const [descuentoPct, setDescuentoPct] = React.useState<number>(0);
  const [descuentoMonto, setDescuentoMonto] = React.useState<number>(0);

  // ─── Pago ───
  const [metodoPago, setMetodoPago] = React.useState<MetodoPago>("EFECTIVO");
  const [montoRecibido, setMontoRecibido] = React.useState<number>(0);

  // ─── Cliente (opcional, collapsible) ───
  const [clienteOpen, setClienteOpen] = React.useState(false);
  const [cliente, setCliente] = React.useState<ClienteLite | null>(null);
  const [rutInput, setRutInput] = React.useState("");
  const [buscandoCliente, setBuscandoCliente] = React.useState(false);
  const [rutError, setRutError] = React.useState<string | null>(null);

  // ─── UI state ───
  const [procesando, setProcesando] = React.useState(false);
  const [boleta, setBoleta] = React.useState<BoletaData | null>(null);
  const [mensaje, setMensaje] = React.useState<{
    tipo: "error" | "info";
    texto: string;
  } | null>(null);
  const [confirmLimpiar, setConfirmLimpiar] = React.useState(false);

  // Mobile tabs: "productos" | "carrito"
  const [mobileTab, setMobileTab] = React.useState<"productos" | "carrito">(
    "productos",
  );

  // ─── Mensaje efímero ───
  React.useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 2800);
    return () => clearTimeout(t);
  }, [mensaje]);

  // ─── Filtrado client-side ───
  const productosFiltrados = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return productos.filter((p) => {
      if (categoriaId !== null && p.categoriaId !== categoriaId) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.codigoBarras.toLowerCase().includes(q)
      );
    });
  }, [productos, debouncedQuery, categoriaId]);

  // ─── Totales ───
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
  const hayItems = items.length > 0;

  // ─── Carrito helpers ───
  const agregar = React.useCallback((p: ProductoCaja) => {
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
        setMensaje({ tipo: "error", texto: `"${p.nombre}" sin stock` });
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
  }, []);

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

  const quitar = (productoId: number) => {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId));
  };

  const limpiarCarrito = () => {
    setItems([]);
    setDescuentoPct(0);
    setDescuentoMonto(0);
    setMontoRecibido(0);
    setCliente(null);
    setClienteOpen(false);
    setRutInput("");
    setRutError(null);
    setConfirmLimpiar(false);
    inputRef.current?.focus();
  };

  const resetTodo = () => {
    setItems([]);
    setQuery("");
    setDescuentoPct(0);
    setDescuentoMonto(0);
    setMontoRecibido(0);
    setMetodoPago("EFECTIVO");
    setCliente(null);
    setClienteOpen(false);
    setRutInput("");
    setRutError(null);
    inputRef.current?.focus();
  };

  // ─── Auto-agregar al buscar código exacto ───
  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 3) return;
    const match = productos.find((p) => p.codigoBarras === q);
    if (match) {
      agregar(match);
      setQuery("");
    }
  }, [debouncedQuery, productos, agregar]);

  // ─── Buscar cliente por RUT ───
  const handleBuscarCliente = async () => {
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
      if (c) {
        setCliente({ id: c.id, rut: c.rut, nombre: c.nombre });
        setRutError(null);
      } else {
        setCliente(null);
        setRutError("RUT válido, pero no hay cliente con ese RUT");
      }
    } finally {
      setBuscandoCliente(false);
    }
  };

  // ─── Cobrar ───
  const puedeCobrar =
    hayItems &&
    !procesando &&
    (metodoPago !== "EFECTIVO" || montoRecibido >= total);

  const cobrar = async () => {
    if (!puedeCobrar) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const res = await crearVenta({
        metodoPago,
        clienteId: cliente?.id ?? null,
        items: items.map((it) => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
        })),
        descuentoPct,
        descuentoMonto,
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: res.error });
        return;
      }

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
        metodoPago,
        montoRecibido: metodoPago === "EFECTIVO" ? montoRecibido : null,
        vuelto:
          metodoPago === "EFECTIVO"
            ? Math.max(0, montoRecibido - total)
            : null,
        cliente: cliente
          ? { nombre: cliente.nombre, rut: cliente.rut }
          : null,
      };
      setBoleta(boletaData);
      resetTodo();
    } finally {
      setProcesando(false);
    }
  };

  // ─── Keyboard shortcuts ───
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Si foco está en un input distinto al buscador, ignorar "/" para no sobrescribir tipeo
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void cobrar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeCobrar]);

  const vuelto =
    metodoPago === "EFECTIVO" && montoRecibido >= total && hayItems
      ? montoRecibido - total
      : null;
  const faltante =
    metodoPago === "EFECTIVO" && montoRecibido < total && hayItems
      ? total - montoRecibido
      : null;

  // ─── Render ───
  return (
    <div className="print:hidden">
      {/* Mobile tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1 md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("productos")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mobileTab === "productos"
              ? "bg-background shadow-sm"
              : "text-muted-foreground",
          )}
        >
          Productos
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("carrito")}
          className={cn(
            "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            mobileTab === "carrito"
              ? "bg-background shadow-sm"
              : "text-muted-foreground",
          )}
        >
          Carrito
          {cantidadItems > 0 ? (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {cantidadItems}
            </span>
          ) : null}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_minmax(360px,40%)]">
        {/* ─── Panel izquierdo: buscador + grid ─── */}
        <section
          className={cn(
            "space-y-4",
            mobileTab === "productos" ? "block" : "hidden md:block",
          )}
        >
          {/* Buscador */}
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o escanear código de barras..."
                className="h-12 pl-11 pr-16 text-base"
                autoFocus
              />
              <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {debouncedQuery ? (
                  <Badge
                    variant="outline"
                    className="h-6 bg-muted/50 tabular-nums text-[11px]"
                  >
                    {productosFiltrados.length}
                  </Badge>
                ) : (
                  <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Category pills */}
            {categorias.length > 0 ? (
              <CategoryPills
                categorias={categorias}
                value={categoriaId}
                onChange={setCategoriaId}
              />
            ) : null}
          </div>

          {/* Grid productos */}
          {productosFiltrados.length === 0 ? (
            <EmptyState
              illustration="search"
              title="No se encontró ningún producto"
              description={
                debouncedQuery
                  ? `Sin resultados para "${debouncedQuery}". Prueba con otro término.`
                  : "No hay productos en esta categoría."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {productosFiltrados.map((p) => {
                const enCarrito = items.find((it) => it.productoId === p.id);
                return (
                  <ProductCard
                    key={p.id}
                    producto={p}
                    enCarritoQty={enCarrito?.cantidad ?? 0}
                    onClick={() => agregar(p)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Panel derecho: carrito ─── */}
        <aside
          className={cn(
            "flex flex-col gap-3 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-6rem)]",
            mobileTab === "carrito" ? "block" : "hidden md:flex",
          )}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            {/* Header carrito */}
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4 text-primary" />
                <h2 className="font-semibold">Carrito</h2>
                <motion.span
                  key={cantidadItems}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold text-primary"
                >
                  {cantidadItems}
                </motion.span>
              </div>
              {hayItems ? (
                confirmLimpiar ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setConfirmLimpiar(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={limpiarCarrito}
                    >
                      Confirmar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setConfirmLimpiar(true)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                    Limpiar
                  </Button>
                )
              ) : null}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {!hayItems ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
                    <ShoppingCart className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Carrito vacío
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Busca productos o escanea un código
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  <AnimatePresence initial={false}>
                    {items.map((it) => (
                      <motion.li
                        key={it.productoId}
                        layout
                        initial={{ opacity: 0, y: -12, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 40, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="group relative grid grid-cols-[1fr_auto] gap-1 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {it.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCLP(it.precioUnitario)} c/u
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => quitar(it.productoId)}
                          aria-label="Quitar"
                          className="size-6 shrink-0 rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                        >
                          <X className="mx-auto size-3.5" />
                        </button>
                        <div className="col-span-2 flex items-center justify-between gap-2 pt-1">
                          <div className="inline-flex items-center overflow-hidden rounded-md border bg-background">
                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidad(it.productoId, -1)
                              }
                              disabled={it.cantidad <= 1}
                              aria-label="Restar"
                              className="flex size-7 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                              {it.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                cambiarCantidad(it.productoId, 1)
                              }
                              disabled={it.cantidad >= it.stockMax}
                              aria-label="Sumar"
                              className="flex size-7 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <span className="tabular-nums text-sm font-semibold">
                            {formatCLP(it.precioUnitario * it.cantidad)}
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Descuento */}
            {hayItems ? (
              <div className="border-t bg-muted/10 px-4 py-3">
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
            ) : null}

            {/* Resumen */}
            <div className="border-t bg-muted/20 px-4 py-3">
              <ResumenVenta
                inline
                subtotalBruto={subtotal}
                descuentoPct={descuentoPct}
                descuentoMonto={descuentoMonto}
              />
            </div>

            {/* Método de pago */}
            <div className="space-y-3 border-t bg-card p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Método de pago
                </label>
                <MetodoPagoPills
                  value={metodoPago}
                  onChange={setMetodoPago}
                  disabled={procesando}
                />
              </div>

              {/* Monto recibido (solo efectivo) */}
              {metodoPago === "EFECTIVO" && hayItems ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Monto recibido
                  </label>
                  <MoneyInput
                    value={montoRecibido}
                    onValueChange={setMontoRecibido}
                    placeholder="0"
                    className="h-10 text-base"
                  />
                  {vuelto !== null && vuelto > 0 ? (
                    <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        Vuelto
                      </span>
                      <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatCLP(vuelto)}
                      </span>
                    </div>
                  ) : faltante !== null && faltante > 0 ? (
                    <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-1.5 text-xs">
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        Falta
                      </span>
                      <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                        {formatCLP(faltante)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Cliente (collapsible) */}
              {cliente ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" />
                    <div>
                      <p className="truncate font-medium leading-tight">
                        {cliente.nombre}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {cliente.rut}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCliente(null);
                      setRutInput("");
                      setClienteOpen(false);
                    }}
                    aria-label="Quitar cliente"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : clienteOpen ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    RUT del cliente
                  </label>
                  <div className="flex gap-2">
                    <RutInput
                      value={rutInput}
                      onValueChange={setRutInput}
                      showValidation={false}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleBuscarCliente}
                      disabled={buscandoCliente}
                    >
                      {buscandoCliente ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClienteOpen(false);
                        setRutInput("");
                        setRutError(null);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  {rutError ? (
                    <p className="text-xs text-destructive">{rutError}</p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setClienteOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <UserRoundPlus className="size-3.5" />
                  Agregar cliente (opcional)
                </button>
              )}

              {/* Mensaje error */}
              {mensaje ? (
                <div
                  role="alert"
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs",
                    mensaje.tipo === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-foreground",
                  )}
                >
                  {mensaje.texto}
                </div>
              ) : null}

              {/* Botón cobrar */}
              <motion.button
                type="button"
                onClick={cobrar}
                disabled={!puedeCobrar}
                whileHover={puedeCobrar ? { scale: 1.01 } : undefined}
                whileTap={puedeCobrar ? { scale: 0.98 } : undefined}
                transition={{ duration: 0.12 }}
                className={cn(
                  "relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-lg text-base font-semibold shadow-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  puedeCobrar
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                {procesando ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Wallet className="size-5" />
                    Cobrar
                    <span className="tabular-nums opacity-95">
                      {formatCLP(total)}
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Shortcut hint */}
          <div className="hidden items-center justify-center gap-3 rounded-md border border-dashed bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground md:flex">
            <Keyboard className="size-3.5" />
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                /
              </kbd>
              buscar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                Esc
              </kbd>
              limpiar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                ⌘/Ctrl
              </kbd>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                ⏎
              </kbd>
              cobrar
            </span>
          </div>
        </aside>
      </div>

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
