"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarRange, X, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type TipoMovOpt = "INGRESO" | "EGRESO" | "RETIRO" | "AJUSTE";

export interface CajaOpt {
  id: number;
  nombre: string;
}
export interface UsuarioOpt {
  id: number;
  nombre: string;
}

export interface FiltrosMovimientosProps {
  /** Estado actual desde URL (server-rendered). */
  desde: string | null;
  hasta: string | null;
  tipos: TipoMovOpt[];
  cajaId: number | null;
  usuarioId: number | null;
  aperturaId: number | null;
  q: string | null;
  /** Solo se renderizan los selectores admin si vienen opciones. */
  cajas?: CajaOpt[];
  usuarios?: UsuarioOpt[];
  /** Activo si rol === ADMIN — gate visual de columnas admin. */
  isAdmin: boolean;
}

const TIPO_LABELS: Record<TipoMovOpt, string> = {
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
  RETIRO: "Retiro",
  AJUSTE: "Ajuste",
};

const TIPO_COLORS: Record<TipoMovOpt, string> = {
  INGRESO:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  EGRESO: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  RETIRO:
    "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  AJUSTE: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

export function FiltrosMovimientos({
  desde,
  hasta,
  tipos,
  cajaId,
  usuarioId,
  aperturaId,
  q,
  cajas,
  usuarios,
  isAdmin,
}: FiltrosMovimientosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [desdeV, setDesdeV] = React.useState(desde ?? "");
  const [hastaV, setHastaV] = React.useState(hasta ?? "");
  const [tiposV, setTiposV] = React.useState<TipoMovOpt[]>(tipos);
  const [cajaV, setCajaV] = React.useState<string>(
    cajaId === null ? "" : String(cajaId),
  );
  const [usuarioV, setUsuarioV] = React.useState<string>(
    usuarioId === null ? "" : String(usuarioId),
  );
  const [aperturaV, setAperturaV] = React.useState<string>(
    aperturaId === null ? "" : String(aperturaId),
  );
  const [qV, setQV] = React.useState(q ?? "");

  // Sincroniza state local cuando la URL cambia (back/forward).
  React.useEffect(() => {
    setDesdeV(desde ?? "");
    setHastaV(hasta ?? "");
    setTiposV(tipos);
    setCajaV(cajaId === null ? "" : String(cajaId));
    setUsuarioV(usuarioId === null ? "" : String(usuarioId));
    setAperturaV(aperturaId === null ? "" : String(aperturaId));
    setQV(q ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, tipos.join(","), cajaId, usuarioId, aperturaId, q]);

  const aplicar = () => {
    const params = new URLSearchParams(sp.toString());
    const set = (k: string, v: string | null | undefined) => {
      if (v && v.length > 0) params.set(k, v);
      else params.delete(k);
    };
    set("desde", desdeV);
    set("hasta", hastaV);
    set("tipo", tiposV.length > 0 ? tiposV.join(",") : "");
    set("cajaId", cajaV);
    set("usuarioId", usuarioV);
    set("aperturaId", aperturaV);
    set("q", qV.trim());
    router.push(`${pathname}?${params.toString()}`);
  };

  const limpiar = () => {
    setDesdeV("");
    setHastaV("");
    setTiposV([]);
    setCajaV("");
    setUsuarioV("");
    setAperturaV("");
    setQV("");
    router.push(pathname);
  };

  const toggleTipo = (t: TipoMovOpt) => {
    setTiposV((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const hayFiltro =
    Boolean(desde || hasta || aperturaId || cajaId || usuarioId || q) ||
    tipos.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        aplicar();
      }}
      className="space-y-3 rounded-md border bg-muted/20 p-3"
    >
      <div className="flex items-center gap-1 text-sm font-medium">
        <Filter className="size-4" />
        Filtros
      </div>

      {/* Tipos — chips multi-select */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de movimiento</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TIPO_LABELS) as TipoMovOpt[]).map((t) => {
            const active = tiposV.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTipo(t)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? TIPO_COLORS[t]
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {TIPO_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fechas + apertura + buscar */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="mov-desde" className="text-xs">
            <CalendarRange className="mr-1 inline size-3" />
            Desde
          </Label>
          <Input
            key={`desde-${desde ?? "empty"}`}
            id="mov-desde"
            type="date"
            value={desdeV}
            onChange={(e) => setDesdeV(e.target.value)}
            className="[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-hasta" className="text-xs">
            <CalendarRange className="mr-1 inline size-3" />
            Hasta
          </Label>
          <Input
            key={`hasta-${hasta ?? "empty"}`}
            id="mov-hasta"
            type="date"
            value={hastaV}
            onChange={(e) => setHastaV(e.target.value)}
            className="[color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-apertura" className="text-xs">
            Apertura #
          </Label>
          <Input
            id="mov-apertura"
            type="number"
            min={1}
            placeholder="ej: 12"
            value={aperturaV}
            onChange={(e) => setAperturaV(e.target.value)}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-q" className="text-xs">
            Motivo contiene
          </Label>
          <Input
            id="mov-q"
            type="text"
            placeholder="ej: depósito banco"
            value={qV}
            onChange={(e) => setQV(e.target.value)}
            maxLength={120}
          />
        </div>
      </div>

      {/* Filtros admin: caja + usuario */}
      {isAdmin && (cajas?.length || usuarios?.length) ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cajas?.length ? (
            <div className="space-y-1">
              <Label htmlFor="mov-caja" className="text-xs">
                Caja
              </Label>
              <select
                id="mov-caja"
                value={cajaV}
                onChange={(e) => setCajaV(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Todas las cajas</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {usuarios?.length ? (
            <div className="space-y-1">
              <Label htmlFor="mov-usuario" className="text-xs">
                Cajero / Usuario
              </Label>
              <select
                id="mov-usuario"
                value={usuarioV}
                onChange={(e) => setUsuarioV(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" size="sm">
          Aplicar filtros
        </Button>
        {hayFiltro ? (
          <Button type="button" variant="outline" size="sm" onClick={limpiar}>
            <X className="size-3" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
