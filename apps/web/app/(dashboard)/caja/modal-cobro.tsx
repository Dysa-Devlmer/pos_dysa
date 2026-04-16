"use client";

import * as React from "react";
import { Loader2, Search, UserRound, UserRoundX, X } from "lucide-react";
import { MetodoPago } from "@repo/db";

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
import { buscarClientePorRut } from "@/app/(dashboard)/ventas/actions";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

interface ClienteLite {
  id: number;
  rut: string;
  nombre: string;
}

export interface ModalCobroProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  impuesto: number;
  total: number;
  cantidadItems: number;
  onConfirmar: (args: {
    metodoPago: MetodoPago;
    clienteId: number | null;
    montoRecibido: number | null;
    clienteResumen: { nombre: string; rut: string } | null;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "DEBITO", label: "Débito" },
  { value: "CREDITO", label: "Crédito" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

// ──────────────────────────────────────────────────────────────────────────
// Componente
// ──────────────────────────────────────────────────────────────────────────

export function ModalCobro({
  open,
  onOpenChange,
  subtotal,
  impuesto,
  total,
  cantidadItems,
  onConfirmar,
}: ModalCobroProps) {
  const [metodoPago, setMetodoPago] = React.useState<MetodoPago>("EFECTIVO");
  const [montoRecibidoInput, setMontoRecibidoInput] = React.useState("");
  const [rutInput, setRutInput] = React.useState("");
  const [cliente, setCliente] = React.useState<ClienteLite | null>(null);
  const [rutError, setRutError] = React.useState<string | null>(null);
  const [buscandoCliente, setBuscandoCliente] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Reset state al abrir
  React.useEffect(() => {
    if (open) {
      setMetodoPago("EFECTIVO");
      setMontoRecibidoInput("");
      setRutInput("");
      setCliente(null);
      setRutError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open]);

  const montoRecibido = Number(montoRecibidoInput);
  const montoRecibidoValido = Number.isFinite(montoRecibido) && montoRecibido > 0;
  const vuelto =
    metodoPago === "EFECTIVO" && montoRecibidoValido && montoRecibido >= total
      ? montoRecibido - total
      : null;
  const faltante =
    metodoPago === "EFECTIVO" && montoRecibidoValido && montoRecibido < total
      ? total - montoRecibido
      : null;

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
      if (c) setCliente({ id: c.id, rut: c.rut, nombre: c.nombre });
      else {
        setCliente(null);
        setRutError("RUT válido, pero no hay cliente registrado");
      }
    } finally {
      setBuscandoCliente(false);
    }
  };

  const quitarCliente = () => {
    setCliente(null);
    setRutInput("");
    setRutError(null);
  };

  const puedeConfirmar =
    cantidadItems > 0 &&
    !submitting &&
    (metodoPago !== "EFECTIVO" || (montoRecibidoValido && montoRecibido >= total));

  const confirmar = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await onConfirmar({
        metodoPago,
        clienteId: cliente?.id ?? null,
        montoRecibido: metodoPago === "EFECTIVO" ? montoRecibido : null,
        clienteResumen: cliente
          ? { nombre: cliente.nombre, rut: cliente.rut }
          : null,
      });
      if (!res.ok) {
        setSubmitError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar cobro</DialogTitle>
          <DialogDescription>
            Revisa el total y selecciona el método de pago.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen compacto */}
        <div className="rounded-md border bg-muted/20 p-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Items</span>
            <span className="tabular-nums">{cantidadItems}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (neto)</span>
            <span className="tabular-nums">{formatCLP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA 19%</span>
            <span className="tabular-nums">{formatCLP(impuesto)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-1.5">
            <span className="text-sm font-medium">Total a cobrar</span>
            <span className="tabular-nums text-xl font-bold">
              {formatCLP(total)}
            </span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-1.5">
          <Label htmlFor="metodoPago">Método de pago</Label>
          <Select
            value={metodoPago}
            onValueChange={(v) => setMetodoPago(v as MetodoPago)}
          >
            <SelectTrigger id="metodoPago">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Monto recibido (solo efectivo) */}
        {metodoPago === "EFECTIVO" ? (
          <div className="space-y-1.5">
            <Label htmlFor="montoRecibido">Monto recibido (CLP)</Label>
            <Input
              id="montoRecibido"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={montoRecibidoInput}
              onChange={(e) => setMontoRecibidoInput(e.target.value)}
              placeholder="0"
              className="text-lg font-semibold"
              autoFocus
            />
            {vuelto !== null ? (
              <div className="flex items-baseline justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                <span className="font-medium text-emerald-900 dark:text-emerald-200">
                  Vuelto
                </span>
                <span className="tabular-nums text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  {formatCLP(vuelto)}
                </span>
              </div>
            ) : faltante !== null ? (
              <div className="flex items-baseline justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                <span className="font-medium text-amber-900 dark:text-amber-200">
                  Falta
                </span>
                <span className="tabular-nums font-semibold text-amber-900 dark:text-amber-200">
                  {formatCLP(faltante)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Cliente (opcional) */}
        <div className="space-y-1.5">
          <Label>Cliente (opcional)</Label>
          {cliente ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5">
              <div className="flex items-center gap-2 text-sm">
                <UserRound className="size-4" />
                <div>
                  <p className="font-medium leading-tight">{cliente.nombre}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {cliente.rut}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={quitarCliente}
                aria-label="Quitar cliente"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={rutInput}
                  onChange={(e) => setRutInput(e.target.value)}
                  placeholder="RUT del cliente (12.345.678-9)"
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
                  Dejar vacío para venta sin cliente
                </p>
              )}
            </div>
          )}
        </div>

        {submitError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={confirmar}
            disabled={!puedeConfirmar}
            className="min-w-40"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Confirmar venta
            {vuelto !== null ? (
              <Badge variant="secondary" className="ml-2 tabular-nums">
                vuelto {formatCLP(vuelto)}
              </Badge>
            ) : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
